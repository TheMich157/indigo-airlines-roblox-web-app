// Authentication and user management
const auth = {
    // User state
    isAuthenticated: false,
    userInfo: null,
    onAuthStateChanged: null,

    // Session management
    session: {
        refreshToken: null,
        lastActivity: null,
        expiresAt: null,
        refreshInterval: null
    },

    // Initialize auth with enhanced security
    async init() {
        try {
            // Set up session refresh interval
            this.startSessionRefresh();

            // Set up activity monitoring
            this.setupActivityMonitoring();

            // Check for existing session
            await this.checkSession();

            // Set up storage event listener for multi-tab sync
            window.addEventListener('storage', this.handleStorageChange.bind(this));

            // Set up network status monitoring
            window.addEventListener('online', this.handleOnline.bind(this));
            window.addEventListener('offline', this.handleOffline.bind(this));

        } catch (error) {
            console.error('Error initializing auth:', error);
            this.handleAuthError(error);
        }
    },

    // Check existing session with enhanced validation
    async checkSession() {
        try {
            const storedSession = localStorage.getItem('session');
            if (storedSession) {
                const session = JSON.parse(storedSession);
                
                // Validate stored session
                if (!this.isValidStoredSession(session)) {
                    throw new Error('Invalid stored session');
                }

                // Check if session is expired
                if (this.isSessionExpired(session)) {
                    await this.refreshSession(session.refreshToken);
                    return;
                }

                this.session = session;
            }

            const response = await utils.fetchAPI(config.api.endpoints.auth.session, {
                headers: this.getAuthHeaders()
            });

            if (response.authenticated) {
                await this.setUserInfo(response.user);
                this.updateSessionTimestamp();
            } else {
                await this.handleLogout();
            }
        } catch (error) {
            console.error('Error checking session:', error);
            await this.handleLogout();
        }
    },

    // Validate stored session
    isValidStoredSession(session) {
        return session &&
               typeof session === 'object' &&
               session.refreshToken &&
               session.lastActivity &&
               session.expiresAt;
    },

    // Check if session is expired
    isSessionExpired(session) {
        return new Date(session.expiresAt) <= new Date();
    },

    // Get authentication headers
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.session?.refreshToken) {
            headers['Authorization'] = `Bearer ${this.session.refreshToken}`;
        }

        return headers;
    },

    // Start session refresh interval
    startSessionRefresh() {
        if (this.session.refreshInterval) {
            clearInterval(this.session.refreshInterval);
        }

        this.session.refreshInterval = setInterval(async () => {
            if (this.isAuthenticated && this.session.refreshToken) {
                await this.refreshSession(this.session.refreshToken);
            }
        }, config.system.sessionRefreshInterval);
    },

    // Setup activity monitoring
    setupActivityMonitoring() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = utils.throttle(() => {
            this.updateSessionTimestamp();
        }, 1000);

        events.forEach(event => {
            document.addEventListener(event, handleActivity);
        });
    },

    // Set user info with enhanced security
    async setUserInfo(user) {
        try {
            // Validate user data
            if (!this.isValidUserData(user)) {
                throw new Error('Invalid user data');
            }

            // Encrypt sensitive data before storing
            const encryptedUser = await this.encryptUserData(user);
            
            this.isAuthenticated = true;
            this.userInfo = user;
            
            // Store encrypted session data
            localStorage.setItem('session', JSON.stringify({
                ...this.session,
                userData: encryptedUser,
                lastActivity: new Date().toISOString(),
                expiresAt: new Date(Date.now() + config.system.sessionTimeout * 60000).toISOString()
            }));
            
            // Update permissions cache
            await this.updateUserPermissions(user);
            
            // Notify listeners
            if (this.onAuthStateChanged) {
                this.onAuthStateChanged();
            }

            // Track authentication event
            utils.analytics.track('user_authenticated', {
                userId: user.id,
                roles: user.roles,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error setting user info:', error);
            await this.handleLogout();
        }
    },

    // Validate user data
    isValidUserData(user) {
        return user &&
               typeof user === 'object' &&
               typeof user.id === 'string' &&
               Array.isArray(user.roles) &&
               typeof user.username === 'string' &&
               user.roles.length > 0;
    },

    // Encrypt user data
    async encryptUserData(user) {
        // Implementation would depend on encryption method chosen
        // This is a placeholder for actual encryption
        return {
            ...user,
            encrypted: true,
            timestamp: new Date().toISOString()
        };
    },

    // Update user permissions
    async updateUserPermissions(user) {
        try {
            const response = await utils.fetchAPI(config.api.endpoints.auth.permissions, {
                method: 'POST',
                body: JSON.stringify({ userId: user.id })
            });

            this.userPermissions = new Set(response.permissions);
        } catch (error) {
            console.error('Error updating permissions:', error);
            this.userPermissions = new Set();
        }
    },

    // Handle logout with cleanup
    async handleLogout() {
        try {
            if (this.isAuthenticated) {
                // Notify server of logout
                await utils.fetchAPI(config.api.endpoints.auth.logout, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
            }
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            // Clear all auth state
            this.isAuthenticated = false;
            this.userInfo = null;
            this.userPermissions = new Set();
            
            // Clear session data
            this.session = {
                refreshToken: null,
                lastActivity: null,
                expiresAt: null,
                refreshInterval: null
            };

            // Clear intervals
            if (this.session.refreshInterval) {
                clearInterval(this.session.refreshInterval);
            }

            // Clear storage
            localStorage.removeItem('session');
            sessionStorage.clear();
            
            // Clear cookies related to auth
            this.clearAuthCookies();
            
            // Notify listeners
            if (this.onAuthStateChanged) {
                this.onAuthStateChanged();
            }

            // Track logout event
            utils.analytics.track('user_logged_out', {
                timestamp: new Date()
            });
        }
    },

    // Handle authentication success
    async handleAuthSuccess(response) {
        try {
            const { token, user } = response;
            
            // Validate token
            if (!this.isValidToken(token)) {
                throw new Error('Invalid token received');
            }

            // Set up session
            this.session.refreshToken = token;
            this.session.lastActivity = new Date().toISOString();
            this.session.expiresAt = new Date(Date.now() + config.system.sessionTimeout * 60000).toISOString();

            // Set up user info
            await this.setUserInfo(user);

            // Start session refresh
            this.startSessionRefresh();

            return true;
        } catch (error) {
            console.error('Error handling auth success:', error);
            await this.handleLogout();
            return false;
        }
    },

    // Validate JWT token
    isValidToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;

            const payload = JSON.parse(atob(parts[1]));
            return payload.exp > Date.now() / 1000;
        } catch (error) {
            return false;
        }
    },

    // Refresh session
    async refreshSession(refreshToken) {
        try {
            const response = await utils.fetchAPI(config.api.endpoints.auth.refresh, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (!response.success) {
                throw new Error('Failed to refresh session');
            }

            this.session.refreshToken = response.token;
            this.session.expiresAt = new Date(Date.now() + config.system.sessionTimeout * 60000).toISOString();
            this.updateSessionTimestamp();

        } catch (error) {
            console.error('Error refreshing session:', error);
            await this.handleLogout();
        }
    },

    // Update session timestamp
    updateSessionTimestamp() {
        if (this.isAuthenticated) {
            this.session.lastActivity = new Date().toISOString();
            localStorage.setItem('session', JSON.stringify(this.session));
        }
    },

    // Handle storage changes for multi-tab sync
    handleStorageChange(event) {
        if (event.key === 'session') {
            if (!event.newValue) {
                // Session was cleared in another tab
                this.handleLogout();
            } else {
                // Session was updated in another tab
                const newSession = JSON.parse(event.newValue);
                if (this.session.refreshToken !== newSession.refreshToken) {
                    this.checkSession();
                }
            }
        }
    },

    // Handle online status
    async handleOnline() {
        if (this.isAuthenticated) {
            await this.checkSession();
        }
    },

    // Handle offline status
    handleOffline() {
        // Implement offline mode handling if needed
        console.log('Application is offline');
    },

    // Clear auth-related cookies
    clearAuthCookies() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const name = cookie.split('=')[0].trim();
            if (name.startsWith('auth_')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            }
        }
    },

    // Handle authentication errors
    handleAuthError(error) {
        console.error('Authentication error:', error);
        utils.showNotification('Authentication error occurred', 'error');
        this.handleLogout();
    },

    // Role checks
    isPilot() {
        return this.userInfo?.roles.includes('pilot');
    },

    isATC() {
        return this.userInfo?.roles.includes('atc');
    },

    isSupervisor() {
        return this.userInfo?.roles.includes('supervisor');
    },

    // Check business class access
    async hasBusinessClassAccess() {
        if (!this.isAuthenticated) return false;

        try {
            const response = await utils.fetchAPI(config.api.endpoints.auth.checkGamepass);
            return response.hasAccess;
        } catch (error) {
            console.error('Error checking gamepass:', error);
            return false;
        }
    },

    // Get user rank
    getUserRank() {
        if (!this.isAuthenticated) return null;
        return this.userInfo.rank;
    },

    // Get user mileage
    getUserMileage() {
        if (!this.isAuthenticated) return 0;
        return this.userInfo.mileage;
    },

    // Check if user can access specific features
    canAccessFeature(feature) {
        if (!this.isAuthenticated) return false;

        const featureRequirements = {
            'book_flight': true, // All authenticated users
            'select_business': this.hasBusinessClassAccess(),
            'atc_clearance': this.isATC(),
            'flight_planning': this.isPilot(),
            'user_management': this.isSupervisor()
        };

        return featureRequirements[feature] || false;
    }
};

// Initialize auth on load
auth.init();
