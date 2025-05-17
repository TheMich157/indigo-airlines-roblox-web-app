// Utility functions for the IndiGo Airlines website

const utils = {
    // Show notification toast
    showNotification: (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    // Format date for display
    formatDate: (dateString) => {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    },

    // Validate form inputs
    validateForm: (form) => {
        let isValid = true;
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.hasAttribute('required') && !input.value.trim()) {
                isValid = false;
                input.classList.add('border-red-500');
                utils.showNotification(`${input.name || 'Field'} is required`, 'error');
            } else {
                input.classList.remove('border-red-500');
            }
        });

        return isValid;
    },

    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    },

    // Generate seat map
    generateSeatMap: (aircraft) => {
        const seatConfig = {
            'A320': {
                rows: 30,
                businessRows: 3,
                seatsPerRow: 6
            },
            'A330': {
                rows: 40,
                businessRows: 5,
                seatsPerRow: 8
            }
        };

        const config = seatConfig[aircraft];
        if (!config) return null;

        const seatMap = [];
        for (let row = 1; row <= config.rows; row++) {
            const seatRow = [];
            for (let seat = 0; seat < config.seatsPerRow; seat++) {
                const seatLetter = String.fromCharCode(65 + seat);
                const seatNumber = `${row}${seatLetter}`;
                const isBusinessClass = row <= config.businessRows;
                seatRow.push({
                    number: seatNumber,
                    class: isBusinessClass ? 'business' : 'economy'
                });
            }
            seatMap.push(seatRow);
        }

        return seatMap;
    },

    // Handle API errors
    handleApiError: (error) => {
        console.error('API Error:', error);
        if (error.response) {
            utils.showNotification(error.response.data.message || 'An error occurred', 'error');
        } else if (error.request) {
            utils.showNotification('Network error. Please check your connection.', 'error');
        } else {
            utils.showNotification('An unexpected error occurred.', 'error');
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    // Get user role
    getUserRole: () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.role;
    },

    // Format flight duration
    formatDuration: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    },

    // Calculate flight progress
    calculateFlightProgress: (departure, arrival) => {
        const now = new Date().getTime();
        const start = new Date(departure).getTime();
        const end = new Date(arrival).getTime();
        const duration = end - start;
        const elapsed = now - start;
        
        return Math.min(100, Math.max(0, Math.floor((elapsed / duration) * 100)));
    },

    // Format flight status with appropriate color
    formatFlightStatus: (status) => {
        const statusColors = {
            'Scheduled': 'status-scheduled',
            'In Progress': 'status-in-progress',
            'Completed': 'status-completed',
            'Delayed': 'status-delayed'
        };

        return {
            text: status,
            class: statusColors[status] || ''
        };
    },

    // Initialize voice channel
    initVoiceChannel: (frequency) => {
        // TODO: Implement actual voice channel connection
        utils.showNotification(`Connected to frequency ${frequency}`, 'success');
    },

    // Format coordinates for map display
    formatCoordinates: (lat, lon) => {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `${Math.abs(lat)}°${latDir} ${Math.abs(lon)}°${lonDir}`;
    }
};

// Export utils for use in other files
window.utils = utils;
