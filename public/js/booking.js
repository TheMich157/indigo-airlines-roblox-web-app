// Booking functionality
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const aircraftSelect = document.getElementById('aircraft');
    const seatMapContainer = document.getElementById('seatMapContainer');
    const a320Map = document.getElementById('a320Map');
    const a330Map = document.getElementById('a330Map');
    const bookingSummary = document.getElementById('bookingSummary');
    const businessClassModal = document.getElementById('businessClassModal');
    
    // Seat configuration
    const seatConfig = {
        A320: {
            business: { rows: 2, seatsPerRow: 6 },
            economy: { rows: 30, seatsPerRow: 6 }
        },
        A330: {
            business: { rows: 3, seatsPerRow: 8 },
            economy: { rows: 41, seatsPerRow: 8 }
        }
    };

    let selectedSeat = null;

    // Initialize seat maps
    function initializeSeatMaps() {
        createSeatMap('A320');
        createSeatMap('A330');
    }

    // Create seat map for specific aircraft
    function createSeatMap(aircraftType) {
        const config = seatConfig[aircraftType];
        const map = document.getElementById(`${aircraftType.toLowerCase()}Map`);
        
        // Business Class
        const businessContainer = map.querySelector('.grid-cols-6, .grid-cols-8');
        createSeats(businessContainer, config.business, true);

        // Economy Class
        const economyContainer = map.querySelectorAll('.grid-cols-6, .grid-cols-8')[1];
        createSeats(economyContainer, config.economy, false);
    }

    // Create seats for a section
    function createSeats(container, config, isBusiness) {
        container.innerHTML = '';
        const letters = isBusiness ? 
            (config.seatsPerRow === 6 ? ['A', 'B', 'C', 'D', 'E', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) :
            (config.seatsPerRow === 6 ? ['A', 'B', 'C', 'D', 'E', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

        for (let row = 1; row <= config.rows; row++) {
            const rowNum = isBusiness ? row : row + (aircraftType === 'A320' ? 2 : 3);
            
            letters.forEach((letter, index) => {
                if (config.seatsPerRow === 8 && index === 4) {
                    // Add aisle spacing for A330
                    const aisle = document.createElement('div');
                    container.appendChild(aisle);
                }
                
                const seat = document.createElement('button');
                seat.className = `w-8 h-8 rounded ${isBusiness ? 'bg-yellow-500' : 'bg-gray-200'} hover:opacity-75 focus:outline-none transition-colors duration-200`;
                seat.setAttribute('data-seat', `${rowNum}${letter}`);
                seat.setAttribute('data-class', isBusiness ? 'business' : 'economy');
                seat.innerHTML = `${rowNum}${letter}`;
                
                seat.addEventListener('click', () => handleSeatSelection(seat));
                container.appendChild(seat);
                
                if (config.seatsPerRow === 6 && index === 2) {
                    // Add aisle spacing for A320
                    const aisle = document.createElement('div');
                    container.appendChild(aisle);
                }
            });
        }
    }

    // Handle seat selection
    async function handleSeatSelection(seatElement) {
        const seatClass = seatElement.getAttribute('data-class');
        const seatNumber = seatElement.getAttribute('data-seat');

        // Check if user is authenticated
        if (!auth.isAuthenticated) {
            utils.showNotification('Please login to select a seat', 'error');
            return;
        }

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
        // TODO: Implement actual gamepass check
        // For now, return false to simulate no access
        return false;
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
            // TODO: Implement actual booking API call
            await simulateBooking();
            utils.showNotification('Booking confirmed! Use /retrieve in game to get your ticket.', 'success');
            
            // Reset selection
            selectedSeat.classList.remove('bg-indigo-primary', 'text-white');
            selectedSeat.classList.add('bg-gray-400'); // Mark as occupied
            selectedSeat = null;
            bookingSummary.classList.add('hidden');
        } catch (error) {
            utils.showNotification('Failed to confirm booking. Please try again.', 'error');
        }
    });

    // Simulate booking process
    function simulateBooking() {
        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }

    // Initialize seat maps
    initializeSeatMaps();
});
