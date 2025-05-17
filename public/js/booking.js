// Booking functionality
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const aircraftSelect = document.getElementById('aircraft');
    const seatMapContainer = document.getElementById('seatMapContainer');
    const a320Map = document.getElementById('a320Map');
    const a330Map = document.getElementById('a330Map');
    const bookingSummary = document.getElementById('bookingSummary');
    const businessClassModal = document.getElementById('businessClassModal');
    
    let selectedSeat = null;

    // Initialize seat maps
    function initializeSeatMaps() {
        createSeatMap('A320');
        createSeatMap('A330');
        setupEventListeners();
    }

    // Create seat map
    function createSeatMap(aircraftType) {
        const aircraftConfig = config.aircraft[aircraftType];
        const map = document.getElementById(`${aircraftType.toLowerCase()}Map`);
        map.innerHTML = '';

        const seatMapContainer = document.createElement('div');
        seatMapContainer.className = 'relative max-w-3xl mx-auto';

        // Create aircraft outline
        const aircraftOutline = document.createElement('div');
        aircraftOutline.className = 'relative bg-gray-100 rounded-3xl p-8';

        // Create rows
        for (let row = 1; row <= aircraftConfig.seatMap.totalRows; row++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'flex justify-center items-center mb-2 relative';

            // Add row number
            const rowNumber = document.createElement('div');
            rowNumber.className = 'absolute -left-8 text-sm text-gray-500';
            rowNumber.textContent = row;
            rowElement.appendChild(rowNumber);

            // Create seats in the row
            const letters = aircraftConfig.seatMap.seatsPerRow === 6 ? 
                ['A', 'B', 'C', 'D', 'E', 'F'] : 
                ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            
            letters.forEach((letter, index) => {
                // Add aisle spacing
                if ((aircraftConfig.seatMap.seatsPerRow === 6 && index === 3) || 
                    (aircraftConfig.seatMap.seatsPerRow === 8 && index === 4)) {
                    const aisle = document.createElement('div');
                    aisle.className = 'w-8';
                    rowElement.appendChild(aisle);
                }

                const seat = document.createElement('button');
                const seatNumber = `${row}${letter}`;
                const isBusinessClass = aircraftConfig.seatMap.businessClassRows.includes(row);
                const isExitRow = aircraftConfig.seatMap.exitRows.includes(row);

                seat.className = `
                    w-8 h-8 m-1 rounded-t-lg relative
                    ${isBusinessClass ? 'bg-yellow-500' : 'bg-gray-200'} 
                    ${isExitRow ? 'mt-6' : ''} 
                    hover:opacity-75 focus:outline-none transition-colors duration-200
                `;
                seat.setAttribute('data-seat', seatNumber);
                seat.setAttribute('data-class', isBusinessClass ? 'business' : 'economy');

                // Add seat tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 transition-opacity duration-200';
                tooltip.textContent = seatNumber;
                seat.appendChild(tooltip);

                // Show/hide tooltip on hover
                seat.addEventListener('mouseenter', () => tooltip.classList.add('opacity-100'));
                seat.addEventListener('mouseleave', () => tooltip.classList.remove('opacity-100'));

                seat.addEventListener('click', () => handleSeatSelection(seat));
                rowElement.appendChild(seat);
            });

            // Add exit row markers
            if (aircraftConfig.seatMap.exitRows.includes(row)) {
                const exitMarker = document.createElement('div');
                exitMarker.className = 'absolute -left-16 text-xs text-red-500 font-medium';
                exitMarker.textContent = 'EXIT';
                rowElement.appendChild(exitMarker);

                const exitMarkerRight = document.createElement('div');
                exitMarkerRight.className = 'absolute -right-16 text-xs text-red-500 font-medium';
                exitMarkerRight.textContent = 'EXIT';
                rowElement.appendChild(exitMarkerRight);
            }

            aircraftOutline.appendChild(rowElement);
        }

        // Add aircraft nose and tail
        const nose = document.createElement('div');
        nose.className = 'absolute -top-8 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-gray-100 rounded-t-full';
        seatMapContainer.appendChild(nose);

        const tail = document.createElement('div');
        tail.className = 'absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-gray-100 rounded-b-lg';
        seatMapContainer.appendChild(tail);

        seatMapContainer.appendChild(aircraftOutline);
        map.appendChild(seatMapContainer);

        // Add legend
        const legend = document.createElement('div');
        legend.className = 'mt-8 flex justify-center space-x-6';
        legend.innerHTML = `
            <div class="flex items-center">
                <div class="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                <span class="text-sm text-gray-600">Business Class (Gamepass Required)</span>
            </div>
            <div class="flex items-center">
                <div class="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                <span class="text-sm text-gray-600">Economy Class</span>
            </div>
            <div class="flex items-center">
                <div class="w-4 h-4 bg-gray-400 rounded mr-2"></div>
                <span class="text-sm text-gray-600">Occupied</span>
            </div>
        `;
        map.appendChild(legend);
    }

    // Handle seat selection
    async function handleSeatSelection(seatElement) {
        if (!auth.isAuthenticated) {
            utils.showNotification('Please login to select a seat', 'error');
            return;
        }

        const seatClass = seatElement.getAttribute('data-class');
        
        // Check business class access
        if (seatClass === 'business') {
            const hasAccess = await checkBusinessClassAccess();
            if (!hasAccess) {
                businessClassModal.classList.remove('hidden');
                return;
            }
        }

        // Update selected seat
        if (selectedSeat) {
            selectedSeat.classList.remove('bg-indigo-primary', 'text-white');
            selectedSeat.classList.add(selectedSeat.getAttribute('data-class') === 'business' ? 'bg-yellow-500' : 'bg-gray-200');
        }

        seatElement.classList.remove(seatClass === 'business' ? 'bg-yellow-500' : 'bg-gray-200');
        seatElement.classList.add('bg-indigo-primary', 'text-white');
        selectedSeat = seatElement;

        updateBookingSummary();
    }

    // Check if user has business class access
    async function checkBusinessClassAccess() {
        try {
            const response = await utils.fetchAPI(config.api.endpoints.auth.checkGamepass);
            return response.hasAccess;
        } catch (error) {
            console.error('Error checking gamepass:', error);
            return false;
        }
    }

    // Update booking summary
    function updateBookingSummary() {
        if (!selectedSeat) return;

        const departure = document.getElementById('departure').value;
        const arrival = document.getElementById('arrival').value;
        const date = document.getElementById('date').value;
        const seatNumber = selectedSeat.getAttribute('data-seat');
        const seatClass = selectedSeat.getAttribute('data-class');

        document.getElementById('summaryFlight').textContent = `${departure} → ${arrival}`;
        document.getElementById('summaryDate').textContent = utils.formatDate(date);
        document.getElementById('summarySeat').textContent = seatNumber;
        document.getElementById('summaryClass').textContent = seatClass.charAt(0).toUpperCase() + seatClass.slice(1);

        bookingSummary.classList.remove('hidden');
    }

    // Set up event listeners
    function setupEventListeners() {
        // Handle aircraft selection change
        aircraftSelect.addEventListener('change', () => {
            const aircraft = aircraftSelect.value;
            seatMapContainer.classList.remove('hidden');
            a320Map.classList.add('hidden');
            a330Map.classList.add('hidden');

            if (aircraft === 'A320') {
                a320Map.classList.remove('hidden');
            } else if (aircraft === 'A330') {
                a330Map.classList.remove('hidden');
            }

            selectedSeat = null;
            bookingSummary.classList.add('hidden');
        });

        // Handle booking confirmation
        document.getElementById('confirmBooking').addEventListener('click', async () => {
            if (!auth.isAuthenticated) {
                utils.showNotification('Please login to confirm booking', 'error');
                return;
            }

            if (!selectedSeat) {
                utils.showNotification('Please select a seat', 'error');
                return;
            }

            try {
                const response = await utils.fetchAPI(config.api.endpoints.booking.create, {
                    method: 'POST',
                    body: JSON.stringify({
                        flightId: document.getElementById('flightId').value,
                        seatNumber: selectedSeat.getAttribute('data-seat'),
                        seatClass: selectedSeat.getAttribute('data-class')
                    })
                });

                utils.showNotification('Booking confirmed! Use /retrieve in game to get your ticket.', 'success');
                
                // Mark seat as occupied
                selectedSeat.classList.remove('bg-indigo-primary', 'text-white');
                selectedSeat.classList.add('bg-gray-400');
                selectedSeat = null;
                bookingSummary.classList.add('hidden');
            } catch (error) {
                console.error('Error confirming booking:', error);
                utils.showNotification('Failed to confirm booking. Please try again.', 'error');
            }
        });
    }

    // Initialize seat maps
    initializeSeatMaps();
});
