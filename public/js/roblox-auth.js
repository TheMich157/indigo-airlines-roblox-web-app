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

    // Get user info with enhanced security and validation
    async getUserInfo(token) {
        try {
            // Verify token hasn't expired
            if (this.isTokenExpired(token)) {
                throw new Error('Token has expired');
            }

            // Get basic user info
            const response = await fetch('https://users.roblox.com/v1/users/authenticated', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-TOKEN': await this.getRobloxCsrfToken()
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get user info');
            }

            const userData = await response.json();

            // Validate user data
            this.validateUserData(userData);

            // Get additional user data in parallel
            const [
                userRoles,
                groupRank,
                premiumStatus,
                verificationStatus
            ] = await Promise.all([
                this.getUserRoles(userData.id),
                this.getGroupRank(userData.id),
                this.checkPremiumStatus(userData.id),
                this.getVerificationStatus(userData.id)
            ]);

            // Check minimum requirements
            if (!this.meetsMinimumRequirements(groupRank, premiumStatus)) {
                throw new Error('User does not meet minimum requirements');
            }

            return {
                id: userData.id,
                username: userData.name,
                displayName: userData.displayName,
                roles: userRoles.roles,
                rank: userRoles.rank,
                groupRank: groupRank,
                mileage: userRoles.mileage,
                isPremium: premiumStatus.isPremium,
                isVerified: verificationStatus.isVerified,
                joinDate: userData.created,
                lastLogin: new Date().toISOString(),
                permissions: this.calculatePermissions(userRoles.roles, groupRank)
            };
        } catch (error) {
            console.error('Error getting user info:', error);
            throw new Error('Failed to get user info');
        }
    },

    // Get CSRF token for Roblox API requests
    async getRobloxCsrfToken() {
        const response = await fetch('https://auth.roblox.com/v2/csrf', {
            method: 'POST',
            credentials: 'include'
        });
        return response.headers.get('x-csrf-token');
    },

    // Validate user data
    validateUserData(userData) {
        if (!userData.id || !userData.name) {
            throw new Error('Invalid user data received');
        }
        
        // Validate username format
        if (!/^[\w\d_]{3,20}$/.test(userData.name)) {
            throw new Error('Invalid username format');
        }

        // Check account age
        const accountAge = (new Date() - new Date(userData.created)) / (1000 * 60 * 60 * 24);
        if (accountAge < config.roblox.minAccountAge) {
            throw new Error('Account too new');
        }
    },

    // Get user roles with caching
    async getUserRoles(userId) {
        const cacheKey = `user_roles_${userId}`;
        
        try {
            return await utils.cache.get(cacheKey, async () => {
                const response = await fetch(`/api/auth/user-roles/${userId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to get user roles');
                }

                return await response.json();
            }, 300000); // Cache for 5 minutes
        } catch (error) {
            console.error('Error getting user roles:', error);
            throw new Error('Failed to get user roles');
        }
    },

    // Get group rank with verification
    async getGroupRank(userId) {
        try {
            const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
            
            if (!response.ok) {
                throw new Error('Failed to get group rank');
            }

            const data = await response.json();
            const groupData = data.data.find(g => g.group.id === this.GROUP_ID);
            
            if (!groupData) {
                throw new Error('User not in group');
            }

            return {
                rankId: groupData.role.rank,
                rankName: groupData.role.name,
                rankLevel: this.getRankLevel(groupData.role.name)
            };
        } catch (error) {
            console.error('Error getting group rank:', error);
            throw new Error('Failed to get group rank');
        }
    },

    // Check premium status
    async checkPremiumStatus(userId) {
        try {
            const response = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
            
            if (!response.ok) {
                throw new Error('Failed to check premium status');
            }

            const data = await response.json();
            return {
                isPremium: data.isPremium,
                membershipType: data.membershipType
            };
        } catch (error) {
            console.error('Error checking premium status:', error);
            return { isPremium: false };
        }
    },

    // Get verification status
    async getVerificationStatus(userId) {
        try {
            const response = await fetch(`/api/auth/verification-status/${userId}`);
            
            if (!response.ok) {
                throw new Error('Failed to get verification status');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting verification status:', error);
            return { isVerified: false };
        }
    },

    // Calculate permissions based on roles and rank
    calculatePermissions(roles, groupRank) {
        const permissions = new Set();

        // Add role-based permissions
        roles.forEach(role => {
            const rolePermissions = config.permissions[role] || [];
            rolePermissions.forEach(p => permissions.add(p));
        });

        // Add rank-based permissions
        const rankPermissions = config.permissions[`rank_${groupRank.rankId}`] || [];
        rankPermissions.forEach(p => permissions.add(p));

        return Array.from(permissions);
    },

    // Check if token is expired
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return Date.now() >= payload.exp * 1000;
        } catch (error) {
            return true;
        }
    },

    // Check minimum requirements
    meetsMinimumRequirements(groupRank, premiumStatus) {
        // Must be at least a trainee rank
        if (groupRank.rankLevel < config.roblox.minRankLevel) {
            return false;
        }

        // Premium requirement can be configured
        if (config.roblox.requirePremium && !premiumStatus.isPremium) {
            return false;
        }

        return true;
    },

    // Get rank level for sorting/comparison
    getRankLevel(rankName) {
        const rankLevels = {
            'Guest': 0,
            'Trainee': 1,
            'Junior': 2,
            'Senior': 3,
            'Expert': 4,
            'Manager': 5,
            'Administrator': 6
        };

        for (const [key, level] of Object.entries(rankLevels)) {
            if (rankName.includes(key)) return level;
        }
        return 0;
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
