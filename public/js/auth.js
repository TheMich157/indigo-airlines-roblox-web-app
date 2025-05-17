// Authentication Module
const auth = {
    isAuthenticated: false,
    user: null,

    // Initialize auth state
    init() {
        // Check if user is already logged in
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.isAuthenticated = true;
            this.user = JSON.parse(localStorage.getItem('user_data'));
            this.updateUI();
        }
    },

    // Handle Roblox login
    async login() {
        try {
            // TODO: Implement actual Roblox OAuth login
            // For now, we'll simulate a successful login
            const mockUser = {
                id: '12345',
                username: 'TestUser',
                role: 'passenger'
            };

            localStorage.setItem('auth_token', 'mock_token');
            localStorage.setItem('user_data', JSON.stringify(mockUser));
            
            this.isAuthenticated = true;
            this.user = mockUser;
            this.updateUI();
        } catch (error) {
            console.error('Login failed:', error);
            alert('Failed to login. Please try again.');
        }
    },

    // Handle logout
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        this.isAuthenticated = false;
        this.user = null;
        this.updateUI();
    },

    // Update UI based on auth state
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            if (this.isAuthenticated) {
                loginBtn.textContent = 'Logout';
                loginBtn.onclick = () => this.logout();
            } else {
                loginBtn.textContent = 'Login with Roblox';
                loginBtn.onclick = () => this.login();
            }
        }
    },

    // Check if user has specific role
    hasRole(role) {
        return this.isAuthenticated && this.user && this.user.role === role;
    }
};

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
});
