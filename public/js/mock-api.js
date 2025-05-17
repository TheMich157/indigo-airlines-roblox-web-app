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
    }
};

// Intercept fetch requests to mock API endpoints
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const url = args[0];
    
    // Mock API endpoints
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

    // Pass through all other requests
    return originalFetch.apply(this, args);
};
