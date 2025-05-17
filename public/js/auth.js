// Authentication and user management
const auth = {
    // User state
    isAuthenticated: false,
    userInfo: null,
    onAuthStateChanged: null,

    // Initialize auth
    init() {
        // Check for existing session
        this.checkSession();
    },

    // Check existing session
    async checkSession() {
        try {
            const response = await utils.fetchAPI(config.api.endpoints.auth.session);
            if (response.authenticated) {
                this.setUserInfo(response.user);
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    },

    // Set user info and update state
    setUserInfo(user) {
        this.isAuthenticated = true;
        this.userInfo = user;
        
        // Store session
        localStorage.setItem('userInfo', JSON.stringify(user));
        
        // Notify listeners
        if (this.onAuthStateChanged) {
            this.onAuthStateChanged();
        }
    },

    // Clear user info and update state
    clearUserInfo() {
        this.isAuthenticated = false;
        this.userInfo = null;
        
        // Clear session
        localStorage.removeItem('userInfo');
        
        // Notify listeners
        if (this.onAuthStateChanged) {
            this.onAuthStateChanged();
        }
    },

    // Login with Roblox
    login() {
        RobloxAuth.startLogin();
    },

    // Logout
    logout() {
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
