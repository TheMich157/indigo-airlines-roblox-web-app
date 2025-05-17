// ATC Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dashboardContent = document.getElementById('dashboardContent');
    const accessDenied = document.getElementById('accessDenied');
    const activeFlightsList = document.getElementById('activeFlightsList');
    const clearanceForm = document.getElementById('clearanceForm');
    const joinVoiceBtn = document.getElementById('joinVoiceBtn');
    const clearanceLog = document.getElementById('clearanceLog');

    // Socket.IO connection
    let socket;

    // Initialize dashboard
    async function initDashboard() {
        if (!auth.isAuthenticated || !auth.isATC()) {
            dashboardContent.classList.add('hidden');
            accessDenied.classList.remove('hidden');
            return;
        }

        dashboardContent.classList.remove('hidden');
        accessDenied.classList.add('hidden');

        // Initialize Socket.IO
        initializeSocket();

        // Load initial data
        await Promise.all([
            loadActiveFlights(),
            loadWeatherInfo(),
            populateClearanceTypes()
        ]);

        // Set up event listeners
        setupEventListeners();
    }

    // Initialize Socket.IO connection
    function initializeSocket() {
        socket = io(config.socket.url, config.socket.options);

        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('clearance_issued', (clearance) => {
            addClearanceToLog(clearance);
            utils.showNotification(`Clearance issued: ${clearance.type}`, 'success');
        });

        socket.on('flight_status_updated', (flight) => {
            updateFlightInList(flight);
        });

        socket.on('flight_delayed', (flight) => {
            updateFlightInList(flight);
            utils.showNotification(`Flight ${flight.flightNumber} delayed`, 'info');
        });

        socket.on('voice_channel_joined', (data) => {
            updateVoiceChannelStatus(data);
        });

        socket.on('voice_channel_left', (data) => {
            updateVoiceChannelStatus(data);
        });
    }

    // Load active flights
    async function loadActiveFlights() {
        try {
            const flights = await utils.fetchAPI(config.api.endpoints.atc.activeFlights);
            displayActiveFlights(flights);
        } catch (error) {
            console.error('Error loading active flights:', error);
            utils.showNotification('Failed to load active flights', 'error');
        }
    }

    // Display active flights in the list
    function displayActiveFlights(flights) {
        activeFlightsList.innerHTML = '';
        flights.forEach(flight => {
            const flightElement = createFlightElement(flight);
            activeFlightsList.appendChild(flightElement);
        });
    }

    // Create flight element
    function createFlightElement(flight) {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-md';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-lg font-semibold">${flight.flightNumber}</p>
                    <p class="text-sm text-gray-500">${flight.departure} → ${flight.arrival}</p>
                </div>
                <span class="px-2 py-1 text-sm rounded-full ${
                    flight.status === 'delayed' ? 'bg-red-100 text-red-800' :
                    flight.status === 'boarding' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                }">${utils.formatFlightStatus(flight.status)}</span>
            </div>
        `;
        return div;
    }

    // Load weather information
    async function loadWeatherInfo() {
        try {
            const weather = await utils.fetchAPI(config.api.endpoints.atc.weather);
            updateWeatherDisplay(weather);
        } catch (error) {
            console.error('Error loading weather:', error);
            utils.showNotification('Failed to load weather information', 'error');
        }
    }

    // Update weather display
    function updateWeatherDisplay(weather) {
        document.getElementById('windDirection').textContent = weather.windDirection;
        document.getElementById('visibility').textContent = weather.visibility;
        document.getElementById('cloudBase').textContent = weather.cloudBase;
        document.getElementById('temperature').textContent = weather.temperature;
    }

    // Populate clearance types
    function populateClearanceTypes() {
        const clearanceTypeSelect = document.getElementById('clearanceType');
        clearanceTypeSelect.innerHTML = '<option value="">Select clearance type</option>';
        
        config.clearanceTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.toLowerCase().replace(/\s+/g, '_');
            option.textContent = type;
            clearanceTypeSelect.appendChild(option);
        });
    }

    // Set up event listeners
    function setupEventListeners() {
        // Clearance form submission
        clearanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await issueClearance();
        });

        // Voice channel controls
        joinVoiceBtn.addEventListener('click', toggleVoiceChannel);

        // Refresh data periodically
        setInterval(loadWeatherInfo, 60000); // Update weather every minute
        setInterval(loadActiveFlights, 30000); // Update flights every 30 seconds
    }

    // Issue specific clearances
    async function issueATCClearance() {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('atc', 'ATC clearance issued');
    }

    async function issueTakeoffClearance() {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('takeoff', 'Cleared for takeoff');
    }

    async function issueLandingClearance() {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('landing', 'Cleared to land');
    }

    async function issueTaxiClearance() {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('taxi', 'Cleared to taxi');
    }

    async function issuePushbackClearance() {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        await issueClearance('pushback', 'Cleared for pushback');
    }

    async function issueSelectedClearance() {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }
        
        const clearanceType = document.getElementById('otherClearances').value;
        if (!clearanceType) {
            utils.showNotification('Please select a clearance type', 'error');
            return;
        }

        const clearanceMessages = {
            'climb': 'Cleared to climb',
            'descent': 'Cleared to descend',
            'approach': 'Cleared for approach',
            'holding': 'Cleared for holding pattern',
            'crossing': 'Cleared to cross'
        };

        await issueClearance(clearanceType, clearanceMessages[clearanceType]);
    }

    // Issue delay
    async function issueDelay() {
        if (!selectedFlight) {
            utils.showNotification('Please select a flight first', 'error');
            return;
        }

        const reason = document.getElementById('delayReason').value;
        const duration = document.getElementById('delayDuration').value;

        if (!reason || !duration) {
            utils.showNotification('Please provide both reason and duration for delay', 'error');
            return;
        }

        try {
            const response = await utils.fetchAPI(config.api.endpoints.atc.delay, {
                method: 'POST',
                body: JSON.stringify({
                    flightId: selectedFlight.id,
                    reason: reason,
                    duration: parseInt(duration),
                    atcId: auth.userInfo.id
                })
            });

            utils.showNotification(`Flight delayed for ${duration} minutes`, 'success');
            updateFlightInList(response.flight);
        } catch (error) {
            console.error('Error issuing delay:', error);
            utils.showNotification('Failed to issue delay', 'error');
        }
    }

    // Generic clearance function
    async function issueClearance(type, remarks = '') {
        try {
            const clearance = {
                flightId: selectedFlight.id,
                type: type,
                remarks: remarks,
                atcId: auth.userInfo.id
            };

            const response = await utils.fetchAPI(config.api.endpoints.atc.clearance, {
                method: 'POST',
                body: JSON.stringify(clearance)
            });

            utils.showNotification('Clearance issued successfully', 'success');
            addClearanceToLog(response);
            
            // Update flight status if needed
            if (response.flight) {
                updateFlightInList(response.flight);
            }
        } catch (error) {
            console.error('Error issuing clearance:', error);
            utils.showNotification('Failed to issue clearance', 'error');
        }
    }

    // Track selected flight
    let selectedFlight = null;

    // Handle flight selection
    function selectFlight(flight) {
        selectedFlight = flight;
        
        // Update UI to show selected flight
        document.getElementById('selectedFlightInfo').classList.remove('hidden');
        document.getElementById('flightNumber').textContent = flight.flightNumber;
        document.getElementById('aircraft').textContent = flight.aircraft;
        document.getElementById('route').textContent = `${flight.departure} → ${flight.arrival}`;
        document.getElementById('status').textContent = utils.formatFlightStatus(flight.status);

        // Highlight selected flight in list
        const flightElements = activeFlightsList.querySelectorAll('[data-flight-id]');
        flightElements.forEach(el => {
            el.classList.remove('ring-2', 'ring-indigo-500');
            if (el.dataset.flightId === flight.id) {
                el.classList.add('ring-2', 'ring-indigo-500');
            }
        });
    }

    // Add clearance to log
    function addClearanceToLog(clearance) {
        const logEntry = document.createElement('div');
        logEntry.className = 'bg-gray-50 p-4 rounded-md';
        logEntry.innerHTML = `
            <p class="text-sm text-gray-500">${utils.formatDate(clearance.timestamp)}</p>
            <p class="font-medium">${clearance.type}</p>
            <p class="text-sm">${clearance.remarks || ''}</p>
        `;
        clearanceLog.insertBefore(logEntry, clearanceLog.firstChild);
    }

    // Toggle voice channel
    async function toggleVoiceChannel() {
        const frequency = document.getElementById('frequency').value;
        const isJoining = joinVoiceBtn.textContent === 'Join Channel';

        try {
            const endpoint = isJoining ? 
                config.api.endpoints.atc.voice.join :
                config.api.endpoints.atc.voice.leave;

            await utils.fetchAPI(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    atcId: auth.userInfo.id,
                    frequency
                })
            });

            joinVoiceBtn.textContent = isJoining ? 'Leave Channel' : 'Join Channel';
            joinVoiceBtn.classList.toggle('bg-green-600');
            joinVoiceBtn.classList.toggle('bg-red-600');

            utils.showNotification(
                `Successfully ${isJoining ? 'joined' : 'left'} voice channel`,
                'success'
            );
        } catch (error) {
            console.error('Error toggling voice channel:', error);
            utils.showNotification('Failed to toggle voice channel', 'error');
        }
    }

    // Update flight in list
    function updateFlightInList(updatedFlight) {
        const existingFlight = activeFlightsList.querySelector(`[data-flight-id="${updatedFlight.id}"]`);
        if (existingFlight) {
            existingFlight.replaceWith(createFlightElement(updatedFlight));
        } else {
            activeFlightsList.appendChild(createFlightElement(updatedFlight));
        }
    }

    // Update voice channel status
    function updateVoiceChannelStatus(data) {
        const frequency = document.getElementById('frequency');
        if (data.frequency === frequency.value) {
            joinVoiceBtn.textContent = data.userId === auth.userInfo.id ? 'Leave Channel' : 'Join Channel';
            joinVoiceBtn.classList.toggle('bg-green-600', data.userId === auth.userInfo.id);
            joinVoiceBtn.classList.toggle('bg-red-600', data.userId !== auth.userInfo.id);
        }
    }

    // Initialize dashboard when auth state changes
    auth.onAuthStateChanged = initDashboard;

    // Initial dashboard setup
    initDashboard();
});
