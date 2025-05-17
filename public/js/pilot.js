// Pilot Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has pilot access
    if (!auth.isAuthenticated || !auth.hasRole('pilot')) {
        window.location.href = '/';
        return;
    }

    // State management
    let voiceConnected = false;
    let pilotStats = null;
    let upcomingFlights = [];
    let flightLog = [];

    // DOM Elements
    const toggleVoiceBtn = document.getElementById('toggleVoice');
    const upcomingFlightsList = document.getElementById('upcomingFlightsList');
    const flightLogList = document.getElementById('flightLogList');
    const rankUpButton = document.getElementById('rankUpButton');

    // Initialize voice connection status
    toggleVoiceBtn.addEventListener('click', toggleVoiceConnection);

    // Load pilot data
    async function loadPilotData() {
        try {
            // TODO: Replace with actual API call
            const mockPilotData = {
                totalMiles: 15420,
                totalFlights: 42,
                currentRank: 'First Officer',
                hoursFlown: 156,
                rankProgress: 45
            };

            updatePilotStats(mockPilotData);
        } catch (error) {
            utils.showNotification('Failed to load pilot data', 'error');
        }
    }

    // Update pilot statistics display
    function updatePilotStats(stats) {
        pilotStats = stats;
        document.getElementById('totalMiles').textContent = stats.totalMiles.toLocaleString();
        document.getElementById('totalFlights').textContent = stats.totalFlights;
        document.getElementById('currentRank').textContent = stats.currentRank;
        document.getElementById('hoursFlown').textContent = stats.hoursFlown;
        
        // Update rank progress
        document.getElementById('rankProgress').textContent = `${stats.rankProgress}%`;
        document.getElementById('rankProgressBar').style.width = `${stats.rankProgress}%`;

        // Enable/disable rank up button based on progress
        rankUpButton.disabled = stats.rankProgress < 100;
        if (stats.rankProgress < 100) {
            rankUpButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            rankUpButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    // Load upcoming flights
    async function loadUpcomingFlights() {
        try {
            // TODO: Replace with actual API call
            const mockFlights = [
                {
                    id: '1',
                    flightNumber: '6E-123',
                    route: 'COK → BOM',
                    departure: '2024-02-20T10:00',
                    aircraft: 'A320',
                    role: 'Captain'
                },
                {
                    id: '2',
                    flightNumber: '6E-456',
                    route: 'BOM → DEL',
                    departure: '2024-02-21T14:30',
                    aircraft: 'A330',
                    role: 'First Officer'
                }
            ];

            upcomingFlights = mockFlights;
            displayUpcomingFlights();
        } catch (error) {
            utils.showNotification('Failed to load upcoming flights', 'error');
        }
    }

    // Display upcoming flights
    function displayUpcomingFlights() {
        upcomingFlightsList.innerHTML = '';
        upcomingFlights.forEach(flight => {
            const li = document.createElement('li');
            li.className = 'py-4';
            li.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">
                            ${flight.flightNumber} - ${flight.route}
                        </p>
                        <p class="text-sm text-gray-500">
                            ${utils.formatDate(flight.departure)} | ${flight.aircraft}
                        </p>
                    </div>
                    <div class="inline-flex items-center text-sm font-semibold text-indigo-primary">
                        ${flight.role}
                    </div>
                </div>
            `;
            upcomingFlightsList.appendChild(li);
        });
    }

    // Load flight log
    async function loadFlightLog() {
        try {
            // TODO: Replace with actual API call
            const mockLog = [
                {
                    id: '1',
                    flightNumber: '6E-789',
                    route: 'DEL → MAA',
                    date: '2024-02-18',
                    miles: 1250,
                    role: 'Captain',
                    status: 'Completed'
                },
                {
                    id: '2',
                    flightNumber: '6E-321',
                    route: 'MAA → COK',
                    date: '2024-02-17',
                    miles: 850,
                    role: 'First Officer',
                    status: 'Completed'
                }
            ];

            flightLog = mockLog;
            displayFlightLog();
        } catch (error) {
            utils.showNotification('Failed to load flight log', 'error');
        }
    }

    // Display flight log
    function displayFlightLog() {
        flightLogList.innerHTML = '';
        flightLog.forEach(flight => {
            const li = document.createElement('li');
            li.className = 'py-4';
            li.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">
                            ${flight.flightNumber} - ${flight.route}
                        </p>
                        <p class="text-sm text-gray-500">
                            ${utils.formatDate(flight.date)} | ${flight.miles} miles
                        </p>
                    </div>
                    <div class="inline-flex items-center text-sm font-semibold ${
                        flight.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'
                    }">
                        ${flight.status}
                    </div>
                </div>
            `;
            flightLogList.appendChild(li);
        });
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

    // Assign to flight handler
    window.assignToFlight = async () => {
        try {
            // TODO: Replace with actual flight assignment modal and API call
            const assigned = await simulateApiCall({
                type: 'assignFlight',
                pilotId: auth.user.id
            });

            utils.showNotification('Successfully assigned to flight', 'success');
            loadUpcomingFlights(); // Refresh the upcoming flights list
        } catch (error) {
            utils.showNotification('Failed to assign to flight', 'error');
        }
    };

    // Request rank up handler
    window.requestRankUp = async () => {
        if (pilotStats.rankProgress < 100) {
            utils.showNotification('You have not met the requirements for rank up yet', 'error');
            return;
        }

        try {
            // TODO: Replace with actual rank up API call
            const rankUp = await simulateApiCall({
                type: 'rankUp',
                pilotId: auth.user.id,
                currentRank: pilotStats.currentRank
            });

            utils.showNotification('Rank up request submitted successfully', 'success');
        } catch (error) {
            utils.showNotification('Failed to submit rank up request', 'error');
        }
    };

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

    // Initialize dashboard
    loadPilotData();
    loadUpcomingFlights();
    loadFlightLog();

    // Refresh data periodically
    setInterval(loadUpcomingFlights, 60000); // Refresh upcoming flights every minute
    setInterval(loadFlightLog, 300000); // Refresh flight log every 5 minutes
});
