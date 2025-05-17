// Mock API responses
const mockAPI = {
    // Mock session response
    session: {
        authenticated: false,
        user: null
    },

    // Mock analytics endpoint
    analytics: {
        success: true
    },

    // Mock flights data
    flights: {
        available: [
            {
                id: "flight1",
                flightNumber: "6E123",
                departure: "DEL",
                arrival: "BOM",
                aircraft: "A320",
                departureTime: "2024-05-17T14:30:00Z",
                arrivalTime: "2024-05-17T16:30:00Z",
                status: "scheduled",
                price: {
                    economy: 5000,
                    business: 15000
                },
                seats: {
                    available: {
                        economy: 150,
                        business: 12
                    },
                    occupied: ["1A", "1B", "2F"]
                }
            },
            {
                id: "flight2",
                flightNumber: "6E456",
                departure: "BOM",
                arrival: "BLR",
                aircraft: "A320",
                departureTime: "2024-05-17T15:30:00Z",
                arrivalTime: "2024-05-17T17:00:00Z",
                status: "scheduled",
                price: {
                    economy: 4500,
                    business: 13500
                },
                seats: {
                    available: {
                        economy: 150,
                        business: 12
                    },
                    occupied: ["1C", "1D"]
                }
            },
            {
                id: "flight3",
                flightNumber: "6E789",
                departure: "MAA",
                arrival: "CCU",
                aircraft: "A330",
                departureTime: "2024-05-17T16:30:00Z",
                arrivalTime: "2024-05-17T19:00:00Z",
                status: "scheduled",
                price: {
                    economy: 6000,
                    business: 18000
                },
                seats: {
                    available: {
                        economy: 220,
                        business: 20
                    },
                    occupied: ["1A", "2A"]
                }
            }
        ]
    },

    // Mock auth data
    auth: {
        users: new Map(),
        sessions: new Map(),
        gamepasses: new Set(['business_class']),
        pendingAuths: new Map()
    },

    // Mock OAuth endpoints
    handleOAuthRequest(url, args) {
        if (url.includes('/oauth/v1/authorize') || url.includes('/v2/authorize')) {
            // Generate mock auth code and create pending auth
            const code = 'mock_auth_code_' + Math.random().toString(36).substr(2, 9);
            const userId = 'user_' + Math.random().toString(36).substr(2, 9);
            
            this.auth.pendingAuths.set(code, {
                userId,
                username: 'RobloxUser_' + userId,
                displayName: 'Test User',
                roles: ['pilot'],
                rank: 'Trainee First Officer',
                mileage: 0
            });

            // Auto-complete auth after a short delay
            setTimeout(() => {
                const pendingAuth = this.auth.pendingAuths.get(code);
                if (pendingAuth) {
                    const accessToken = 'token_' + Math.random().toString(36).substr(2, 9);
                    this.auth.users.set(pendingAuth.userId, pendingAuth);
                    this.auth.sessions.set(accessToken, pendingAuth.userId);
                    
                    // Notify of successful auth
                    utils.showNotification('Successfully logged in', 'success');
                    window.location.href = '/';
                }
            }, 500);

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url === '/api/auth/callback') {
            const body = JSON.parse(args[1].body);
            const code = body.code;
            const pendingAuth = this.auth.pendingAuths.get(code);

            if (pendingAuth) {
                const accessToken = 'token_' + Math.random().toString(36).substr(2, 9);
                this.auth.users.set(pendingAuth.userId, pendingAuth);
                this.auth.sessions.set(accessToken, pendingAuth.userId);
                this.auth.pendingAuths.delete(code);

                return new Response(JSON.stringify({
                    success: true,
                    user: pendingAuth,
                    accessToken: accessToken
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                success: false,
                message: 'Invalid authorization code'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return null;
    },

    // Mock ATC data
    atc: {
        activeFlights: [
            {
                id: "flight1",
                flightNumber: "6E123",
                departure: "DEL",
                arrival: "BOM",
                aircraft: "A320",
                status: "boarding",
                altitude: "FL350",
                speed: "450",
                heading: "270",
                position: { lat: 28.5562, lng: 77.1000 },
                estimatedArrival: "2024-05-17T15:30:00Z"
            },
            {
                id: "flight2",
                flightNumber: "6E456",
                departure: "BOM",
                arrival: "BLR",
                aircraft: "A320",
                status: "en_route",
                altitude: "FL320",
                speed: "440",
                heading: "180",
                position: { lat: 19.0896, lng: 72.8656 },
                estimatedArrival: "2024-05-17T16:15:00Z"
            },
            {
                id: "flight3",
                flightNumber: "6E789",
                departure: "MAA",
                arrival: "CCU",
                aircraft: "A330",
                status: "approaching",
                altitude: "FL100",
                speed: "280",
                heading: "045",
                position: { lat: 22.6520, lng: 88.4463 },
                estimatedArrival: "2024-05-17T14:45:00Z"
            }
        ],
        weather: {
            windDirection: "270° @ 10kts",
            visibility: "10km",
            cloudBase: "2500ft",
            temperature: "25°C",
            pressure: "1013 hPa",
            conditions: "CAVOK"
        }
    }
};

// Intercept fetch requests to mock API endpoints
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const url = args[0];
    
    // Mock API endpoints
    if (url === '/api/mock-auth') {
        const body = JSON.parse(args[1].body);
        const code = 'mock_auth_code_' + Math.random().toString(36).substr(2, 9);
        const userId = 'user_' + Math.random().toString(36).substr(2, 9);
        
        // Create mock user data
        const userData = {
            id: userId,
            username: 'RobloxUser_' + userId,
            displayName: 'Test User',
            roles: ['pilot'],
            rank: 'Trainee First Officer',
            mileage: 0
        };

        // Store pending auth
        mockAPI.auth.pendingAuths.set(code, userData);

        // Auto-complete auth after a short delay
        setTimeout(() => {
            const accessToken = 'token_' + Math.random().toString(36).substr(2, 9);
            mockAPI.auth.users.set(userId, userData);
            mockAPI.auth.sessions.set(accessToken, userId);
            
            // Update session state
            mockAPI.session.authenticated = true;
            mockAPI.session.user = userData;
            
            // Simulate redirect to callback URL with auth code
            window.location.href = `${body.redirect_uri}?code=${code}&state=${body.state}`;
        }, 500);

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/auth/session') {
        return new Response(JSON.stringify(mockAPI.session), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (url === '/api/analytics') {
        return new Response(JSON.stringify(mockAPI.analytics), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Mock ATC endpoints
    if (url === '/api/atc/active-flights') {
        return new Response(JSON.stringify(mockAPI.atc.activeFlights), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/atc/weather') {
        return new Response(JSON.stringify(mockAPI.atc.weather), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/atc/clearance') {
        const body = JSON.parse(args[1].body);
        const flight = mockAPI.atc.activeFlights.find(f => f.id === body.flightId);
        if (flight) {
            flight.status = body.type === 'takeoff' ? 'departed' :
                           body.type === 'landing' ? 'landed' :
                           body.type === 'approach' ? 'approaching' : flight.status;
        }
        return new Response(JSON.stringify({ success: true, flight }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Mock flight booking endpoints
    if (url === '/api/flights/available') {
        return new Response(JSON.stringify(mockAPI.flights.available), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/booking/check-seat') {
        const body = JSON.parse(args[1].body);
        const flight = mockAPI.flights.available.find(f => f.id === body.flightId);
        if (flight) {
            const isOccupied = flight.seats.occupied.includes(body.seatNumber);
            return new Response(JSON.stringify({ 
                available: !isOccupied,
                message: isOccupied ? 'Seat is already occupied' : 'Seat is available'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    if (url === '/api/booking/hold-seat') {
        const body = JSON.parse(args[1].body);
        const flight = mockAPI.flights.available.find(f => f.id === body.flightId);
        if (flight && !flight.seats.occupied.includes(body.seatNumber)) {
            return new Response(JSON.stringify({ 
                success: true,
                message: 'Seat held successfully'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ 
            success: false,
            message: 'Seat is not available'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/booking/create') {
        const body = JSON.parse(args[1].body);
        const flight = mockAPI.flights.available.find(f => f.id === body.flightId);
        if (flight && !flight.seats.occupied.includes(body.seatNumber)) {
            flight.seats.occupied.push(body.seatNumber);
            return new Response(JSON.stringify({ 
                success: true,
                message: 'Booking created successfully',
                bookingReference: 'PNR' + Math.random().toString(36).substr(2, 6).toUpperCase()
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ 
            success: false,
            message: 'Unable to create booking'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Mock Roblox OAuth endpoints
    if (url.includes('/oauth/v1/authorize') || url.includes('/v2/authorize')) {
        // Generate mock auth code
        const code = 'mock_auth_code_' + Math.random().toString(36).substr(2, 9);
        const userId = 'user_' + Math.random().toString(36).substr(2, 9);
        
        // Create mock user data
        const userData = {
            id: userId,
            username: 'RobloxUser_' + userId,
            displayName: 'Test User',
            roles: ['pilot'],
            rank: 'Trainee First Officer',
            mileage: 0
        };

        // Store pending auth
        mockAPI.auth.pendingAuths.set(code, userData);

        // Auto-complete auth after a short delay
        setTimeout(() => {
            const accessToken = 'token_' + Math.random().toString(36).substr(2, 9);
            mockAPI.auth.users.set(userId, userData);
            mockAPI.auth.sessions.set(accessToken, userId);
            
            // Update session state
            mockAPI.session.authenticated = true;
            mockAPI.session.user = userData;
            
            // Notify of successful auth
            utils.showNotification('Successfully logged in', 'success');
            window.location.href = '/';
        }, 500);

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/auth/callback') {
        const body = JSON.parse(args[1].body);
        const code = body.code;

        if (code?.startsWith('mock_auth_code_')) {
            const userId = 'user_' + Math.random().toString(36).substr(2, 9);
            const accessToken = 'token_' + Math.random().toString(36).substr(2, 9);
            
            // Create mock user data
            const userData = {
                id: userId,
                username: 'RobloxUser_' + userId,
                displayName: 'Test User',
                roles: ['pilot'],
                rank: 'Trainee First Officer',
                mileage: 0,
                isPremium: true,
                joinDate: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            // Store user session
            mockAPI.auth.users.set(userId, userData);
            mockAPI.auth.sessions.set(accessToken, userId);

            return new Response(JSON.stringify({
                success: true,
                user: userData,
                accessToken: accessToken
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify({
            success: false,
            message: 'Invalid authorization code'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/auth/session') {
        const authHeader = args[1]?.headers?.Authorization;
        const token = authHeader?.split(' ')[1];
        
        if (token && mockAPI.auth.sessions.has(token)) {
            const userId = mockAPI.auth.sessions.get(token);
            const user = mockAPI.auth.users.get(userId);
            
            return new Response(JSON.stringify({
                authenticated: true,
                user: user
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify({
            authenticated: false
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/auth/logout') {
        const authHeader = args[1]?.headers?.Authorization;
        const token = authHeader?.split(' ')[1];
        
        if (token) {
            mockAPI.auth.sessions.delete(token);
        }
        
        return new Response(JSON.stringify({
            success: true
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url === '/api/auth/check-gamepass') {
        const authHeader = args[1]?.headers?.Authorization;
        const token = authHeader?.split(' ')[1];
        
        if (token && mockAPI.auth.sessions.has(token)) {
            const userId = mockAPI.auth.sessions.get(token);
            const hasAccess = mockAPI.auth.gamepasses.has('business_class');
            
            return new Response(JSON.stringify({
                hasAccess: hasAccess
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify({
            hasAccess: false
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Pass through all other requests
    return originalFetch.apply(this, args);
};
