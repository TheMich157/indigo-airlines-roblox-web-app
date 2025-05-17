-- IndiGo Airlines Configuration
return {
    -- Group Configuration
    group = {
        id = 12345678, -- Replace with actual group ID
        ranks = {
            passenger = 1,
            trainee_pilot = 10,
            pilot = 20,
            senior_pilot = 30,
            trainee_atc = 40,
            atc = 50,
            senior_atc = 60,
            supervisor = 80,
            admin = 100,
            owner = 255
        }
    },

    -- Aircraft Configuration
    aircraft = {
        A320 = {
            maxSpeed = 450,        -- knots
            cruiseAltitude = 35000, -- feet
            maxAltitude = 39000,   -- feet
            climbRate = 2000,      -- feet per minute
            maxPassengers = 180,
            fuelCapacity = 24210,  -- kg
            range = 3300,          -- nautical miles
            minRunway = 1800       -- meters
        },
        A330 = {
            maxSpeed = 470,
            cruiseAltitude = 37000,
            maxAltitude = 41000,
            climbRate = 2200,
            maxPassengers = 300,
            fuelCapacity = 139090,
            range = 6350,
            minRunway = 2500
        }
    },

    -- Airport Configuration
    airports = {
        DEL = {
            name = "Indira Gandhi International Airport",
            code = "DEL",
            runways = {
                {
                    name = "09/27",
                    length = 4430,
                    width = 60,
                    heading = 90
                },
                {
                    name = "10/28",
                    length = 3810,
                    width = 60,
                    heading = 100
                },
                {
                    name = "11/29",
                    length = 4430,
                    width = 60,
                    heading = 110
                }
            },
            frequencies = {
                ground = "121.9",
                tower = "118.1",
                approach = "119.1",
                departure = "125.2"
            },
            parking = {
                terminal1 = {
                    gates = {"A1", "A2", "A3", "A4", "A5"},
                    type = "international"
                },
                terminal2 = {
                    gates = {"B1", "B2", "B3", "B4"},
                    type = "domestic"
                }
            }
        },
        BOM = {
            name = "Chhatrapati Shivaji Maharaj International Airport",
            code = "BOM",
            runways = {
                {
                    name = "09/27",
                    length = 3660,
                    width = 60,
                    heading = 90
                },
                {
                    name = "14/32",
                    length = 3445,
                    width = 60,
                    heading = 140
                }
            },
            frequencies = {
                ground = "121.9",
                tower = "118.1",
                approach = "119.1",
                departure = "125.2"
            },
            parking = {
                terminal1 = {
                    gates = {"C1", "C2", "C3", "C4"},
                    type = "international"
                },
                terminal2 = {
                    gates = {"D1", "D2", "D3"},
                    type = "domestic"
                }
            }
        }
    },

    -- Flight Rules
    flightRules = {
        minTakeoffVisibility = 550,  -- meters
        minLandingVisibility = 750,  -- meters
        maxCrosswind = 25,           -- knots
        maxTailwind = 10,            -- knots
        minFuelReserve = 45,         -- minutes
        standardClimbRate = 2000,    -- feet per minute
        standardDescentRate = 1500,  -- feet per minute
        taxiSpeed = 15,              -- knots
        pushbackSpeed = 5            -- knots
    },

    -- Voice Chat Configuration
    voiceChat = {
        enabled = true,
        channels = {
            {name = "Ground", frequency = "121.9"},
            {name = "Tower", frequency = "118.1"},
            {name = "Approach", frequency = "119.1"},
            {name = "Departure", frequency = "125.2"},
            {name = "Center", frequency = "127.4"}
        },
        range = {
            ground = 5000,    -- meters
            tower = 10000,    -- meters
            approach = 50000, -- meters
            center = 100000   -- meters
        }
    },

    -- Weather Configuration
    weather = {
        updateInterval = 300,  -- seconds
        windLayers = {
            surface = {min = 0, max = 2000},    -- feet
            low = {min = 2000, max = 10000},
            mid = {min = 10000, max = 25000},
            high = {min = 25000, max = 45000}
        },
        turbulence = {
            light = {intensity = 0.2, probability = 0.4},
            moderate = {intensity = 0.5, probability = 0.3},
            severe = {intensity = 0.8, probability = 0.1}
        }
    },

    -- Game Settings
    settings = {
        maxPlayers = 50,
        respawnTime = 5,        -- seconds
        afkTimeout = 300,       -- seconds
        simulationRate = 60,    -- Hz
        networkUpdateRate = 20, -- Hz
        physicsUpdateRate = 60  -- Hz
    },

    -- Development Settings
    development = {
        debugMode = false,
        showCollisionBoxes = false,
        showPerformanceStats = false,
        logLevel = "info" -- debug, info, warn, error
    }
}
