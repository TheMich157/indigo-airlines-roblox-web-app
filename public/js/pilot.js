// Pilot Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dashboardContent = document.getElementById('dashboardContent');
    const accessDenied = document.getElementById('accessDenied');
    const currentRank = document.getElementById('currentRank');
    const totalMileage = document.getElementById('totalMileage');
    const nextRank = document.getElementById('nextRank');
    const rankProgress = document.getElementById('rankProgress');
    const flightAssignments = document.getElementById('flightAssignments');
    const activityLog = document.getElementById('activityLog');
    const flightPlanForm = document.getElementById('flightPlanForm');
    const departureSelect = document.getElementById('departure');
    const arrivalSelect = document.getElementById('arrival');
    const joinVoiceBtn = document.getElementById('joinVoiceBtn');

    // Initialize dashboard
    async function initDashboard() {
        if (!auth.isAuthenticated) {
            dashboardContent.classList.add('hidden');
            accessDenied.classList.remove('hidden');
            return;
        }

        if (!auth.isPilot()) {
            dashboardContent.classList.add('hidden');
            accessDenied.classList.remove('hidden');
            return;
        }

        // Show dashboard content
        dashboardContent.classList.remove('hidden');
        accessDenied.classList.add('hidden');

        // Load pilot data
        await loadPilotData();

        // Load airports into selects
        loadAirports();

        // Load flight assignments
        await loadFlightAssignments();

        // Load activity log
        await loadActivityLog();
    }

    // Load pilot data
    async function loadPilotData() {
        try {
            const rank = auth.getUserRank();
            const mileage = auth.getUserMileage();
            
            // Update rank and mileage display
            currentRank.textContent = rank;
            totalMileage.textContent = `${mileage.toLocaleString()} nm`;

            // Calculate next rank and progress
            const nextRankInfo = getNextRank(rank, mileage);
            if (nextRankInfo) {
                nextRank.textContent = nextRankInfo.name;
                const progress = ((mileage - nextRankInfo.currentRequired) / 
                                (nextRankInfo.nextRequired - nextRankInfo.currentRequired)) * 100;
                rankProgress.style.width = `${Math.min(100, progress)}%`;
            } else {
                nextRank.textContent = 'Maximum Rank Achieved';
                rankProgress.style.width = '100%';
            }
        } catch (error) {
            console.error('Error loading pilot data:', error);
            utils.showNotification('Failed to load pilot data', 'error');
        }
    }

    // Get next rank information
    function getNextRank(currentRank, mileage) {
        const ranks = config.pilotRanks;
        const currentRankIndex = ranks.findIndex(r => r.name === currentRank);
        
        if (currentRankIndex === -1 || currentRankIndex === ranks.length - 1) {
            return null;
        }

        return {
            name: ranks[currentRankIndex + 1].name,
            currentRequired: ranks[currentRankIndex].mileageRequired,
            nextRequired: ranks[currentRankIndex + 1].mileageRequired
        };
    }

    // Load airports into select elements
    function loadAirports() {
        const airports = Object.values(config.airports);
        
        // Clear existing options
        departureSelect.innerHTML = '<option value="">Select airport</option>';
        arrivalSelect.innerHTML = '<option value="">Select airport</option>';

        // Add airport options
        airports.forEach(airport => {
            const option = document.createElement('option');
            option.value = airport.code;
            option.textContent = `${airport.code} - ${airport.name}`;
            
            departureSelect.appendChild(option.cloneNode(true));
            arrivalSelect.appendChild(option);
        });
    }

    // Load flight assignments
    async function loadFlightAssignments() {
        try {
            const response = await utils.fetchAPI('/api/pilot/flight-assignments');
            
            // Clear existing assignments
            flightAssignments.innerHTML = '';

            if (response.length === 0) {
                flightAssignments.innerHTML = `
                    <div class="text-center py-4 text-gray-500">
                        No active flight assignments
                    </div>
                `;
                return;
            }

            // Add each assignment
            response.forEach(assignment => {
                const assignmentElement = createFlightAssignmentElement(assignment);
                flightAssignments.appendChild(assignmentElement);
            });
        } catch (error) {
            console.error('Error loading flight assignments:', error);
            utils.showNotification('Failed to load flight assignments', 'error');
        }
    }

    // Create flight assignment element
    function createFlightAssignmentElement(assignment) {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-lg';
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-lg font-medium text-gray-900">Flight ${assignment.flightNumber}</h4>
                    <p class="text-sm text-gray-500">${assignment.departure} → ${assignment.arrival}</p>
                </div>
                <span class="px-2 py-1 text-sm font-medium rounded-full ${
                    assignment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    assignment.status === 'boarding' ? 'bg-yellow-100 text-yellow-800' :
                    assignment.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                }">
                    ${utils.formatFlightStatus(assignment.status)}
                </span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">Departure</p>
                    <p class="text-sm font-medium text-gray-900">${utils.formatDate(assignment.departureTime)}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Arrival</p>
                    <p class="text-sm font-medium text-gray-900">${utils.formatDate(assignment.arrivalTime)}</p>
                </div>
            </div>
            <div class="mt-4">
                <button onclick="startFlight('${assignment.id}')" class="w-full bg-indigo-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Start Flight
                </button>
            </div>
        `;
        return div;
    }

    // Load activity log
    async function loadActivityLog() {
        try {
            const response = await utils.fetchAPI('/api/pilot/activity-log');
            
            // Clear existing log entries
            activityLog.innerHTML = '';

            if (response.length === 0) {
                activityLog.innerHTML = `
                    <div class="text-center py-4 text-gray-500">
                        No activity recorded yet
                    </div>
                `;
                return;
            }

            // Add each log entry
            response.forEach(entry => {
                const logElement = createLogEntryElement(entry);
                activityLog.appendChild(logElement);
            });
        } catch (error) {
            console.error('Error loading activity log:', error);
            utils.showNotification('Failed to load activity log', 'error');
        }
    }

    // Create log entry element
    function createLogEntryElement(entry) {
        const div = document.createElement('div');
        div.className = 'flex items-start space-x-3';
        div.innerHTML = `
            <div class="flex-shrink-0">
                <div class="h-8 w-8 rounded-full bg-indigo-primary flex items-center justify-center">
                    <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${entry.type === 'flight_completed' ? `
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        ` : `
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        `}
                    </svg>
                </div>
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900">${entry.description}</p>
                <p class="text-sm text-gray-500">${utils.formatDate(entry.timestamp)}</p>
            </div>
        `;
        return div;
    }

    // Handle flight plan form submission
    if (flightPlanForm) {
        flightPlanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = utils.serializeForm(flightPlanForm);
                
                // Validate form data
                if (formData.departure === formData.arrival) {
                    utils.showNotification('Departure and arrival airports cannot be the same', 'error');
                    return;
                }

                const response = await utils.fetchAPI('/api/pilot/flight-plan', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });

                if (response.success) {
                    utils.showNotification('Flight plan submitted successfully', 'success');
                    flightPlanForm.reset();
                    await loadFlightAssignments();
                } else {
                    throw new Error(response.message || 'Failed to submit flight plan');
                }
            } catch (error) {
                console.error('Error submitting flight plan:', error);
                utils.showNotification(error.message || 'Failed to submit flight plan', 'error');
            }
        });
    }

    // Handle voice channel
    if (joinVoiceBtn) {
        let isConnected = false;

        joinVoiceBtn.addEventListener('click', async () => {
            try {
                if (!isConnected) {
                    const frequency = document.getElementById('frequency').value;
                    await utils.fetchAPI('/api/atc/voice/join', {
                        method: 'POST',
                        body: JSON.stringify({ frequency })
                    });
                    
                    joinVoiceBtn.textContent = 'Leave Channel';
                    joinVoiceBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    joinVoiceBtn.classList.add('bg-red-600', 'hover:bg-red-700');
                    isConnected = true;
                    
                    utils.showNotification(`Connected to ${frequency} frequency`, 'success');
                } else {
                    await utils.fetchAPI('/api/atc/voice/leave', {
                        method: 'POST'
                    });
                    
                    joinVoiceBtn.textContent = 'Join Channel';
                    joinVoiceBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                    joinVoiceBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                    isConnected = false;
                    
                    utils.showNotification('Disconnected from voice channel', 'success');
                }
            } catch (error) {
                console.error('Error toggling voice channel:', error);
                utils.showNotification('Failed to toggle voice channel', 'error');
            }
        });
    }

    // Start flight
    window.startFlight = async (flightId) => {
        try {
            const response = await utils.fetchAPI(`/api/pilot/start-flight/${flightId}`, {
                method: 'POST'
            });

            if (response.success) {
                utils.showNotification('Flight started successfully', 'success');
                await loadFlightAssignments();
            } else {
                throw new Error(response.message || 'Failed to start flight');
            }
        } catch (error) {
            console.error('Error starting flight:', error);
            utils.showNotification(error.message || 'Failed to start flight', 'error');
        }
    };

    // Initialize dashboard when auth state changes
    auth.onAuthStateChanged = initDashboard;

    // Initial load if already authenticated
    if (auth.isAuthenticated) {
        initDashboard();
    }
});
