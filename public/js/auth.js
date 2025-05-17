// Authentication module for Roblox integration
const auth = {
    // Authentication state
    isAuthenticated: false,
    userInfo: null,
    roles: [],

    // Initialize auth state from session storage
    init() {
        try {
            const storedAuth = sessionStorage.getItem('auth');
            if (storedAuth) {
                const authData = JSON.parse(storedAuth);
                this.isAuthenticated = true;
                this.userInfo = authData.userInfo;
                this.roles = authData.roles;
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
            sessionStorage.removeItem('auth');
        }
    },

    // Login with Roblox
    async login() {
        try {
            // TODO: Implement actual Roblox OAuth flow
            // For now, simulate a successful login
            const mockUserData = await this.mockRobloxAuth();
            
            this.isAuthenticated = true;
            this.userInfo = mockUserData;
            this.roles = mockUserData.roles;

            // Store auth data in session
            sessionStorage.setItem('auth', JSON.stringify({
                userInfo: this.userInfo,
                roles: this.roles
            }));

            // Notify success
            utils.showNotification('Successfully logged in', 'success');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            utils.showNotification('Login failed. Please try again.', 'error');
            return false;
        }
    },

    // Logout
    async logout() {
        try {
            this.isAuthenticated = false;
            this.userInfo = null;
            this.roles = [];
            sessionStorage.removeItem('auth');
            utils.showNotification('Successfully logged out', 'success');
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            utils.showNotification('Logout failed. Please try again.', 'error');
            return false;
        }
    },

    // Check if user has specific role
    hasRole(role) {
        return this.roles.includes(role);
    },

    // Check if user has business class access
    async hasBusinessClassAccess() {
        try {
            if (!this.isAuthenticated) return false;
            
            // TODO: Implement actual gamepass check
            // For now, check if user has 'business_class' role
            return this.hasRole('business_class');
        } catch (error) {
            console.error('Error checking business class access:', error);
            return false;
        }
    },

    // Check if user is ATC
    isATC() {
        return this.hasRole('atc');
    },

    // Check if user is Pilot
    isPilot() {
        return this.hasRole('pilot') || this.hasRole('first_officer');
    },

    // Check if user is Supervisor or higher
    isSupervisor() {
        return this.hasRole('supervisor') || this.hasRole('admin');
    },

    // Mock Roblox authentication (temporary)
    async mockRobloxAuth() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    id: '12345',
                    username: 'TestUser',
                    displayName: 'Test User',
                    roles: ['user'],
                    created: new Date().toISOString()
                });
            }, 1000);
        });
    }
};

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
});

// Export auth module
window.auth = auth;
