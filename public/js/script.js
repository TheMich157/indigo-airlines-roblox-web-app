// Common functionality and utilities
document.addEventListener('DOMContentLoaded', () => {
    // Constants for links
    const DISCORD_LINK = '<discordlink>';
    const ROBLOX_LINK = '<robloxlink>';

    // Set up Discord links
    const discordLinks = [
        document.getElementById('discordLink'),
        document.getElementById('footerDiscordLink')
    ];
    
    discordLinks.forEach(link => {
        if (link) {
            link.href = DISCORD_LINK;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    });

    // Set up Roblox links
    const robloxLinks = [
        document.getElementById('robloxLink'),
        document.getElementById('footerRobloxLink')
    ];
    
    robloxLinks.forEach(link => {
        if (link) {
            link.href = ROBLOX_LINK;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    });

    // Handle authentication status updates
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        // Check if user is already authenticated
        if (window.auth && auth.isAuthenticated) {
            updateLoginButton(true);
        }

        loginBtn.addEventListener('click', async () => {
            try {
                if (!window.auth) {
                    console.error('Auth module not loaded');
                    return;
                }

                if (auth.isAuthenticated) {
                    await auth.logout();
                    updateLoginButton(false);
                } else {
                    await auth.login();
                    updateLoginButton(true);
                }
            } catch (error) {
                console.error('Authentication error:', error);
                utils.showNotification('Authentication failed. Please try again.', 'error');
            }
        });
    }

    // Update login button text and style based on auth status
    function updateLoginButton(isAuthenticated) {
        if (!loginBtn) return;
        
        if (isAuthenticated) {
            loginBtn.textContent = 'Logout';
            loginBtn.classList.add('bg-gray-500');
            loginBtn.classList.remove('bg-indigo-primary');
        } else {
            loginBtn.textContent = 'Login with Roblox';
            loginBtn.classList.add('bg-indigo-primary');
            loginBtn.classList.remove('bg-gray-500');
        }
    }

    // Initialize smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Mobile menu toggle functionality
    const mobileMenuButton = document.querySelector('[aria-controls="mobile-menu"]');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
            mobileMenuButton.setAttribute('aria-expanded', !expanded);
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Handle navigation active states
    const currentPath = window.location.pathname;
    document.querySelectorAll('nav a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('border-indigo-primary', 'text-gray-900');
            link.classList.remove('border-transparent', 'text-gray-500');
        }
    });

    // Initialize tooltips if any
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', (e) => {
            const tip = document.createElement('div');
            tip.className = 'tooltip absolute bg-gray-900 text-white px-2 py-1 text-sm rounded-md';
            tip.textContent = e.target.getAttribute('data-tooltip');
            document.body.appendChild(tip);

            const rect = e.target.getBoundingClientRect();
            tip.style.top = `${rect.bottom + 5}px`;
            tip.style.left = `${rect.left + (rect.width - tip.offsetWidth) / 2}px`;
        });

        tooltip.addEventListener('mouseleave', () => {
            const tips = document.querySelectorAll('.tooltip');
            tips.forEach(tip => tip.remove());
        });
    });
});

// Utility functions
const utils = {
    // Format date to locale string
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${
            type === 'error' ? 'bg-red-500' :
            type === 'success' ? 'bg-green-500' :
            'bg-blue-500'
        } text-white`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Validate required form fields
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
    }
};

// Export utils for use in other modules
window.utils = utils;
