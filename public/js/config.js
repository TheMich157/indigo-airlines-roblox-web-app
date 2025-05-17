// Configuration for the IndiGo Airlines website

const config = {
    // API endpoints
    api: {
        base: '/api',
        auth: {
            login: '/auth/login',
            verify: '/auth/verify-gamepass',
            profile: '/auth/profile'
        },
        flights: {
            list: '/flights',
            search: '/flights/search',
            stats: '/flights/stats/overview'
        },
        bookings: {
            create: '/bookings',
            list: '/bookings/user',
            availability: '/bookings/availability'
        },
        atc: {
            clearance: '/atc/clearance',
            weather: '/atc/weather',
            voice: '/atc/voice'
        },
        pilot: {
            logs: '/pilot/logs',
            stats: '/pilot/profile',
            rankUp: '/pilot/rank-up'
        }
    },

    // Aircraft configurations
    aircraft: {
        A320: {
            name: 'Airbus A320',
            capacity: {
                economy: 162,
                business: 18
            },
            range: 6100, // km
            cruisingSpeed: 828, // km/h
            seatMap: {
                rows: 30,
                businessRows: 3,
                seatsPerRow: 6
            }
        },
        A330: {
            name: 'Airbus A330',
            capacity: {
                economy: 268,
                business: 32
            },
            range: 11750, // km
            cruisingSpeed: 871, // km/h
            seatMap: {
                rows: 40,
                businessRows: 5,
                seatsPerRow: 8
            }
        }
    },

    // Radio frequencies
    frequencies: {
        ground: '121.9',
        tower: '118.1',
        approach: '119.1',
        departure: '125.2'
    },

    // Pilot ranks and requirements
    ranks: {
        'First Officer': {
            miles: 5000,
            flights: 20,
            nextRank: 'Senior First Officer'
        },
        'Senior First Officer': {
            miles: 15000,
            flights: 50,
            nextRank: 'Captain'
        },
        'Captain': {
            miles: 30000,
            flights: 100,
            nextRank: null
        }
    },

    // Airports served
    airports: {
        DEL: {
            name: 'Delhi',
            code: 'DEL',
            fullName: 'Indira Gandhi International Airport',
            coordinates: { lat: 28.5562, lon: 77.1000 }
        },
        BOM: {
            name: 'Mumbai',
            code: 'BOM',
            fullName: 'Chhatrapati Shivaji Maharaj International Airport',
            coordinates: { lat: 19.0896, lon: 72.8656 }
        },
        MAA: {
            name: 'Chennai',
            code: 'MAA',
            fullName: 'Chennai International Airport',
            coordinates: { lat: 12.9941, lon: 80.1709 }
        },
        COK: {
            name: 'Kochi',
            code: 'COK',
            fullName: 'Cochin International Airport',
            coordinates: { lat: 10.1520, lon: 76.3916 }
        }
    },

    // Pricing configuration
    pricing: {
        basePrice: 2000, // Base price in INR
        businessMultiplier: 2.5, // Business class price multiplier
        distanceRate: 3, // Price per km
        taxes: 0.18 // 18% tax rate
    },

    // Notification settings
    notifications: {
        duration: 3000, // Duration in milliseconds
        position: 'bottom-right'
    },

    // Voice chat settings
    voiceChat: {
        sampleRate: 48000,
        channels: 1,
        quality: 'high'
    },

    // Weather update interval (in milliseconds)
    weatherUpdateInterval: 300000, // 5 minutes
};

// Export config for use in other files
window.config = config;
