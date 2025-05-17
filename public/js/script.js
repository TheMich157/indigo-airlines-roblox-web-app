// Main site functionality
document.addEventListener('DOMContentLoaded', () => {
    // App state management
    const appState = {
        currentTheme: localStorage.getItem('theme') || 'light',
        notifications: [],
        lastUpdate: null,
        isOnline: navigator.onLine
    };

    // Initialize application
    async function initializeApp() {
        try {
            // Set up auth state change handler
            auth.onAuthStateChanged = handleAuthStateChange;

            // Initialize theme
            initializeTheme();

            // Set up event listeners
            setupEventListeners();

            // Initialize real-time updates
            initializeRealtimeUpdates();

            // Check for app updates
            await checkForUpdates();

            // Load initial data
            await loadInitialData();

        } catch (error) {
            console.error('Error initializing app:', error);
            handleAppError(error);
        }
    }

    // Handle auth state changes
    async function handleAuthStateChange() {
        try {
            const loginBtn = document.getElementById('loginBtn');
            if (!loginBtn) return;

            clearAuthListeners(loginBtn);
            
            if (auth.isAuthenticated) {
                await handleAuthenticatedState(loginBtn);
            } else {
                await handleUnauthenticatedState(loginBtn);
            }

            updateNavigationVisibility();
            await refreshDynamicContent();

        } catch (error) {
            console.error('Error handling auth state change:', error);
            handleAppError(error);
        }
    }

    // Handle authenticated state
    async function handleAuthenticatedState(loginBtn) {
        loginBtn.textContent = 'Logout';
        loginBtn.addEventListener('click', handleLogout);

        // Update user profile
        await updateUserProfile();

        // Initialize notifications
        initializeNotifications();

        // Track authentication
        utils.analytics.track('user_session_start', {
            userId: auth.userInfo.id,
            timestamp: new Date()
        });
    }

    // Handle unauthenticated state
    async function handleUnauthenticatedState(loginBtn) {
        loginBtn.textContent = 'Login with Roblox';
        loginBtn.addEventListener('click', handleLogin);

        // Clear user-specific data
        clearUserData();
    }

    // Update navigation visibility
    function updateNavigationVisibility() {
        const navElements = {
            'atc-dashboard': auth.isATC(),
            'pilot-dashboard': auth.isPilot(),
            'admin-dashboard': auth.isSupervisor(),
            'user-profile': auth.isAuthenticated
        };

        Object.entries(navElements).forEach(([id, shouldShow]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('hidden', !shouldShow);
            }
        });
    }

    // Initialize theme
    function initializeTheme() {
        document.documentElement.classList.toggle('dark', appState.currentTheme === 'dark');
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
    }

    // Toggle theme
    function toggleTheme() {
        appState.currentTheme = appState.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', appState.currentTheme);
        document.documentElement.classList.toggle('dark');
        
        utils.analytics.track('theme_changed', {
            theme: appState.currentTheme
        });
    }

    // Set up event listeners
    function setupEventListeners() {
        // Network status
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Mobile menu
        setupMobileMenu();

        // Navigation
        setupNavigation();

        // Forms
        setupForms();

        // Tooltips
        setupTooltips();

        // Error boundary
        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    // Initialize real-time updates
    function initializeRealtimeUpdates() {
        const socket = io(config.socket.url, config.socket.options);

        socket.on('connect', () => {
            appState.isOnline = true;
            updateConnectionStatus();
        });

        socket.on('disconnect', () => {
            appState.isOnline = false;
            updateConnectionStatus();
        });

        socket.on('announcement', handleAnnouncement);
        socket.on('flight_update', handleFlightUpdate);
        socket.on('maintenance_alert', handleMaintenanceAlert);
    }

    // Handle social links with tracking
    function setupSocialLinks() {
        const socialLinks = {
            'discordLink': config.socialLinks.discord,
            'robloxLink': config.socialLinks.robloxGroup
        };

        Object.entries(socialLinks).forEach(([id, url]) => {
            const link = document.getElementById(id);
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    utils.analytics.track('social_link_click', { platform: id });
                    window.open(url, '_blank', 'noopener,noreferrer');
                });
            }
        });
    }

    // Setup navigation with active link tracking
    function setupNavigation() {
        const navLinks = document.querySelectorAll('nav a');
        const currentPath = window.location.pathname;

        navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            const isActive = currentPath === linkPath;

            // Update classes
            link.classList.toggle('border-indigo-primary', isActive);
            link.classList.toggle('text-gray-900', isActive);
            link.classList.toggle('border-transparent', !isActive);
            link.classList.toggle('text-gray-500', !isActive);

            // Add click tracking
            link.addEventListener('click', () => {
                utils.analytics.track('navigation_click', {
                    path: linkPath,
                    from: currentPath
                });
            });
        });
    }

    // Update active navigation link on page load
    updateActiveNavLink();

    // Setup mobile menu with animation
    function setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('[aria-controls="mobile-menu"]');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);

                // Animate menu
                if (!isExpanded) {
                    mobileMenu.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        mobileMenu.classList.add('opacity-100', 'translate-y-0');
                        mobileMenu.classList.remove('opacity-0', '-translate-y-2');
                    });
                } else {
                    mobileMenu.classList.add('opacity-0', '-translate-y-2');
                    mobileMenu.classList.remove('opacity-100', 'translate-y-0');
                    setTimeout(() => mobileMenu.classList.add('hidden'), 300);
                }
            });
        }
    }

    // Setup smooth scrolling with progress tracking
    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', e => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const start = window.pageYOffset;
                    const end = targetElement.getBoundingClientRect().top + start;
                    const startTime = performance.now();
                    
                    function animate(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / 800, 1); // 800ms duration
                        
                        window.scrollTo(0, start + (end - start) * easeInOutCubic(progress));
                        
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        } else {
                            utils.analytics.track('smooth_scroll', {
                                targetId,
                                scrollDistance: end - start
                            });
                        }
                    }
                    
                    requestAnimationFrame(animate);
                }
            });
        });
    }

    // Easing function
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Setup forms with validation and analytics
    function setupForms() {
        document.querySelectorAll('form').forEach(form => {
            if (form.hasAttribute('data-no-prevent')) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formId = form.id || 'unknown_form';
                const startTime = performance.now();

                try {
                    // Validate form
                    const { isValid, errors } = utils.validation.validateAll(
                        utils.serializeForm(form),
                        getFormValidationRules(form)
                    );

                    if (!isValid) {
                        displayFormErrors(form, errors);
                        return;
                    }

                    // Show loading state
                    toggleFormLoading(form, true);

                    // Submit form
                    await submitForm(form);

                    // Track success
                    utils.analytics.track('form_submit_success', {
                        formId,
                        duration: performance.now() - startTime
                    });

                } catch (error) {
                    console.error('Form submission error:', error);
                    handleFormError(form, error);

                    // Track error
                    utils.analytics.track('form_submit_error', {
                        formId,
                        error: error.message
                    });

                } finally {
                    toggleFormLoading(form, false);
                }
            });
        });
    }

    // Setup tooltips with positioning and accessibility
    function setupTooltips() {
        const tooltips = document.querySelectorAll('[data-tooltip]');
        
        tooltips.forEach(tooltip => {
            // Add ARIA attributes
            tooltip.setAttribute('role', 'tooltip');
            tooltip.setAttribute('tabindex', '0');

            const showTooltip = (e) => {
                const content = tooltip.getAttribute('data-tooltip');
                if (!content) return;

                const tooltipElement = createTooltipElement(content);
                positionTooltip(tooltipElement, tooltip);
                
                tooltip.appendChild(tooltipElement);
                requestAnimationFrame(() => tooltipElement.classList.add('opacity-100'));

                // Track tooltip display
                utils.analytics.track('tooltip_shown', {
                    content,
                    trigger: e.type
                });
            };

            const hideTooltip = () => {
                const tooltipElement = tooltip.querySelector('.tooltip-content');
                if (tooltipElement) {
                    tooltipElement.classList.remove('opacity-100');
                    setTimeout(() => tooltipElement.remove(), 200);
                }
            };

            // Mouse events
            tooltip.addEventListener('mouseenter', showTooltip);
            tooltip.addEventListener('mouseleave', hideTooltip);

            // Keyboard events
            tooltip.addEventListener('focus', showTooltip);
            tooltip.addEventListener('blur', hideTooltip);
        });
    }

    // Create tooltip element
    function createTooltipElement(content) {
        const element = document.createElement('div');
        element.className = 'tooltip-content absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded-md opacity-0 transition-opacity duration-200';
        element.textContent = content;
        return element;
    }

    // Position tooltip
    function positionTooltip(tooltipElement, targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        tooltipElement.style.bottom = '100%';
        tooltipElement.style.left = '50%';
        tooltipElement.style.transform = 'translateX(-50%)';

        // Adjust position if tooltip would go off screen
        requestAnimationFrame(() => {
            const tooltipRect = tooltipElement.getBoundingClientRect();
            
            if (tooltipRect.left < 0) {
                tooltipElement.style.left = '0';
                tooltipElement.style.transform = 'none';
            } else if (tooltipRect.right > window.innerWidth) {
                tooltipElement.style.left = 'auto';
                tooltipElement.style.right = '0';
                tooltipElement.style.transform = 'none';
            }

            if (tooltipRect.top < 0) {
                tooltipElement.style.bottom = 'auto';
                tooltipElement.style.top = '100%';
            }
        });
    }

    // Load dynamic content with caching and error handling
    async function loadDynamicContent() {
        const containers = {
            announcements: {
                id: 'announcements',
                endpoint: '/api/announcements',
                display: displayAnnouncements,
                cacheTime: 300000 // 5 minutes
            },
            featuredFlights: {
                id: 'featuredFlights',
                endpoint: '/api/flights/featured',
                display: displayFeaturedFlights,
                cacheTime: 60000 // 1 minute
            }
        };

        try {
            await Promise.all(Object.values(containers).map(async container => {
                const element = document.getElementById(container.id);
                if (!element) return;

                try {
                    const data = await utils.cache.get(
                        container.endpoint,
                        () => utils.fetchAPI(container.endpoint),
                        container.cacheTime
                    );

                    container.display(data, element);

                } catch (error) {
                    console.error(`Error loading ${container.id}:`, error);
                    displayErrorState(element, error);
                }
            }));

        } catch (error) {
            console.error('Error loading dynamic content:', error);
            handleAppError(error);
        }
    }

    // Display announcements with animations and interaction tracking
    function displayAnnouncements(announcements, container) {
        if (!announcements.length) {
            container.innerHTML = '<p class="text-gray-500 text-center">No announcements at this time.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        announcements.forEach((announcement, index) => {
            const element = document.createElement('div');
            element.className = 'bg-white shadow rounded-lg p-4 mb-4 opacity-0 transform translate-y-4 transition-all duration-500';
            element.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">${announcement.title}</h3>
                        <p class="mt-2 text-gray-500">${announcement.content}</p>
                        <p class="mt-2 text-sm text-gray-400">${utils.formatDate(announcement.date)}</p>
                    </div>
                    ${announcement.action ? `
                        <button class="announcement-action px-4 py-2 bg-indigo-primary text-white rounded-md hover:bg-indigo-secondary"
                                data-announcement-id="${announcement.id}">
                            ${announcement.action.label}
                        </button>
                    ` : ''}
                </div>
            `;

            // Add click tracking
            if (announcement.action) {
                const actionButton = element.querySelector('.announcement-action');
                actionButton.addEventListener('click', () => {
                    utils.analytics.track('announcement_action_click', {
                        announcementId: announcement.id,
                        action: announcement.action.type
                    });
                    handleAnnouncementAction(announcement);
                });
            }

            fragment.appendChild(element);
        });

        container.innerHTML = '';
        container.appendChild(fragment);

        // Animate announcements in
        requestAnimationFrame(() => {
            container.querySelectorAll('.opacity-0').forEach((el, i) => {
                setTimeout(() => {
                    el.classList.remove('opacity-0', 'translate-y-4');
                }, i * 100);
            });
        });
    }

    // Display featured flights with real-time updates
    function displayFeaturedFlights(flights, container) {
        if (!flights.length) {
            container.innerHTML = '<p class="text-gray-500 text-center">No featured flights available.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        flights.forEach(flight => {
            const element = document.createElement('div');
            element.className = 'bg-white shadow rounded-lg p-4 mb-4 transform transition-all duration-300';
            element.setAttribute('data-flight-id', flight.id);
            
            updateFlightElement(element, flight);
            fragment.appendChild(element);

            // Add hover effect
            element.addEventListener('mouseenter', () => {
                element.classList.add('scale-102', 'shadow-lg');
            });
            element.addEventListener('mouseleave', () => {
                element.classList.remove('scale-102', 'shadow-lg');
            });
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    // Update flight element with real-time data
    function updateFlightElement(element, flight) {
        const status = getFlightStatus(flight);
        element.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-medium text-gray-900">${flight.flightNumber}</h3>
                    <div class="flex items-center space-x-2">
                        <p class="text-gray-500">${flight.departure} → ${flight.arrival}</p>
                        <span class="px-2 py-1 text-xs rounded-full ${status.colorClass}">
                            ${status.label}
                        </span>
                    </div>
                    <p class="text-sm text-gray-400">${utils.formatDate(flight.departureTime)}</p>
                    ${flight.seatsAvailable ? `
                        <p class="text-sm text-green-600">${flight.seatsAvailable} seats available</p>
                    ` : ''}
                </div>
                <a href="/booking.html?flight=${flight.id}" 
                   class="book-flight-btn bg-indigo-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-secondary transition-colors duration-200"
                   data-flight-id="${flight.id}">
                    Book Now
                </a>
            </div>
        `;

        // Add click tracking
        const bookButton = element.querySelector('.book-flight-btn');
        bookButton.addEventListener('click', (e) => {
            utils.analytics.track('flight_booking_click', {
                flightId: flight.id,
                flightNumber: flight.flightNumber
            });
        });
    }

    // Get flight status with color coding
    function getFlightStatus(flight) {
        const statusMap = {
            'scheduled': { label: 'Scheduled', colorClass: 'bg-blue-100 text-blue-800' },
            'boarding': { label: 'Boarding', colorClass: 'bg-green-100 text-green-800' },
            'departed': { label: 'Departed', colorClass: 'bg-gray-100 text-gray-800' },
            'delayed': { label: 'Delayed', colorClass: 'bg-yellow-100 text-yellow-800' },
            'cancelled': { label: 'Cancelled', colorClass: 'bg-red-100 text-red-800' }
        };

        return statusMap[flight.status] || statusMap.scheduled;
    }

    // Initialize application
    initializeApp();
});
