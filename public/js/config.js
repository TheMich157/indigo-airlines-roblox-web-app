// Application configuration
const config = {
    // API endpoints
    api: {
        baseUrl: '/api',
        endpoints: {
            auth: {
                session: '/api/auth/session',
                verify: '/api/auth/verify',
                logout: '/api/auth/logout',
                checkGamepass: '/api/auth/check-gamepass'
            },
            flights: {
                list: '/api/flights',
                create: '/api/flights/create',
                update: '/api/flights/update',
                delete: '/api/flights/delete',
                schedule: '/api/flights/schedule',
                featured: '/api/flights/featured'
            },
            booking: {
                create: '/api/booking/create',
                cancel: '/api/booking/cancel',
                list: '/api/booking/list'
            },
            atc: {
                activeFlights: '/api/atc/active-flights',
                clearance: '/api/atc/clearance',
                weather: '/api/atc/weather',
                voice: {
                    join: '/api/atc/voice/join',
                    leave: '/api/atc/voice/leave'
                }
            },
            pilot: {
                flightPlan: '/api/pilot/flight-plan',
                mileage: '/api/pilot/mileage',
                activityLog: '/api/pilot/activity-log'
            },
            admin: {
                stats: '/api/admin/stats',
                users: '/api/admin/users',
                pilots: '/api/admin/pilots',
                logs: '/api/admin/logs'
            }
        }
    },

    // Roblox integration
    roblox: {
        origin: 'https://www.roblox.com',
        loginUrl: 'https://www.roblox.com/login',
        groupId: '12345678',
        gameId: '87654321'
    },

    // Social links
    socialLinks: {
        discord: 'https://discord.gg/indigoairlines',
        robloxGroup: 'https://www.roblox.com/groups/12345678/IndiGo-Airlines'
    },

    // Aircraft configurations
    aircraft: {
        A320: {
            name: 'Airbus A320',
            seating: {
                business: {
                    rows: 2,
                    seatsPerRow: 6,
                    requiresGamepass: true
                },
                economy: {
                    rows: 26,
                    seatsPerRow: 6,
                    requiresGamepass: false
                }
            },
            seatMap: {
                totalRows: 28,
                seatsPerRow: 6,
                exitRows: [11, 12],
                businessClassRows: [1, 2]
            }
        },
        A330: {
            name: 'Airbus A330',
            seating: {
                business: {
                    rows: 3,
                    seatsPerRow: 8,
                    requiresGamepass: true
                },
                economy: {
                    rows: 41,
                    seatsPerRow: 8,
                    requiresGamepass: false
                }
            },
            seatMap: {
                totalRows: 44,
                seatsPerRow: 8,
                exitRows: [24, 25],
                businessClassRows: [1, 2, 3]
            }
        }
    },

    // Airports
    airports: {
        DEL: {
            code: 'DEL',
            name: 'Indira Gandhi International Airport',
            city: 'Delhi',
            country: 'India',
            latitude: 28.5562,
            longitude: 77.1000
        },
        BOM: {
            code: 'BOM',
            name: 'Chhatrapati Shivaji Maharaj International Airport',
            city: 'Mumbai',
            country: 'India',
            latitude: 19.0896,
            longitude: 72.8656
        },
        BLR: {
            code: 'BLR',
            name: 'Kempegowda International Airport',
            city: 'Bangalore',
            country: 'India',
            latitude: 13.1986,
            longitude: 77.7066
        },
        MAA: {
            code: 'MAA',
            name: 'Chennai International Airport',
            city: 'Chennai',
            country: 'India',
            latitude: 12.9941,
            longitude: 80.1709
        },
        CCU: {
            code: 'CCU',
            name: 'Netaji Subhas Chandra Bose International Airport',
            city: 'Kolkata',
            country: 'India',
            latitude: 22.6520,
            longitude: 88.4463
        },
        HYD: {
            code: 'HYD',
            name: 'Rajiv Gandhi International Airport',
            city: 'Hyderabad',
            country: 'India',
            latitude: 17.2403,
            longitude: 78.4294
        }
    },

    // Pilot ranks
    pilotRanks: [
        {
            name: 'Trainee First Officer',
            mileageRequired: 0
        },
        {
            name: 'First Officer',
            mileageRequired: 5000
        },
        {
            name: 'Senior First Officer',
            mileageRequired: 15000
        },
        {
            name: 'Captain',
            mileageRequired: 30000
        },
        {
            name: 'Senior Captain',
            mileageRequired: 50000
        },
        {
            name: 'Fleet Captain',
            mileageRequired: 100000
        }
    ],

    // ATC positions
    atcPositions: [
        {
            code: 'GND',
            name: 'Ground',
            frequency: '121.9'
        },
        {
            code: 'TWR',
            name: 'Tower',
            frequency: '118.1'
        },
        {
            code: 'APP',
            name: 'Approach',
            frequency: '119.1'
        },
        {
            code: 'DEP',
            name: 'Departure',
            frequency: '125.2'
        },
        {
            code: 'CTR',
            name: 'Center',
            frequency: '127.4'
        }
    ],

    // Voice chat settings
    voiceChat: {
        enabled: true,
        maxRange: 100,
        falloff: 1.5,
        atcRange: 500
    },

    // Weather update interval (in milliseconds)
    weatherUpdateInterval: 300000, // 5 minutes

    // Flight status update interval (in milliseconds)
    flightStatusUpdateInterval: 10000, // 10 seconds

    // Maximum booking window (in days)
    maxBookingWindow: 30,

    // Session timeout (in minutes)
    sessionTimeout: 120,

    // Default timezone
    timezone: 'Asia/Kolkata',

    // Date format
    dateFormat: 'DD/MM/YYYY HH:mm',

    // Maximum concurrent flights per pilot
    maxConcurrentFlights: 1,

    // Minimum turnaround time (in minutes)
    minTurnaroundTime: 30
};
