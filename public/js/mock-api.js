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

    // Pass through all other requests
    return originalFetch.apply(this, args);
};
