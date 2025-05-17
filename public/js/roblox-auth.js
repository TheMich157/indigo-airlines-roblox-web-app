// Roblox Authentication Module
const RobloxAuth = {
    // Constants
    ROBLOX_OAUTH_URL: 'https://auth.roblox.com/v2/login',
    GAME_ID: '87654321', // Replace with actual game ID
    GROUP_ID: '12345678', // Replace with actual group ID

    // Initialize Roblox auth
    init() {
        // Listen for messages from Roblox
        window.addEventListener('message', this.handleMessage.bind(this));
        
        // Add login button listener
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', this.startLogin.bind(this));
        }
    },

    // Start login process
    startLogin() {
        // Open Roblox login popup
        const width = 500;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const params = new URLSearchParams({
            clientId: this.GAME_ID,
            redirectUri: window.location.origin + '/auth/callback',
            responseType: 'code',
            scope: 'openid profile',
            state: this.generateState(),
            nonce: this.generateNonce()
        });

        const loginUrl = `${this.ROBLOX_OAUTH_URL}?${params.toString()}`;

        this.loginWindow = window.open(
            loginUrl,
            'RobloxLogin',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Store state for verification
        sessionStorage.setItem('auth_state', params.get('state'));
        sessionStorage.setItem('auth_nonce', params.get('nonce'));
    },

    // Handle messages from Roblox
    async handleMessage(event) {
        // Verify origin
        if (!event.origin.endsWith('.roblox.com')) return;

        const { type, data } = event.data;

        if (type === 'ROBLOX_AUTH') {
            try {
                // Verify state
                if (data.state !== sessionStorage.getItem('auth_state')) {
                    throw new Error('Invalid state parameter');
                }

                // Exchange code for token
                const token = await this.exchangeCodeForToken(data.code);
                
                // Verify user is in group
                const isInGroup = await this.verifyGroupMembership(token);
                if (!isInGroup) {
                    utils.showNotification('You must be a member of the IndiGo Airlines group', 'error');
                    return;
                }

                // Get user info
                const userInfo = await this.getUserInfo(token);

                // Complete authentication
                await auth.handleAuthSuccess({
                    token,
                    user: userInfo
                });

                // Close login window
                if (this.loginWindow) {
                    this.loginWindow.close();
                }

            } catch (error) {
                console.error('Authentication error:', error);
                utils.showNotification('Authentication failed', 'error');
            } finally {
                // Clean up
                sessionStorage.removeItem('auth_state');
                sessionStorage.removeItem('auth_nonce');
            }
        }
    },

    // Exchange authorization code for token
    async exchangeCodeForToken(code) {
        const response = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const data = await response.json();
        return data.token;
    },

    // Verify user is in group
    async verifyGroupMembership(token) {
        const response = await fetch(`https://groups.roblox.com/v1/users/groups`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to verify group membership');
        }

        const data = await response.json();
        return data.some(group => group.group.id === this.GROUP_ID);
    },

    // Get user info
    async getUserInfo(token) {
        const response = await fetch('https://users.roblox.com/v1/users/authenticated', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get user info');
        }

        const userData = await response.json();

        // Get additional user data (roles, rank, etc.)
        const userRoles = await this.getUserRoles(userData.id);

        return {
            id: userData.id,
            username: userData.name,
            displayName: userData.displayName,
            roles: userRoles.roles,
            rank: userRoles.rank,
            mileage: userRoles.mileage
        };
    },

    // Get user roles and rank
    async getUserRoles(userId) {
        const response = await fetch(`/api/auth/user-roles/${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to get user roles');
        }

        return await response.json();
    },

    // Generate random state parameter
    generateState() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Generate random nonce
    generateNonce() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
};

// Initialize Roblox auth
RobloxAuth.init();
