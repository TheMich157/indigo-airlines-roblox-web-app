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

    // Flight operations
    flightOps: {
        maxConcurrentFlights: 1,
        minTurnaroundTime: 30,
        maxFlightTime: 480, // 8 hours in minutes
        minGroundTime: 20,
        maxGroundTime: 180,
        fuelReserve: 45, // minutes
        standardClimb: 2000, // feet per minute
        standardDescent: 1500, // feet per minute
        taxiSpeed: 15, // knots
        pushbackSpeed: 5, // knots
        contingencyFuel: 0.05 // 5% of trip fuel
    },

    // Performance parameters
    performance: {
        A320: {
            cruiseSpeed: 450, // knots
            maxAltitude: 39000, // feet
            fuelFlow: 2400, // kg/hour
            maxRange: 3300, // nautical miles
            takeoffDistance: 2190, // meters
            landingDistance: 1440, // meters
            maxTakeoffWeight: 78000, // kg
            maxLandingWeight: 66000, // kg
            maxFuel: 24210, // kg
            minRunway: 1800 // meters
        },
        A330: {
            cruiseSpeed: 470,
            maxAltitude: 41000,
            fuelFlow: 5600,
            maxRange: 6350,
            takeoffDistance: 2500,
            landingDistance: 1730,
            maxTakeoffWeight: 242000,
            maxLandingWeight: 182000,
            maxFuel: 139090,
            minRunway: 2500
        }
    },

    // Weather minimums
    weatherMinimums: {
        takeoff: {
            visibility: 550, // meters
            ceiling: 200, // feet
            crosswind: 25, // knots
            tailwind: 10 // knots
        },
        landing: {
            visibility: 750,
            ceiling: 300,
            crosswind: 20,
            tailwind: 5
        },
        alternate: {
            visibility: 1500,
            ceiling: 600
        }
    },

    // Rank requirements
    rankRequirements: {
        'Trainee First Officer': {
            mileageRequired: 0,
            requiredHours: 0,
            allowedAircraft: ['A320'],
            supervisedFlights: true,
            routeRestrictions: ['domestic']
        },
        'First Officer': {
            mileageRequired: 5000,
            requiredHours: 50,
            allowedAircraft: ['A320'],
            supervisedFlights: false,
            routeRestrictions: ['domestic']
        },
        'Senior First Officer': {
            mileageRequired: 15000,
            requiredHours: 150,
            allowedAircraft: ['A320', 'A330'],
            supervisedFlights: false,
            routeRestrictions: []
        },
        'Captain': {
            mileageRequired: 30000,
            requiredHours: 300,
            allowedAircraft: ['A320', 'A330'],
            supervisedFlights: false,
            routeRestrictions: [],
            canTrainOthers: true
        },
        'Senior Captain': {
            mileageRequired: 50000,
            requiredHours: 500,
            allowedAircraft: ['A320', 'A330'],
            supervisedFlights: false,
            routeRestrictions: [],
            canTrainOthers: true,
            canAssessOthers: true
        },
        'Fleet Captain': {
            mileageRequired: 100000,
            requiredHours: 1000,
            allowedAircraft: ['A320', 'A330'],
            supervisedFlights: false,
            routeRestrictions: [],
            canTrainOthers: true,
            canAssessOthers: true,
            canManageFleet: true
        }
    },

    // Booking rules
    bookingRules: {
        maxAdvanceBooking: 30, // days
        minCheckInTime: 45, // minutes before departure
        maxCheckInTime: 180, // minutes before departure
        cancellationDeadline: 24, // hours before departure
        maxPassengers: 8, // per booking
        seatChangeDeadline: 2, // hours before departure
        noShowPenalty: 48, // hours ban
        frequentChangePenalty: 24 // hours ban after 3 changes
    },

    // System settings
    system: {
        sessionTimeout: 120, // minutes
        maxLoginAttempts: 5,
        lockoutDuration: 15, // minutes
        passwordExpiry: 90, // days
        mfaGracePeriod: 7, // days
        apiRateLimit: 100, // requests per minute
        maxFileSize: 5242880, // 5MB in bytes
        allowedFileTypes: ['jpg', 'png', 'pdf'],
        backupInterval: 86400, // 24 hours in seconds
        maintenanceWindow: {
            start: '02:00',
            duration: 120 // minutes
        }
    },

    // Error messages
    errorMessages: {
        auth: {
            invalidCredentials: 'Invalid username or password',
            sessionExpired: 'Your session has expired. Please log in again',
            insufficientPermissions: 'You do not have permission to perform this action',
            mfaRequired: 'Multi-factor authentication is required'
        },
        booking: {
            seatUnavailable: 'Selected seat is no longer available',
            flightFull: 'This flight is fully booked',
            duplicateBooking: 'You already have a booking on this flight',
            pastDeparture: 'Cannot book a flight that has already departed'
        },
        flight: {
            invalidRoute: 'Invalid route selected',
            crewUnavailable: 'Required crew is not available',
            aircraftUnavailable: 'Selected aircraft is not available',
            weatherRestriction: 'Current weather conditions do not meet minimum requirements'
        }
    }
};
