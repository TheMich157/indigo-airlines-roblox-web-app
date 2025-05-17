// Utility functions for the application
const utils = {
    // API request helper
    async fetchAPI(endpoint, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Include cookies for authentication
            };

            const response = await fetch(endpoint, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Format date to locale string
    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format flight number
    formatFlightNumber(number) {
        return `6E${String(number).padStart(3, '0')}`;
    },

    // Format currency (INR)
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500' :
            type === 'success' ? 'bg-green-500' :
            'bg-blue-500'
        } text-white transform transition-transform duration-300 ease-in-out`;

        // Add icon based on type
        const icon = document.createElement('span');
        icon.className = 'mr-2';
        icon.innerHTML = type === 'error' ? '❌' : 
                        type === 'success' ? '✅' : 'ℹ️';
        notification.appendChild(icon);

        // Add message
        const text = document.createElement('span');
        text.textContent = message;
        notification.appendChild(text);

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateY(0)';
        });

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateY(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    },

    // Form validation
    validateForm(formElement) {
        let isValid = true;
        const requiredFields = formElement.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('border-red-500');
                
                const errorMessage = field.getAttribute('data-error') || 'This field is required';
                let errorElement = field.nextElementSibling;
                
                if (!errorElement || !errorElement.classList.contains('error-message')) {
                    errorElement = document.createElement('p');
                    errorElement.className = 'error-message text-red-500 text-sm mt-1';
                    field.parentNode.insertBefore(errorElement, field.nextSibling);
                }
                
                errorElement.textContent = errorMessage;
            } else {
                field.classList.remove('border-red-500');
                const errorElement = field.nextElementSibling;
                if (errorElement && errorElement.classList.contains('error-message')) {
                    errorElement.remove();
                }
            }
        });

        return isValid;
    },

    // Generate seat label (e.g., 1A, 12F)
    generateSeatLabel(row, column) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        return `${row}${letters[column]}`;
    },

    // Check if a seat is in business class section
    isBusinessClassSeat(seatNumber) {
        const row = parseInt(seatNumber.match(/\d+/)[0]);
        return row <= 2; // Rows 1-2 are business class
    },

    // Format time duration
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    },

    // Format flight status
    formatFlightStatus(status) {
        const statusMap = {
            'scheduled': 'Scheduled',
            'boarding': 'Boarding',
            'departed': 'Departed',
            'arrived': 'Arrived',
            'delayed': 'Delayed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status.toLowerCase()] || status;
    },

    // Debounce function for search inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy text:', err);
            this.showNotification('Failed to copy text', 'error');
        }
    },

    // Parse URL parameters
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }
};

// Export utils for use in other modules
window.utils = utils;
