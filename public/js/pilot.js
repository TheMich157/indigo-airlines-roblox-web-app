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

    // Submit flight plan with validation
    async function submitFlightPlan() {
        try {
            const formData = new FormData(flightPlanForm);
            
            // Validate form data
            const validationErrors = validateFlightPlan(formData);
            if (validationErrors.length > 0) {
                utils.showNotification(validationErrors[0], 'error');
                return;
            }

            // Check for minimum rank requirements
            const aircraft = formData.get('aircraft');
            const hasRequiredRank = await checkAircraftRankRequirement(aircraft);
            if (!hasRequiredRank) {
                utils.showNotification('Your current rank does not allow you to fly this aircraft', 'error');
                return;
            }

            // Check for active flight limit
            const hasActiveFlightLimit = await checkActiveFlightLimit();
            if (hasActiveFlightLimit) {
                utils.showNotification('You have reached the maximum number of active flights', 'error');
                return;
            }

            const flightPlan = {
                flightId: formData.get('flightNumber'),
                departure: formData.get('departure'),
                arrival: formData.get('arrival'),
                aircraft: aircraft,
                cruisingAltitude: parseInt(formData.get('cruisingAltitude')),
                route: formData.get('route'),
                pilotId: auth.userInfo.id,
                alternateAirports: calculateAlternateAirports(formData.get('departure'), formData.get('arrival')),
                estimatedDuration: calculateFlightDuration(
                    formData.get('departure'),
                    formData.get('arrival'),
                    aircraft,
                    parseInt(formData.get('cruisingAltitude'))
                )
            };

            const response = await utils.fetchAPI(config.api.endpoints.pilot.flightPlan, {
                method: 'POST',
                body: JSON.stringify(flightPlan)
            });

            utils.showNotification('Flight plan submitted successfully', 'success');
            flightPlanForm.reset();
            
            // Add to activity log
            addActivityLogEntry({
                type: 'flight_plan',
                message: `Flight plan submitted for ${response.flightNumber}`,
                timestamp: new Date(),
                details: {
                    route: flightPlan.route,
                    duration: flightPlan.estimatedDuration,
                    alternates: flightPlan.alternateAirports
                }
            });

            // Update flight assignments
            await loadFlightAssignments();
            
        } catch (error) {
            console.error('Error submitting flight plan:', error);
            utils.showNotification('Failed to submit flight plan', 'error');
        }
    }

    // Validate flight plan data
    function validateFlightPlan(formData) {
        const errors = [];
        
        if (!formData.get('flightNumber')) {
            errors.push('Please select a flight');
        }
        
        if (!formData.get('departure')) {
            errors.push('Please select departure airport');
        }
        
        if (!formData.get('arrival')) {
            errors.push('Please select arrival airport');
        }
        
        if (formData.get('departure') === formData.get('arrival')) {
            errors.push('Departure and arrival airports cannot be the same');
        }
        
        const altitude = parseInt(formData.get('cruisingAltitude'));
        if (!altitude || altitude < 10000 || altitude > 40000) {
            errors.push('Invalid cruising altitude (must be between 10,000 and 40,000 ft)');
        }
        
        if (!formData.get('route')) {
            errors.push('Please specify a route');
        }

        return errors;
    }

    // Check aircraft rank requirement
    async function checkAircraftRankRequirement(aircraft) {
        try {
            const response = await utils.fetchAPI(`${config.api.endpoints.pilot.checkRank}?aircraft=${aircraft}`);
            return response.hasRequiredRank;
        } catch (error) {
            console.error('Error checking rank requirement:', error);
            return false;
        }
    }

    // Check active flight limit
    async function checkActiveFlightLimit() {
        try {
            const response = await utils.fetchAPI(config.api.endpoints.pilot.activeFlights);
            return response.activeFlights >= config.maxConcurrentFlights;
        } catch (error) {
            console.error('Error checking active flight limit:', error);
            return true;
        }
    }

    // Calculate alternate airports
    function calculateAlternateAirports(departure, arrival) {
        const alternates = [];
        const depAirport = config.airports[departure];
        const arrAirport = config.airports[arrival];

        // Find nearest airports to destination
        Object.entries(config.airports).forEach(([code, airport]) => {
            if (code !== departure && code !== arrival) {
                const distance = calculateDistance(
                    arrAirport.latitude,
                    arrAirport.longitude,
                    airport.latitude,
                    airport.longitude
                );
                if (distance <= 200) { // Within 200nm
                    alternates.push(code);
                }
            }
        });

        // Sort by distance and return top 2
        return alternates.slice(0, 2);
    }

    // Calculate flight duration
    function calculateFlightDuration(departure, arrival, aircraft, altitude) {
        const depAirport = config.airports[departure];
        const arrAirport = config.airports[arrival];
        
        // Calculate distance
        const distance = calculateDistance(
            depAirport.latitude,
            depAirport.longitude,
            arrAirport.latitude,
            arrAirport.longitude
        );

        // Get aircraft cruise speed
        const cruiseSpeed = config.aircraft[aircraft].cruiseSpeed;

        // Calculate basic duration
        let duration = (distance / cruiseSpeed) * 60; // Convert to minutes

        // Add time for climb and descent
        duration += 15; // Climb
        duration += 15; // Descent

        return Math.round(duration);
    }

    // Calculate distance between coordinates using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3440.065; // Earth radius in nautical miles
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Convert degrees to radians
    function toRad(deg) {
        return deg * (Math.PI/180);
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
