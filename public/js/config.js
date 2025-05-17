// Application configuration
const config = {
    // API endpoints
    api: {
        base: '/api',
        endpoints: {
            // Auth endpoints
            auth: {
                login: '/auth/login',
                logout: '/auth/logout',
                verify: '/auth/verify',
                checkGamepass: '/auth/check-gamepass'
            },
            // Booking endpoints
            booking: {
                create: '/bookings/create',
                get: '/bookings/get',
                cancel: '/bookings/cancel',
                seats: '/bookings/seats'
            },
            // Flight endpoints
            flights: {
                create: '/flights/create',
                list: '/flights/list',
                update: '/flights/update',
                delete: '/flights/delete'
            },
            // ATC endpoints
            atc: {
                clearance: '/atc/clearance',
                weather: '/atc/weather',
                activeFlights: '/atc/active-flights',
                flightStatus: '/atc/flight-status',
                delay: '/atc/delay',
                voice: {
                    join: '/atc/voice/join',
                    leave: '/atc/voice/leave'
                }
            },
            // Pilot endpoints
            pilot: {
                flightPlan: '/pilot/flight-plan',
                mileage: '/pilot/mileage',
                rankUp: '/pilot/rank-up'
            }
        }
    },

    // Socket.IO configuration
    socket: {
        url: window.location.origin,
        options: {
            transports: ['websocket'],
            autoConnect: true
        }
    },

    // Aircraft configurations
    aircraft: {
        A320: {
            name: 'Airbus A320',
            seating: {
                business: {
                    rows: 2,
                    seatsPerRow: 6,
                    price: 12000 // INR
                },
                economy: {
                    rows: 30,
                    seatsPerRow: 6,
                    price: 5000 // INR
                }
            }
        },
        A330: {
            name: 'Airbus A330',
            seating: {
                business: {
                    rows: 3,
                    seatsPerRow: 8,
                    price: 15000 // INR
                },
                economy: {
                    rows: 41,
                    seatsPerRow: 8,
                    price: 7000 // INR
                }
            }
        }
    },

    // Airport routes
    airports: {
        COK: {
            name: 'Cochin International Airport',
            code: 'COK',
            city: 'Kochi',
            coordinates: {
                lat: 10.1520,
                lng: 76.3919
            }
        },
        BLR: {
            name: 'Kempegowda International Airport',
            code: 'BLR',
            city: 'Bangalore',
            coordinates: {
                lat: 13.1986,
                lng: 77.7066
            }
        },
        DEL: {
            name: 'Indira Gandhi International Airport',
            code: 'DEL',
            city: 'Delhi',
            coordinates: {
                lat: 28.5562,
                lng: 77.1000
            }
        },
        BOM: {
            name: 'Chhatrapati Shivaji Maharaj International Airport',
            code: 'BOM',
            city: 'Mumbai',
            coordinates: {
                lat: 19.0896,
                lng: 72.8656
            }
        },
        MAA: {
            name: 'Chennai International Airport',
            code: 'MAA',
            city: 'Chennai',
            coordinates: {
                lat: 12.9941,
                lng: 80.1709
            }
        },
        HYD: {
            name: 'Rajiv Gandhi International Airport',
            code: 'HYD',
            city: 'Hyderabad',
            coordinates: {
                lat: 17.2403,
                lng: 78.4294
            }
        }
    },

    // ATC clearance types
    clearanceTypes: [
        'ATC Clearance',
        'Takeoff Clearance',
        'Landing Clearance',
        'Taxi Clearance',
        'Pushback Clearance',
        'Climb Clearance',
        'Descent Clearance',
        'Enroute Clearance',
        'Crossing Clearance',
        'Approach Clearance',
        'Holding Clearance',
        'Departure Clearance',
        'VFR Flight Following',
        'Special Use Airspace Clearance',
        'Oceanic Clearance'
    ],

    // Flight statuses
    flightStatuses: {
        SCHEDULED: 'scheduled',
        BOARDING: 'boarding',
        DEPARTED: 'departed',
        ARRIVED: 'arrived',
        DELAYED: 'delayed',
        CANCELLED: 'cancelled'
    },

    // User roles
    roles: {
        USER: 'user',
        PILOT: 'pilot',
        FIRST_OFFICER: 'first_officer',
        ATC: 'atc',
        SUPERVISOR: 'supervisor',
        ADMIN: 'admin'
    },

    // Pilot ranks and required mileage
    pilotRanks: [
        { name: 'Trainee', mileage: 0 },
        { name: 'Junior First Officer', mileage: 100 },
        { name: 'First Officer', mileage: 500 },
        { name: 'Senior First Officer', mileage: 1000 },
        { name: 'Captain', mileage: 2000 },
        { name: 'Senior Captain', mileage: 5000 }
    ],

    // Voice channel frequencies
    voiceChannels: {
        GROUND: '121.5',
        TOWER: '118.1',
        APPROACH: '119.1',
        DEPARTURE: '125.2',
        CENTER: '127.4'
    }
};

// Export config for use in other modules
window.config = config;
