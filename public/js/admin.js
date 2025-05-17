// Admin Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dashboardContent = document.getElementById('dashboardContent');
    const accessDenied = document.getElementById('accessDenied');
    const createFlightForm = document.getElementById('createFlightForm');
    const flightSchedule = document.getElementById('flightSchedule');
    const rankUpRequests = document.getElementById('rankUpRequests');
    const systemLogs = document.getElementById('systemLogs');
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');
    const currentDateSpan = document.getElementById('currentDate');

    // Current date for schedule view
    let currentDate = new Date();

    // Socket.IO connection
    let socket;

    // Initialize dashboard
    async function initDashboard() {
        if (!auth.isAuthenticated || !auth.isSupervisor()) {
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
            loadSystemStats(),
            loadFlightSchedule(),
            loadRankUpRequests(),
            loadSystemLogs(),
            populateAirports(),
            loadPilotsList()
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

        socket.on('flight_created', (flight) => {
            updateFlightSchedule(flight);
            utils.showNotification('New flight created', 'success');
        });

        socket.on('rank_up_requested', (request) => {
            addRankUpRequest(request);
            utils.showNotification('New rank up request received', 'info');
        });

        socket.on('system_log', (log) => {
            addSystemLog(log);
        });
    }

    // Load system statistics
    async function loadSystemStats() {
        try {
            const stats = await utils.fetchAPI('/api/admin/stats');
            updateSystemStats(stats);
        } catch (error) {
            console.error('Error loading system stats:', error);
            utils.showNotification('Failed to load system statistics', 'error');
        }
    }

    // Update system statistics display
    function updateSystemStats(stats) {
        document.getElementById('activeFlightsCount').textContent = stats.activeFlights;
        document.getElementById('totalPilotsCount').textContent = stats.totalPilots;
        document.getElementById('totalATCCount').textContent = stats.totalATC;
        document.getElementById('todayFlightsCount').textContent = stats.todayFlights;
    }

    // Load flight schedule
    async function loadFlightSchedule() {
        try {
            const date = currentDate.toISOString().split('T')[0];
            const flights = await utils.fetchAPI(`/api/flights/schedule?date=${date}`);
            displayFlightSchedule(flights);
            updateCurrentDateDisplay();
        } catch (error) {
            console.error('Error loading flight schedule:', error);
            utils.showNotification('Failed to load flight schedule', 'error');
        }
    }

    // Display flight schedule
    function displayFlightSchedule(flights) {
        flightSchedule.innerHTML = '';
        flights.forEach(flight => {
            const flightElement = createFlightElement(flight);
            flightSchedule.appendChild(flightElement);
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
                    <p class="text-sm text-gray-500">${utils.formatDate(flight.departureTime)}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="editFlight('${flight.id}')" class="p-2 text-blue-600 hover:text-blue-800">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deleteFlight('${flight.id}')" class="p-2 text-red-600 hover:text-red-800">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        return div;
    }

    // Load rank up requests
    async function loadRankUpRequests() {
        try {
            const requests = await utils.fetchAPI('/api/admin/rank-up-requests');
            displayRankUpRequests(requests);
        } catch (error) {
            console.error('Error loading rank up requests:', error);
            utils.showNotification('Failed to load rank up requests', 'error');
        }
    }

    // Display rank up requests
    function displayRankUpRequests(requests) {
        rankUpRequests.innerHTML = '';
        requests.forEach(request => {
            const requestElement = createRankUpRequestElement(request);
            rankUpRequests.appendChild(requestElement);
        });
    }

    // Create rank up request element
    function createRankUpRequestElement(request) {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-md';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-lg font-semibold">${request.pilotName}</p>
                    <p class="text-sm text-gray-500">Current Rank: ${request.currentRank}</p>
                    <p class="text-sm text-gray-500">Total Mileage: ${request.totalMileage} nm</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="approveRankUp('${request.id}')" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        Approve
                    </button>
                    <button onclick="denyRankUp('${request.id}')" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Deny
                    </button>
                </div>
            </div>
        `;
        return div;
    }

    // Load system logs
    async function loadSystemLogs() {
        try {
            const logs = await utils.fetchAPI('/api/admin/logs');
            displaySystemLogs(logs);
        } catch (error) {
            console.error('Error loading system logs:', error);
            utils.showNotification('Failed to load system logs', 'error');
        }
    }

    // Display system logs
    function displaySystemLogs(logs) {
        systemLogs.innerHTML = '';
        logs.forEach(log => {
            const logElement = createLogElement(log);
            systemLogs.appendChild(logElement);
        });
    }

    // Create log element
    function createLogElement(log) {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-md';
        div.innerHTML = `
            <p class="text-sm text-gray-500">${utils.formatDate(log.timestamp)}</p>
            <p class="font-medium">${log.message}</p>
            <p class="text-sm text-gray-500">${log.type} - ${log.user}</p>
        `;
        return div;
    }

    // Populate airports in flight creation form
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

    // Load pilots list for assignment
    async function loadPilotsList() {
        try {
            const pilots = await utils.fetchAPI('/api/admin/pilots');
            populatePilotSelects(pilots);
        } catch (error) {
            console.error('Error loading pilots list:', error);
            utils.showNotification('Failed to load pilots list', 'error');
        }
    }

    // Populate pilot selection dropdowns
    function populatePilotSelects(pilots) {
        const pilotSelect = document.getElementById('assignPilot');
        const foSelect = document.getElementById('assignFirstOfficer');

        pilots.forEach(pilot => {
            const option = document.createElement('option');
            option.value = pilot.id;
            option.textContent = `${pilot.name} (${pilot.rank})`;
            
            if (pilot.rank.includes('Captain')) {
                pilotSelect.appendChild(option.cloneNode(true));
            } else if (pilot.rank.includes('First Officer')) {
                foSelect.appendChild(option.cloneNode(true));
            }
        });
    }

    // Set up event listeners
    function setupEventListeners() {
        // Create flight form submission
        createFlightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createFlight();
        });

        // Date navigation
        prevDayBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1);
            loadFlightSchedule();
        });

        nextDayBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1);
            loadFlightSchedule();
        });
    }

    // Create new flight with validation
    async function createFlight() {
        try {
            const formData = new FormData(createFlightForm);
            
            // Validate form data
            const validationErrors = validateFlightData(formData);
            if (validationErrors.length > 0) {
                utils.showNotification(validationErrors[0], 'error');
                return;
            }

            // Check for schedule conflicts
            const hasConflicts = await checkScheduleConflicts(formData);
            if (hasConflicts) {
                utils.showNotification('Schedule conflict detected', 'error');
                return;
            }

            // Check crew availability
            const crewAvailable = await checkCrewAvailability(formData);
            if (!crewAvailable) {
                utils.showNotification('Selected crew members are not available', 'error');
                return;
            }

            const flightData = {
                flightNumber: `6E${formData.get('flightNumber')}`,
                departure: formData.get('departure'),
                arrival: formData.get('arrival'),
                departureTime: formData.get('departureTime'),
                aircraft: formData.get('aircraft'),
                pilot: formData.get('assignPilot') || null,
                firstOfficer: formData.get('assignFirstOfficer') || null,
                estimatedDuration: calculateFlightDuration(
                    formData.get('departure'),
                    formData.get('arrival'),
                    formData.get('aircraft')
                ),
                turnaroundTime: config.minTurnaroundTime
            };

            // Add route planning
            const routePlan = await generateRoutePlan(
                flightData.departure,
                flightData.arrival,
                flightData.aircraft
            );
            flightData.routePlan = routePlan;

            const response = await utils.fetchAPI('/api/flights/create', {
                method: 'POST',
                body: JSON.stringify(flightData)
            });

            // Update system stats
            await loadSystemStats();

            // Add to system logs
            addSystemLog({
                type: 'FLIGHT_CREATED',
                message: `Flight ${flightData.flightNumber} created`,
                user: auth.userInfo.username,
                timestamp: new Date()
            });

            utils.showNotification('Flight created successfully', 'success');
            createFlightForm.reset();
            updateFlightSchedule(response);

            // Notify assigned crew
            if (flightData.pilot || flightData.firstOfficer) {
                await notifyCrewAssignment(flightData);
            }

        } catch (error) {
            console.error('Error creating flight:', error);
            utils.showNotification('Failed to create flight', 'error');
        }
    }

    // Validate flight data
    function validateFlightData(formData) {
        const errors = [];
        
        // Flight number validation
        const flightNum = formData.get('flightNumber');
        if (!flightNum || !/^\d{3}$/.test(flightNum)) {
            errors.push('Flight number must be 3 digits');
        }

        // Airport validation
        const departure = formData.get('departure');
        const arrival = formData.get('arrival');
        if (!departure || !arrival) {
            errors.push('Both departure and arrival airports are required');
        }
        if (departure === arrival) {
            errors.push('Departure and arrival airports cannot be the same');
        }

        // Time validation
        const departureTime = new Date(formData.get('departureTime'));
        if (isNaN(departureTime.getTime())) {
            errors.push('Invalid departure time');
        }
        if (departureTime < new Date()) {
            errors.push('Departure time cannot be in the past');
        }

        // Aircraft validation
        if (!formData.get('aircraft')) {
            errors.push('Aircraft type is required');
        }

        // Crew validation
        const pilot = formData.get('assignPilot');
        const firstOfficer = formData.get('assignFirstOfficer');
        if (pilot && firstOfficer && pilot === firstOfficer) {
            errors.push('Pilot and First Officer cannot be the same person');
        }

        return errors;
    }

    // Check for schedule conflicts
    async function checkScheduleConflicts(formData) {
        try {
            const response = await utils.fetchAPI('/api/admin/check-conflicts', {
                method: 'POST',
                body: JSON.stringify({
                    departureTime: formData.get('departureTime'),
                    departure: formData.get('departure'),
                    arrival: formData.get('arrival'),
                    aircraft: formData.get('aircraft')
                })
            });
            return response.hasConflicts;
        } catch (error) {
            console.error('Error checking schedule conflicts:', error);
            return true;
        }
    }

    // Check crew availability
    async function checkCrewAvailability(formData) {
        try {
            const response = await utils.fetchAPI('/api/admin/check-crew', {
                method: 'POST',
                body: JSON.stringify({
                    departureTime: formData.get('departureTime'),
                    pilot: formData.get('assignPilot'),
                    firstOfficer: formData.get('assignFirstOfficer')
                })
            });
            return response.available;
        } catch (error) {
            console.error('Error checking crew availability:', error);
            return false;
        }
    }

    // Generate route plan
    async function generateRoutePlan(departure, arrival, aircraft) {
        try {
            const response = await utils.fetchAPI('/api/admin/generate-route', {
                method: 'POST',
                body: JSON.stringify({
                    departure,
                    arrival,
                    aircraft
                })
            });
            return response.routePlan;
        } catch (error) {
            console.error('Error generating route plan:', error);
            return null;
        }
    }

    // Notify crew of assignment
    async function notifyCrewAssignment(flightData) {
        try {
            await utils.fetchAPI('/api/admin/notify-crew', {
                method: 'POST',
                body: JSON.stringify({
                    flightNumber: flightData.flightNumber,
                    departureTime: flightData.departureTime,
                    pilot: flightData.pilot,
                    firstOfficer: flightData.firstOfficer
                })
            });
        } catch (error) {
            console.error('Error notifying crew:', error);
        }
    }

    // Update current date display
    function updateCurrentDateDisplay() {
        currentDateSpan.textContent = currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Update flight schedule with new flight
    function updateFlightSchedule(flight) {
        const flightDate = new Date(flight.departureTime).toDateString();
        if (flightDate === currentDate.toDateString()) {
            const flightElement = createFlightElement(flight);
            flightSchedule.appendChild(flightElement);
        }
    }

    // Add rank up request to list
    function addRankUpRequest(request) {
        const requestElement = createRankUpRequestElement(request);
        rankUpRequests.insertBefore(requestElement, rankUpRequests.firstChild);
    }

    // Add system log entry
    function addSystemLog(log) {
        const logElement = createLogElement(log);
        systemLogs.insertBefore(logElement, systemLogs.firstChild);
    }

    // Initialize dashboard when auth state changes
    auth.onAuthStateChanged = initDashboard;

    // Initial dashboard setup
    initDashboard();
});
