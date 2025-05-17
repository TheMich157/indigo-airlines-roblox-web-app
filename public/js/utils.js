// Utility functions
const utils = {
    // API request helper
    async fetchAPI(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for session management
        };

        try {
            const response = await fetch(endpoint, {
                ...defaultOptions,
                ...options
            });

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

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `
            fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg
            transform transition-transform duration-300 ease-in-out
            ${type === 'success' ? 'bg-green-500' :
              type === 'error' ? 'bg-red-500' :
              type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'}
            text-white
        `;

        // Add icon based on type
        const icon = document.createElement('span');
        icon.className = 'mr-2';
        icon.innerHTML = type === 'success' ? '✓' :
                        type === 'error' ? '✕' :
                        type === 'warning' ? '⚠' : 'ℹ';
        notification.appendChild(icon);

        // Add message
        const text = document.createTextNode(message);
        notification.appendChild(text);

        // Add to document
        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    },

    // Format date
    formatDate(date) {
        if (!date) return '';
        
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        return new Date(date).toLocaleDateString('en-US', options);
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

        return statusMap[status] || status;
    },

    // Format flight duration
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    },

    // Validate form inputs
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input, select, textarea');
        let isValid = true;
        const errors = {};

        inputs.forEach(input => {
            if (input.hasAttribute('required') && !input.value) {
                isValid = false;
                errors[input.name] = 'This field is required';
                this.showInputError(input, 'This field is required');
            } else {
                this.clearInputError(input);
            }
        });

        return { isValid, errors };
    },

    // Show input error
    showInputError(inputElement, message) {
        // Remove existing error
        this.clearInputError(inputElement);

        // Add error classes
        inputElement.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');

        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-500 text-sm mt-1';
        errorDiv.textContent = message;

        // Insert after input
        inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    },

    // Clear input error
    clearInputError(inputElement) {
        // Remove error classes
        inputElement.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');

        // Remove error message
        const errorDiv = inputElement.nextElementSibling;
        if (errorDiv?.classList.contains('text-red-500')) {
            errorDiv.remove();
        }
    },

    // Debounce function
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

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard', 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    },

    // Generate random ID
    generateId(length = 8) {
        return Array.from(crypto.getRandomValues(new Uint8Array(length)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Parse URL parameters
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    // Set URL parameters
    setUrlParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        window.history.pushState({}, '', url);
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Check if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // Load script dynamically with retry
    loadScript(src, retries = 3, delay = 1000) {
        return new Promise(async (resolve, reject) => {
            let attempts = 0;
            
            const attemptLoad = async () => {
                try {
                    const script = document.createElement('script');
                    script.src = src;
                    
                    const loadPromise = new Promise((res, rej) => {
                        script.onload = res;
                        script.onerror = rej;
                    });
                    
                    document.head.appendChild(script);
                    await loadPromise;
                    resolve();
                } catch (error) {
                    attempts++;
                    if (attempts < retries) {
                        await new Promise(r => setTimeout(r, delay));
                        return attemptLoad();
                    }
                    reject(error);
                }
            };
            
            attemptLoad();
        });
    },

    // Cache management
    cache: {
        data: new Map(),
        maxAge: 5 * 60 * 1000, // 5 minutes default

        async get(key, fetchFn, maxAge) {
            const cached = this.data.get(key);
            if (cached && Date.now() - cached.timestamp < (maxAge || this.maxAge)) {
                return cached.value;
            }

            const value = await fetchFn();
            this.data.set(key, {
                value,
                timestamp: Date.now()
            });
            return value;
        },

        clear(key) {
            if (key) {
                this.data.delete(key);
            } else {
                this.data.clear();
            }
        }
    },

    // Error handling with retry
    async retryOperation(operation, retries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < retries - 1) {
                    await new Promise(r => setTimeout(r, delay * Math.pow(2, i))); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    },

    // Form data serialization
    serializeForm(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },

    // Enhanced validation
    validation: {
        patterns: {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^\+?[\d\s-]{8,}$/,
            flightNumber: /^[A-Z\d]{2,3}\d{1,4}$/,
            date: /^\d{4}-\d{2}-\d{2}$/,
            time: /^([01]\d|2[0-3]):([0-5]\d)$/
        },

        validate(value, type) {
            if (!value) return false;
            return this.patterns[type].test(value);
        },

        validateAll(data, rules) {
            const errors = {};
            
            for (const [field, rule] of Object.entries(rules)) {
                if (rule.required && !data[field]) {
                    errors[field] = 'This field is required';
                    continue;
                }

                if (data[field] && rule.pattern && !this.validate(data[field], rule.pattern)) {
                    errors[field] = rule.message || `Invalid ${field} format`;
                }

                if (rule.custom) {
                    const customError = rule.custom(data[field], data);
                    if (customError) {
                        errors[field] = customError;
                    }
                }
            }

            return {
                isValid: Object.keys(errors).length === 0,
                errors
            };
        }
    },

    // Date utilities
    dateUtils: {
        addDays(date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        },

        formatRelative(date) {
            const now = new Date();
            const diff = Math.floor((date - now) / 1000);
            
            if (diff < 0) return 'past';
            if (diff < 60) return 'just now';
            if (diff < 3600) return `${Math.floor(diff / 60)}m`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
            return `${Math.floor(diff / 86400)}d`;
        },

        getTimeSlots(start, end, duration) {
            const slots = [];
            let current = new Date(start);
            
            while (current < end) {
                slots.push(new Date(current));
                current = new Date(current.getTime() + duration * 60000);
            }
            
            return slots;
        }
    },

    // Analytics tracking
    analytics: {
        events: [],
        
        track(eventName, data = {}) {
            const event = {
                name: eventName,
                data,
                timestamp: new Date(),
                sessionId: this.getSessionId()
            };
            
            this.events.push(event);
            this.sendToServer(event);
        },
        
        getSessionId() {
            let sessionId = localStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = utils.generateId();
                localStorage.setItem('sessionId', sessionId);
            }
            return sessionId;
        },
        
        async sendToServer(event) {
            try {
                await utils.fetchAPI('/api/analytics', {
                    method: 'POST',
                    body: JSON.stringify(event)
                });
            } catch (error) {
                console.error('Failed to send analytics:', error);
            }
        }
    }
};
