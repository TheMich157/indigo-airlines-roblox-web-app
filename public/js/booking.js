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

    // Initialize booking system
    async function initializeBooking() {
        await loadAvailableFlights();
        setupEventListeners();
    }

    // Load available flights
    async function loadAvailableFlights() {
        try {
            const response = await fetch('/api/flights/available');
            const flights = await response.json();
            displayAvailableFlights(flights);
        } catch (error) {
            console.error('Error loading flights:', error);
            utils.showNotification('Failed to load available flights', 'error');
        }
    }

    // Display available flights
    function displayAvailableFlights(flights) {
        const container = document.getElementById('availableFlights');
        container.innerHTML = '';

        flights.forEach(flight => {
            const flightCard = document.createElement('div');
            flightCard.className = 'bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200';
            flightCard.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">${flight.flightNumber}</h3>
                            <p class="text-sm text-gray-500">${flight.aircraft}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-semibold text-gray-900">₹${flight.price.economy}</p>
                            <p class="text-sm text-gray-500">Economy</p>
                        </div>
                    </div>
                    <div class="mt-4 flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <div>
                                <p class="text-sm font-medium text-gray-900">${flight.departure}</p>
                                <p class="text-sm text-gray-500">${utils.formatTime(flight.departureTime)}</p>
                            </div>
                            <div class="flex-shrink-0">
                                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">${flight.arrival}</p>
                                <p class="text-sm text-gray-500">${utils.formatTime(flight.arrivalTime)}</p>
                            </div>
                        </div>
                        <button onclick="selectFlight('${flight.id}')" class="bg-indigo-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-primary">
                            Select Flight
                        </button>
                    </div>
                    <div class="mt-4 flex items-center space-x-4">
                        <span class="text-sm text-gray-500">Available seats:</span>
                        <span class="text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            ${flight.seats.available.economy} Economy
                        </span>
                        <span class="text-sm font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            ${flight.seats.available.business} Business
                        </span>
                    </div>
                </div>
            `;
            container.appendChild(flightCard);
        });
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

    // Handle seat selection with advanced validation
    async function handleSeatSelection(seatElement) {
        try {
            if (!auth.isAuthenticated) {
                utils.showNotification('Please login to select a seat', 'error');
                return;
            }

            const seatClass = seatElement.getAttribute('data-class');
            const seatNumber = seatElement.getAttribute('data-seat');
            
            // Check if seat is already occupied
            if (seatElement.classList.contains('bg-gray-400')) {
                utils.showNotification('This seat is already occupied', 'error');
                return;
            }

            // Check for existing bookings
            const hasExistingBooking = await checkExistingBooking();
            if (hasExistingBooking) {
                utils.showNotification('You already have a booking for this flight', 'error');
                return;
            }

            // Check business class access
            if (seatClass === 'business') {
                const hasAccess = await checkBusinessClassAccess();
                if (!hasAccess) {
                    showBusinessClassModal();
                    return;
                }
            }

            // Check seat restrictions
            const seatRestrictions = await checkSeatRestrictions(seatNumber, seatClass);
            if (seatRestrictions.restricted) {
                utils.showNotification(seatRestrictions.reason, 'error');
                return;
            }

            // Hold seat temporarily
            const seatHeld = await holdSeat(seatNumber);
            if (!seatHeld) {
                utils.showNotification('This seat is no longer available', 'error');
                return;
            }

            // Update selected seat
            if (selectedSeat) {
                // Release previously held seat
                await releaseSeat(selectedSeat.getAttribute('data-seat'));
                selectedSeat.classList.remove('bg-indigo-primary', 'text-white');
                selectedSeat.classList.add(selectedSeat.getAttribute('data-class') === 'business' ? 'bg-yellow-500' : 'bg-gray-200');
            }

            seatElement.classList.remove(seatClass === 'business' ? 'bg-yellow-500' : 'bg-gray-200');
            seatElement.classList.add('bg-indigo-primary', 'text-white');
            selectedSeat = seatElement;

            // Start seat hold timer
            startSeatHoldTimer();
            
            // Update booking summary with additional details
            updateBookingSummary();

        } catch (error) {
            console.error('Error handling seat selection:', error);
            utils.showNotification('Failed to select seat. Please try again.', 'error');
        }
    }

    // Check for existing booking
    async function checkExistingBooking() {
        try {
            const flightId = document.getElementById('flightId').value;
            const response = await utils.fetchAPI(`${config.api.endpoints.booking.check}?flightId=${flightId}`);
            return response.hasBooking;
        } catch (error) {
            console.error('Error checking existing booking:', error);
            return true; // Fail safe
        }
    }

    // Check seat restrictions
    async function checkSeatRestrictions(seatNumber, seatClass) {
        try {
            const response = await utils.fetchAPI('/api/booking/check-restrictions', {
                method: 'POST',
                body: JSON.stringify({
                    seatNumber,
                    seatClass,
                    userId: auth.userInfo.id
                })
            });
            return response;
        } catch (error) {
            console.error('Error checking seat restrictions:', error);
            return { restricted: true, reason: 'Unable to verify seat restrictions' };
        }
    }

    // Hold seat temporarily
    async function holdSeat(seatNumber) {
        try {
            const response = await utils.fetchAPI('/api/booking/hold-seat', {
                method: 'POST',
                body: JSON.stringify({
                    flightId: document.getElementById('flightId').value,
                    seatNumber,
                    userId: auth.userInfo.id
                })
            });
            return response.success;
        } catch (error) {
            console.error('Error holding seat:', error);
            return false;
        }
    }

    // Release held seat
    async function releaseSeat(seatNumber) {
        try {
            await utils.fetchAPI('/api/booking/release-seat', {
                method: 'POST',
                body: JSON.stringify({
                    flightId: document.getElementById('flightId').value,
                    seatNumber,
                    userId: auth.userInfo.id
                })
            });
        } catch (error) {
            console.error('Error releasing seat:', error);
        }
    }

    let holdTimer;
    // Start seat hold timer
    function startSeatHoldTimer() {
        if (holdTimer) clearTimeout(holdTimer);
        
        const HOLD_DURATION = 300000; // 5 minutes
        const warningTime = 60000; // 1 minute warning

        // Show warning when 1 minute remains
        setTimeout(() => {
            if (selectedSeat) {
                utils.showNotification('Your seat hold expires in 1 minute', 'warning');
            }
        }, HOLD_DURATION - warningTime);

        // Release seat after hold duration
        holdTimer = setTimeout(async () => {
            if (selectedSeat) {
                await releaseSeat(selectedSeat.getAttribute('data-seat'));
                selectedSeat.classList.remove('bg-indigo-primary', 'text-white');
                selectedSeat.classList.add(
                    selectedSeat.getAttribute('data-class') === 'business' ? 
                    'bg-yellow-500' : 'bg-gray-200'
                );
                selectedSeat = null;
                bookingSummary.classList.add('hidden');
                utils.showNotification('Your seat hold has expired', 'error');
            }
        }, HOLD_DURATION);
    }

    // Show business class modal with additional info
    function showBusinessClassModal() {
        businessClassModal.classList.remove('hidden');
        
        // Update modal content with dynamic pricing and benefits
        const modalContent = document.querySelector('#businessClassModal .modal-content');
        modalContent.innerHTML = `
            <h3 class="text-lg font-medium mb-4">Business Class Benefits</h3>
            <ul class="list-disc pl-5 mb-4">
                <li>Priority boarding</li>
                <li>Extra legroom</li>
                <li>Premium meals</li>
                <li>Lounge access</li>
                <li>Additional baggage allowance</li>
            </ul>
            <p class="mb-4">Purchase the Business Class Gamepass to access these seats.</p>
            <div class="flex justify-end">
                <button onclick="window.location.href='${config.roblox.gamepassUrl}'"
                    class="bg-indigo-primary text-white px-4 py-2 rounded hover:bg-indigo-secondary">
                    Get Business Class Access
                </button>
            </div>
        `;
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

    // State management
    let selectedFlight = null;

    // Select flight
    window.selectFlight = async function(flightId) {
        try {
            const response = await fetch('/api/flights/available');
            const flights = await response.json();
            selectedFlight = flights.find(f => f.id === flightId);
            
            if (selectedFlight) {
                // Show flight details
                document.getElementById('availableFlights').parentElement.classList.add('hidden');
                document.getElementById('selectedFlightDetails').classList.remove('hidden');
                
                // Update flight details
                document.getElementById('flightNumberDetail').textContent = selectedFlight.flightNumber;
                document.getElementById('routeDetail').textContent = `${selectedFlight.departure} → ${selectedFlight.arrival}`;
                document.getElementById('aircraftDetail').textContent = selectedFlight.aircraft;
                document.getElementById('departureDetail').textContent = utils.formatDateTime(selectedFlight.departureTime);
                document.getElementById('arrivalDetail').textContent = utils.formatDateTime(selectedFlight.arrivalTime);
                document.getElementById('economySeats').textContent = `${selectedFlight.seats.available.economy} Economy`;
                document.getElementById('businessSeats').textContent = `${selectedFlight.seats.available.business} Business`;

                // Show seat map
                document.getElementById('seatMapContainer').classList.remove('hidden');
                document.getElementById('a320Map').classList.add('hidden');
                document.getElementById('a330Map').classList.add('hidden');
                document.getElementById(`${selectedFlight.aircraft.toLowerCase()}Map`).classList.remove('hidden');

                // Initialize seat map
                createSeatMap(selectedFlight.aircraft);
                initializeSeatMap(selectedFlight);
            }
        } catch (error) {
            console.error('Error selecting flight:', error);
            utils.showNotification('Failed to select flight', 'error');
        }
    };

    // Back to flights
    window.backToFlights = function() {
        document.getElementById('availableFlights').parentElement.classList.remove('hidden');
        document.getElementById('selectedFlightDetails').classList.add('hidden');
        document.getElementById('seatMapContainer').classList.add('hidden');
        document.getElementById('bookingSummary').classList.add('hidden');
        selectedFlight = null;
        selectedSeat = null;
    };

    // Set up event listeners
    function setupEventListeners() {

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

    // Initialize seat map for selected flight
    function initializeSeatMap(flight) {
        const map = document.getElementById(`${flight.aircraft.toLowerCase()}Map`);
        const seats = map.querySelectorAll('[data-seat]');

        seats.forEach(seat => {
            // Reset seat status
            seat.className = `w-8 h-8 m-1 rounded-t-lg relative ${
                seat.dataset.class === 'business' ? 'bg-yellow-500' : 'bg-gray-200'
            }`;

            // Mark occupied seats
            if (flight.seats.occupied.includes(seat.dataset.seat)) {
                seat.className = 'w-8 h-8 m-1 rounded-t-lg relative bg-gray-400';
                seat.disabled = true;
            }

            // Add click handler
            seat.onclick = () => handleSeatSelection(seat);
        });
    }

    // Update booking summary
    function updateBookingSummary() {
        if (!selectedFlight || !selectedSeat) return;

        document.getElementById('summaryFlight').textContent = `${selectedFlight.flightNumber} (${selectedFlight.departure} → ${selectedFlight.arrival})`;
        document.getElementById('summaryDate').textContent = utils.formatDateTime(selectedFlight.departureTime);
        document.getElementById('summarySeat').textContent = selectedSeat.dataset.seat;
        document.getElementById('summaryClass').textContent = selectedSeat.dataset.class === 'business' ? 'Business' : 'Economy';
        document.getElementById('summaryPrice').textContent = `₹${selectedSeat.dataset.class === 'business' ? selectedFlight.price.business : selectedFlight.price.economy}`;

        document.getElementById('bookingSummary').classList.remove('hidden');
    }

    // Initialize booking system
    initializeBooking();
});
