// Admin Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has admin access
    if (!auth.isAuthenticated || !auth.hasRole('supervisor')) {
        window.location.href = '/';
        return;
    }

    // DOM Elements
    const flightCreationTab = document.getElementById('flightCreationTab');
    const flightManagementTab = document.getElementById('flightManagementTab');
    const userManagementTab = document.getElementById('userManagementTab');
    
    const flightCreationSection = document.getElementById('flightCreationSection');
    const flightManagementSection = document.getElementById('flightManagementSection');
    const userManagementSection = document.getElementById('userManagementSection');

    // Tab switching functionality
    function switchTab(tab, section) {
        // Update tab styles
        [flightCreationTab, flightManagementTab, userManagementTab].forEach(t => {
            t.classList.remove('bg-indigo-secondary', 'text-white');
            t.classList.add('text-gray-300', 'hover:bg-indigo-secondary', 'hover:text-white');
        });
        tab.classList.remove('text-gray-300', 'hover:bg-indigo-secondary', 'hover:text-white');
        tab.classList.add('bg-indigo-secondary', 'text-white');

        // Show/hide sections
        [flightCreationSection, flightManagementSection, userManagementSection].forEach(s => {
            s.classList.add('hidden');
        });
        section.classList.remove('hidden');
    }

    // Add tab click handlers
    flightCreationTab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(flightCreationTab, flightCreationSection);
    });

    flightManagementTab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(flightManagementTab, flightManagementSection);
        loadFlights();
    });

    userManagementTab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(userManagementTab, userManagementSection);
        loadUsers();
    });

    // Flight Creation Form Handler
    const flightCreationForm = document.getElementById('flightCreationForm');
    flightCreationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!utils.validateForm(flightCreationForm)) {
            return;
        }

        const formData = {
            flightNumber: document.getElementById('flightNumber').value,
            aircraft: document.getElementById('aircraft').value,
            departure: document.getElementById('departure').value,
            arrival: document.getElementById('arrival').value,
            departureTime: document.getElementById('departureTime').value,
            arrivalTime: document.getElementById('arrivalTime').value,
            captain: document.getElementById('captain').value,
            firstOfficer: document.getElementById('firstOfficer').value
        };

        try {
            await createFlight(formData);
            utils.showNotification('Flight created successfully!', 'success');
            flightCreationForm.reset();
        } catch (error) {
            utils.showNotification('Failed to create flight. Please try again.', 'error');
        }
    });

    // Flight Management Functions
    async function loadFlights() {
        const tableBody = document.getElementById('flightTableBody');
        tableBody.innerHTML = ''; // Clear existing rows

        try {
            const flights = await getFlights();
            flights.forEach(flight => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${flight.flightNumber}</div>
                        <div class="text-sm text-gray-500">${flight.aircraft}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${flight.departure} → ${flight.arrival}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${utils.formatDate(flight.departureTime)}</div>
                        <div class="text-sm text-gray-500">${utils.formatDate(flight.arrivalTime)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            flight.status === 'Scheduled' ? 'bg-green-100 text-green-800' :
                            flight.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }">
                            ${flight.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="editFlight('${flight.id}')" class="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        <button onclick="deleteFlight('${flight.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            utils.showNotification('Failed to load flights', 'error');
        }
    }

    // User Management Functions
    async function loadUsers() {
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = ''; // Clear existing rows

        try {
            const users = await getUsers();
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${user.username}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${user.role}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${user.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="editUser('${user.id}')" class="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        <button onclick="toggleUserStatus('${user.id}')" class="text-yellow-600 hover:text-yellow-900">Toggle Status</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            utils.showNotification('Failed to load users', 'error');
        }
    }

    // API Functions (to be implemented with actual backend)
    async function createFlight(flightData) {
        // TODO: Implement actual API call
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Flight created:', flightData);
                resolve();
            }, 1000);
        });
    }

    async function getFlights() {
        // TODO: Implement actual API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: '1',
                        flightNumber: '6E-123',
                        aircraft: 'A320',
                        departure: 'COK',
                        arrival: 'BOM',
                        departureTime: '2024-02-20T10:00',
                        arrivalTime: '2024-02-20T12:00',
                        status: 'Scheduled'
                    },
                    // Add more mock flights as needed
                ]);
            }, 1000);
        });
    }

    async function getUsers() {
        // TODO: Implement actual API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: '1',
                        username: 'JohnDoe',
                        role: 'Pilot',
                        status: 'Active'
                    },
                    // Add more mock users as needed
                ]);
            }, 1000);
        });
    }

    // Initialize dashboard
    switchTab(flightCreationTab, flightCreationSection);
});

// Global functions for table actions
window.editFlight = function(flightId) {
    // TODO: Implement flight editing
    console.log('Editing flight:', flightId);
};

window.deleteFlight = function(flightId) {
    if (confirm('Are you sure you want to delete this flight?')) {
        // TODO: Implement flight deletion
        console.log('Deleting flight:', flightId);
    }
};

window.editUser = function(userId) {
    // TODO: Implement user editing
    console.log('Editing user:', userId);
};

window.toggleUserStatus = function(userId) {
    // TODO: Implement user status toggle
    console.log('Toggling user status:', userId);
};
