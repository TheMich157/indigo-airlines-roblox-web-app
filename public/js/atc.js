// ATC Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has ATC access
    if (!auth.isAuthenticated || !auth.hasRole('atc')) {
        window.location.href = '/';
        return;
    }

    // State management
    let selectedFlight = null;
    let voiceConnected = false;

    // DOM Elements
    const activeFlightsList = document.getElementById('activeFlightsList');
    const selectedFlightInfo = document.getElementById('selectedFlightInfo');
    const toggleVoiceBtn = document.getElementById('toggleVoice');

    // Initialize voice connection status
    toggleVoiceBtn.addEventListener('click', toggleVoiceConnection);

    // Load and display active flights
    function loadActiveFlights() {
        // TODO: Replace with actual API call
        const mockFlights = [
            {
                id: '1',
                flightNumber: '6E-123',
                aircraft: 'A320',
                departure: 'COK',
                arrival: 'BOM',
                status: 'Taxiing',
                route: 'COK → BOM'
            },
            {
                id: '2',
                flightNumber: '6E-456',
                aircraft: 'A330',
                departure: 'DEL',
                arrival: 'MAA',
                status: 'Approaching',
                route: 'DEL → MAA'
            }
        ];

        activeFlightsList.innerHTML = '';
        mockFlights.forEach(flight => {
            const flightElement = createFlightElement(flight);
            activeFlightsList.appendChild(flightElement);
        });
    }

    // Create flight element for the active flights list
    function createFlightElement(flight) {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-medium text-gray-900">${flight.flightNumber}</h3>
                    <p class="text-sm text-gray-500">${flight.route}</p>
                </div>
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    getStatusColor(flight.status)
                }">${flight.status}</span>
            </div>
        `;
        div.addEventListener('click', () => selectFlight(flight));
        return div;
    }

    // Get status color class based on flight status
    function getStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'taxiing':
                return 'bg-yellow-100 text-yellow-800';
            case 'approaching':
                return 'bg-blue-100 text-blue-800';
            case 'departed':
                return 'bg-green-100 text-green-800';
            case 'delayed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    // Select a flight and display its information
    function selectFlight(flight) {
        selectedFlight = flight;
        selectedFlightInfo.classList.remove('hidden');

        // Update flight information display
        document.getElementById('flightNumber').textContent = flight.flightNumber;
        document.getElementById('aircraft').textContent = flight.aircraft;
        document.getElementById('route').textContent = flight.route;
        document.getElementById('status').textContent = flight.status;
    }

    // Voice channel connection toggle
    function toggleVoiceConnection() {
        voiceConnected = !voiceConnected;
        toggleVoiceBtn.textContent = voiceConnected ? 'Disconnect Voice' : 'Connect Voice';
        toggleVoiceBtn.classList.toggle('bg-red-600');
        toggleVoiceBtn.classList.toggle('bg-indigo-primary');

        // TODO: Implement actual voice connection logic
        utils.showNotification(
            voiceConnected ? 'Connected to voice channel' : 'Disconnected from voice channel',
            voiceConnected ? 'success' : 'info'
        );
    }

    // Clearance functions
    window.issueATCClearance = async () => {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('ATC', 'ATC clearance issued');
    };

    window.issueTakeoffClearance = async () => {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('Takeoff', 'Takeoff clearance issued');
    };

    window.issueLandingClearance = async () => {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('Landing', 'Landing clearance issued');
    };

    window.issueTaxiClearance = async () => {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('Taxi', 'Taxi clearance issued');
    };

    window.issuePushbackClearance = async () => {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('Pushback', 'Pushback clearance issued');
    };

    window.issueSelectedClearance = async () => {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }

        const clearanceType = document.getElementById('otherClearances').value;
        if (!clearanceType) {
            utils.showNotification('Please select a clearance type', 'error');
            return;
        }

        await issueClearance(
            clearanceType.charAt(0).toUpperCase() + clearanceType.slice(1),
            `${clearanceType.charAt(0).toUpperCase() + clearanceType.slice(1)} clearance issued`
        );
    };

    // Issue flight delay
    window.issueDelay = async () => {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }

        const reason = document.getElementById('delayReason').value;
        const duration = document.getElementById('delayDuration').value;

        if (!reason || !duration) {
            utils.showNotification('Please provide both reason and duration for the delay', 'error');
            return;
        }

        try {
            // TODO: Replace with actual API call
            await simulateApiCall({
                type: 'delay',
                flightId: selectedFlight.id,
                reason: reason,
                duration: duration
            });

            utils.showNotification(`Flight delayed for ${duration} minutes due to ${reason}`, 'success');
            
            // Update flight status
            selectedFlight.status = 'Delayed';
            document.getElementById('status').textContent = 'Delayed';
            loadActiveFlights(); // Refresh the flight list
        } catch (error) {
            utils.showNotification('Failed to issue delay', 'error');
        }
    };

    // Generic clearance issuing function
    async function issueClearance(type, successMessage) {
        try {
            // TODO: Replace with actual API call
            await simulateApiCall({
                type: 'clearance',
                clearanceType: type,
                flightId: selectedFlight.id
            });

            utils.showNotification(successMessage, 'success');
            
            // Simulate message in Roblox chat
            console.log(`[ROBLOX] ${selectedFlight.flightNumber} ${type} clearance: ${successMessage}`);
        } catch (error) {
            utils.showNotification(`Failed to issue ${type} clearance`, 'error');
        }
    }

    // Simulate API call with delay
    function simulateApiCall(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate
                    console.log('API Call:', data);
                    resolve(data);
                } else {
                    reject(new Error('API call failed'));
                }
            }, 500);
        });
    }

    // Update weather information periodically
    function updateWeather() {
        // TODO: Replace with actual weather API call
        const mockWeather = {
            windDirection: `${Math.floor(Math.random() * 360)}° @ ${Math.floor(Math.random() * 30)}kts`,
            visibility: `${Math.floor(Math.random() * 10 + 5)}km`,
            cloudBase: `${Math.floor(Math.random() * 3000 + 1000)}ft`,
            temperature: `${Math.floor(Math.random() * 20 + 15)}°C`
        };

        document.getElementById('windDirection').textContent = mockWeather.windDirection;
        document.getElementById('visibility').textContent = mockWeather.visibility;
        document.getElementById('cloudBase').textContent = mockWeather.cloudBase;
        document.getElementById('temperature').textContent = mockWeather.temperature;
    }

    // Initialize dashboard
    loadActiveFlights();
    updateWeather();
    setInterval(updateWeather, 300000); // Update weather every 5 minutes
});
