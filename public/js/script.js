// Main site functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth state
    auth.onAuthStateChanged = updateNavigation;

    // Update navigation based on auth state
    function updateNavigation() {
        const loginBtn = document.getElementById('loginBtn');
        
        if (auth.isAuthenticated) {
            // Update login button
            loginBtn.textContent = 'Logout';
            loginBtn.addEventListener('click', auth.logout);

            // Show/hide role-specific navigation
            if (auth.isATC()) {
                showElement('atc-dashboard');
            }
            if (auth.isPilot()) {
                showElement('pilot-dashboard');
            }
            if (auth.isSupervisor()) {
                showElement('admin-dashboard');
            }
        } else {
            // Reset login button
            loginBtn.textContent = 'Login with Roblox';
            loginBtn.addEventListener('click', auth.login);

            // Hide role-specific navigation
            hideElement('atc-dashboard');
            hideElement('pilot-dashboard');
            hideElement('admin-dashboard');
        }
    }

    // Helper function to show element
    function showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    // Helper function to hide element
    function hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    }

    // Handle social links
    const discordLink = document.getElementById('discordLink');
    const robloxLink = document.getElementById('robloxLink');

    if (discordLink) {
        discordLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(config.socialLinks.discord, '_blank');
        });
    }

    if (robloxLink) {
        robloxLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(config.socialLinks.robloxGroup, '_blank');
        });
    }

    // Handle navigation highlighting
    function updateActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a');

        navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            if (currentPath === linkPath) {
                link.classList.remove('border-transparent', 'text-gray-500', 'hover:border-gray-300', 'hover:text-gray-700');
                link.classList.add('border-indigo-primary', 'text-gray-900');
            } else {
                link.classList.remove('border-indigo-primary', 'text-gray-900');
                link.classList.add('border-transparent', 'text-gray-500', 'hover:border-gray-300', 'hover:text-gray-700');
            }
        });
    }

    // Update active navigation link on page load
    updateActiveNavLink();

    // Handle mobile menu toggle
    const mobileMenuBtn = document.querySelector('[aria-controls="mobile-menu"]');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const expanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            mobileMenuBtn.setAttribute('aria-expanded', !expanded);
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Handle smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Handle form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!form.hasAttribute('data-no-prevent')) {
                e.preventDefault();
            }
        });
    });

    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', (e) => {
            const content = e.target.getAttribute('data-tooltip');
            if (!content) return;

            const tooltipElement = document.createElement('div');
            tooltipElement.className = 'absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded-md opacity-0 transition-opacity duration-200';
            tooltipElement.textContent = content;
            tooltipElement.style.bottom = '100%';
            tooltipElement.style.left = '50%';
            tooltipElement.style.transform = 'translateX(-50%)';
            
            e.target.appendChild(tooltipElement);
            requestAnimationFrame(() => tooltipElement.classList.add('opacity-100'));
        });

        tooltip.addEventListener('mouseleave', (e) => {
            const tooltipElement = e.target.querySelector('.opacity-100');
            if (tooltipElement) {
                tooltipElement.classList.remove('opacity-100');
                setTimeout(() => tooltipElement.remove(), 200);
            }
        });
    });

    // Handle dynamic content loading
    async function loadDynamicContent() {
        try {
            // Load announcements if they exist
            const announcementsContainer = document.getElementById('announcements');
            if (announcementsContainer) {
                const announcements = await utils.fetchAPI('/api/announcements');
                displayAnnouncements(announcements);
            }

            // Load featured flights if they exist
            const featuredFlightsContainer = document.getElementById('featuredFlights');
            if (featuredFlightsContainer) {
                const flights = await utils.fetchAPI('/api/flights/featured');
                displayFeaturedFlights(flights);
            }
        } catch (error) {
            console.error('Error loading dynamic content:', error);
        }
    }

    // Display announcements
    function displayAnnouncements(announcements) {
        const container = document.getElementById('announcements');
        if (!container || !announcements.length) return;

        container.innerHTML = announcements.map(announcement => `
            <div class="bg-white shadow rounded-lg p-4 mb-4">
                <h3 class="text-lg font-medium text-gray-900">${announcement.title}</h3>
                <p class="mt-2 text-gray-500">${announcement.content}</p>
                <p class="mt-2 text-sm text-gray-400">${utils.formatDate(announcement.date)}</p>
            </div>
        `).join('');
    }

    // Display featured flights
    function displayFeaturedFlights(flights) {
        const container = document.getElementById('featuredFlights');
        if (!container || !flights.length) return;

        container.innerHTML = flights.map(flight => `
            <div class="bg-white shadow rounded-lg p-4 mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">${flight.flightNumber}</h3>
                        <p class="text-gray-500">${flight.departure} → ${flight.arrival}</p>
                        <p class="text-sm text-gray-400">${utils.formatDate(flight.departureTime)}</p>
                    </div>
                    <a href="/booking.html?flight=${flight.id}" class="bg-indigo-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-secondary">
                        Book Now
                    </a>
                </div>
            </div>
        `).join('');
    }

    // Load dynamic content
    loadDynamicContent();
});
