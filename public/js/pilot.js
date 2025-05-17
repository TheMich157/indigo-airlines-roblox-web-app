// Pilot Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dashboardContent = document.getElementById('dashboardContent');
    const accessDenied = document.getElementById('accessDenied');
    const flightPlanForm = document.getElementById('flightPlanForm');
    const flightAssignments = document.getElementById('flightAssignments');
    const activityLog = document.getElementById('activityLog');
    const joinVoiceBtn = document.getElementById('joinVoiceBtn');

    // Socket.IO connection
    let socket;

    // Initialize dashboard
    async function initDashboard() {
        if (!auth.isAuthenticated || !auth.isPilot()) {
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
            loadPilotStats(),
            loadFlightAssignments(),
            populateAirports(),
            loadActivityLog()
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

        socket.on('flight_status_updated', (flight) => {
            updateFlightAssignment(flight);
        });

        socket.on('clearance_issued', (clearance) => {
            if (clearance.flightId === getCurrentFlightId()) {
                addActivityLogEntry({
                    type: 'clearance',
                    message: `Received ${clearance.type}`,
                    timestamp: new Date()
                });
            }
        });

        socket.on('voice_channel_joined', (data) => {
            updateVoiceChannelStatus(data);
        });

        socket.on('voice_channel_left', (data) => {
            updateVoiceChannelStatus(data);
        });
    }

    // Load pilot statistics
    async function loadPilotStats() {
        try {
            const stats = await utils.fetchAPI(config.api.endpoints.pilot.mileage);
            updatePilotStats(stats);
        } catch (error) {
            console.error('Error loading pilot stats:', error);
            utils.showNotification('Failed to load pilot statistics', 'error');
        }
    }

    // Update pilot statistics display
    function updatePilotStats(stats) {
        document.getElementById('currentRank').textContent = stats.currentRank;
        document.getElementById('totalMileage').textContent = `${stats.totalMileage} nm`;
        document.getElementById('nextRank').textContent = stats.nextRank;

        // Update progress bar
        const progressBar = document.getElementById('rankProgress');
        const progress = (stats.currentMileage / stats.nextRankMileage) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // Load flight assignments
    async function loadFlightAssignments() {
        try {
            const assignments = await utils.fetchAPI(`${config.api.endpoints.flights.list}?pilot=${auth.userInfo.id}`);
            displayFlightAssignments(assignments);
        } catch (error) {
            console.error('Error loading flight assignments:', error);
            utils.showNotification('Failed to load flight assignments', 'error');
        }
    }

    // Display flight assignments
    function displayFlightAssignments(assignments) {
        flightAssignments.innerHTML = '';
        assignments.forEach(flight => {
            const assignmentElement = createFlightAssignmentElement(flight);
            flightAssignments.appendChild(assignmentElement);
        });

        // Update flight number select in flight plan form
        updateFlightNumberSelect(assignments);
    }

    // Create flight assignment element
    function createFlightAssignmentElement(flight) {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-md';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-lg font-semibold">${flight.flightNumber}</p>
                    <p class="text-sm text-gray-500">${flight.departure} → ${flight.arrival}</p>
                    <p class="text-sm text-gray-500">${utils.formatDate(flight.departureTime)}</p>
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

    // Populate airports in flight plan form
    function populateAirports() {
        const departureSelect = document.getElementById('departure');
        const arrivalSelect = document.getElementById('arrival');

        departureSelect.innerHTML = '<option value="">Select airport</option>';
        arrivalSelect.innerHTML = '<option value="">Select airport</option>';

        Object.entries(config.airports).forEach(([code, airport]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${airport.city} (${code})`;
            
            departureSelect.appendChild(option.cloneNode(true));
            arrivalSelect.appendChild(option.cloneNode(true));
        });
    }

    // Update flight number select in flight plan form
    function updateFlightNumberSelect(assignments) {
        const flightNumberSelect = document.getElementById('flightNumber');
        flightNumberSelect.innerHTML = '<option value="">Select flight</option>';

        assignments.forEach(flight => {
            if (flight.status === 'scheduled') {
                const option = document.createElement('option');
                option.value = flight.id;
                option.textContent = flight.flightNumber;
                flightNumberSelect.appendChild(option);
            }
        });
    }

    // Load activity log
    async function loadActivityLog() {
        try {
            const activities = await utils.fetchAPI(`${config.api.endpoints.pilot.activityLog}?pilot=${auth.userInfo.id}`);
            displayActivityLog(activities);
        } catch (error) {
            console.error('Error loading activity log:', error);
            utils.showNotification('Failed to load activity log', 'error');
        }
    }

    // Display activity log
    function displayActivityLog(activities) {
        activityLog.innerHTML = '';
        activities.forEach(activity => {
            const logEntry = createActivityLogEntry(activity);
            activityLog.appendChild(logEntry);
        });
    }

    // Create activity log entry
    function createActivityLogEntry(activity) {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-md';
        div.innerHTML = `
            <p class="text-sm text-gray-500">${utils.formatDate(activity.timestamp)}</p>
            <p class="font-medium">${activity.message}</p>
        `;
        return div;
    }

    // Add entry to activity log
    function addActivityLogEntry(activity) {
        const logEntry = createActivityLogEntry(activity);
        activityLog.insertBefore(logEntry, activityLog.firstChild);
    }

    // Set up event listeners
    function setupEventListeners() {
        // Flight plan form submission
        flightPlanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitFlightPlan();
        });

        // Voice channel controls
        joinVoiceBtn.addEventListener('click', toggleVoiceChannel);

        // Auto-populate route based on selected airports
        document.getElementById('departure').addEventListener('change', updateRouteField);
        document.getElementById('arrival').addEventListener('change', updateRouteField);
    }

    // Submit flight plan
    async function submitFlightPlan() {
        try {
            const formData = new FormData(flightPlanForm);
            const flightPlan = {
                flightId: formData.get('flightNumber'),
                departure: formData.get('departure'),
                arrival: formData.get('arrival'),
                aircraft: formData.get('aircraft'),
                cruisingAltitude: formData.get('cruisingAltitude'),
                route: formData.get('route'),
                pilotId: auth.userInfo.id
            };

            const response = await utils.fetchAPI(config.api.endpoints.pilot.flightPlan, {
                method: 'POST',
                body: JSON.stringify(flightPlan)
            });

            utils.showNotification('Flight plan submitted successfully', 'success');
            flightPlanForm.reset();
            addActivityLogEntry({
                type: 'flight_plan',
                message: `Flight plan submitted for ${response.flightNumber}`,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error submitting flight plan:', error);
            utils.showNotification('Failed to submit flight plan', 'error');
        }
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
                    pilotId: auth.userInfo.id,
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

    // Update route field based on selected airports
    function updateRouteField() {
        const departure = document.getElementById('departure').value;
        const arrival = document.getElementById('arrival').value;
        const routeField = document.getElementById('route');

        if (departure && arrival) {
            const depAirport = config.airports[departure];
            const arrAirport = config.airports[arrival];
            
            if (depAirport && arrAirport) {
                routeField.value = `${departure} DCT ${arrival}`;
            }
        }
    }

    // Update flight assignment in list
    function updateFlightAssignment(updatedFlight) {
        const existingFlight = flightAssignments.querySelector(`[data-flight-id="${updatedFlight.id}"]`);
        if (existingFlight) {
            existingFlight.replaceWith(createFlightAssignmentElement(updatedFlight));
        }
    }

    // Get current flight ID
    function getCurrentFlightId() {
        const flightNumberSelect = document.getElementById('flightNumber');
        return flightNumberSelect.value;
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
