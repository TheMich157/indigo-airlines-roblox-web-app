const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, verifyRole, verifyGamepass } = require('../middleware/auth');

// In-memory storage (replace with database in production)
const flights = new Map();
const flightSchedules = new Map();
const flightLogs = new Map();

// Validation middleware
const validateFlight = [
    body('flightNumber').matches(/^6E-\d{3,4}$/),
    body('departure').isString().trim().isLength({ min: 3, max: 3 }),
    body('arrival').isString().trim().isLength({ min: 3, max: 3 }),
    body('aircraft').isIn(['A320', 'A330']),
    body('departureTime').isISO8601(),
    body('arrivalTime').isISO8601(),
    body('price').isObject().custom(price => {
        if (!price.economy || !price.business) return false;
        return Number.isInteger(price.economy) && Number.isInteger(price.business);
    }),
    body('gates').isObject().custom(gates => {
        if (!gates.departure || !gates.arrival) return false;
        return typeof gates.departure === 'string' && typeof gates.arrival === 'string';
    })
];

const validateSearch = [
    query('departure').optional().isString().trim().isLength({ min: 3, max: 3 }),
    query('arrival').optional().isString().trim().isLength({ min: 3, max: 3 }),
    query('date').optional().isISO8601(),
    query('class').optional().isIn(['economy', 'business']),
    query('passengers').optional().isInt({ min: 1, max: 9 })
];

// Get all flights with filtering and pagination
router.get('/', [
    authenticateToken,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled']),
    ...validateSearch
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        let allFlights = Array.from(flights.values());

        // Apply filters
        if (req.query.status) {
            allFlights = allFlights.filter(f => f.status === req.query.status);
        }
        if (req.query.departure) {
            allFlights = allFlights.filter(f => f.departure === req.query.departure);
        }
        if (req.query.arrival) {
            allFlights = allFlights.filter(f => f.arrival === req.query.arrival);
        }
        if (req.query.date) {
            const searchDate = new Date(req.query.date).toDateString();
            allFlights = allFlights.filter(f => 
                new Date(f.departureTime).toDateString() === searchDate
            );
        }
        if (req.query.class) {
            allFlights = allFlights.filter(f => 
                f.availableSeats[req.query.class] >= (req.query.passengers || 1)
            );
        }

        // Sort by departure time
        allFlights.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

        // Paginate results
        const totalFlights = allFlights.length;
        const totalPages = Math.ceil(totalFlights / limit);
        const offset = (page - 1) * limit;
        const paginatedFlights = allFlights.slice(offset, offset + limit);

        res.json({
            flights: paginatedFlights,
            pagination: {
                page,
                limit,
                totalFlights,
                totalPages
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get flights' });
    }
});

// Create a new flight
router.post('/', [
    authenticateToken,
    verifyRole(['admin', 'supervisor']),
    ...validateFlight
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check for duplicate flight number
        const existingFlight = Array.from(flights.values())
            .find(f => f.flightNumber === req.body.flightNumber);
        
        if (existingFlight) {
            return res.status(409).json({ error: 'Flight number already exists' });
        }

        // Calculate flight duration and validate times
        const departure = new Date(req.body.departureTime);
        const arrival = new Date(req.body.arrivalTime);
        const duration = (arrival - departure) / (1000 * 60); // in minutes

        if (duration <= 0) {
            return res.status(400).json({ error: 'Arrival time must be after departure time' });
        }

        const flight = {
            id: Date.now().toString(),
            ...req.body,
            status: 'scheduled',
            duration,
            availableSeats: {
                economy: req.body.aircraft === 'A320' ? 150 : 220,
                business: req.body.aircraft === 'A320' ? 12 : 20
            },
            occupiedSeats: [],
            crew: null,
            createdBy: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        flights.set(flight.id, flight);

        // Create flight schedule
        const schedule = generateFlightSchedule(flight);
        flightSchedules.set(flight.id, schedule);

        // Emit new flight created event
        req.app.get('io').emit('flight_created', flight);

        res.status(201).json({ flight, schedule });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create flight' });
    }
});

// Update flight status
router.patch('/:id/status', [
    authenticateToken,
    verifyRole(['atc', 'admin', 'supervisor']),
    param('id').isString().trim().notEmpty(),
    body('status').isIn(['scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled']),
    body('reason').optional().isString().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const flight = flights.get(req.params.id);
        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }

        // Validate status transition
        if (!isValidStatusTransition(flight.status, req.body.status)) {
            return res.status(400).json({ error: 'Invalid status transition' });
        }

        const updatedFlight = {
            ...flight,
            status: req.body.status,
            statusReason: req.body.reason,
            statusUpdatedBy: req.user.id,
            updatedAt: new Date()
        };

        flights.set(flight.id, updatedFlight);

        // Log status change
        await logFlightUpdate(flight.id, {
            type: 'status_change',
            from: flight.status,
            to: req.body.status,
            reason: req.body.reason,
            updatedBy: req.user.id
        });

        // Emit flight status updated event
        req.app.get('io').emit('flight_status_updated', updatedFlight);

        res.json(updatedFlight);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update flight status' });
    }
});

// Assign crew to flight
router.post('/:id/crew', [
    authenticateToken,
    verifyRole(['admin', 'supervisor']),
    param('id').isString().trim().notEmpty(),
    body('captain').isString().trim().notEmpty(),
    body('firstOfficer').isString().trim().notEmpty(),
    body('cabinCrew').isArray().isLength({ min: 2, max: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const flight = flights.get(req.params.id);
        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }

        // Verify crew qualifications
        const captain = await verifyPilotQualifications(req.body.captain, flight.aircraft, 'captain');
        const firstOfficer = await verifyPilotQualifications(req.body.firstOfficer, flight.aircraft, 'firstOfficer');

        if (!captain || !firstOfficer) {
            return res.status(400).json({ error: 'Crew members not qualified for this aircraft' });
        }

        const updatedFlight = {
            ...flight,
            crew: {
                captain: req.body.captain,
                firstOfficer: req.body.firstOfficer,
                cabinCrew: req.body.cabinCrew
            },
            updatedAt: new Date()
        };

        flights.set(flight.id, updatedFlight);

        // Emit crew assigned event
        req.app.get('io').emit('flight_crew_assigned', {
            flightId: flight.id,
            crew: updatedFlight.crew
        });

        res.json(updatedFlight);
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign crew' });
    }
});

// Get flight logs
router.get('/:id/logs', [
    authenticateToken,
    verifyRole(['admin', 'supervisor', 'atc']),
    param('id').isString().trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const logs = flightLogs.get(req.params.id) || [];
        res.json(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
        res.status(500).json({ error: 'Failed to get flight logs' });
    }
});

// Utility functions
function isValidStatusTransition(from, to) {
    const transitions = {
        'scheduled': ['boarding', 'delayed', 'cancelled'],
        'boarding': ['departed', 'delayed', 'cancelled'],
        'departed': ['arrived', 'delayed'],
        'delayed': ['boarding', 'departed', 'cancelled'],
        'arrived': [],
        'cancelled': []
    };

    return transitions[from]?.includes(to);
}

function generateFlightSchedule(flight) {
    const departure = new Date(flight.departureTime);
    const arrival = new Date(flight.arrivalTime);
    
    return {
        flightId: flight.id,
        checkInStart: new Date(departure.getTime() - (3 * 60 * 60 * 1000)), // 3 hours before
        checkInEnd: new Date(departure.getTime() - (45 * 60 * 1000)), // 45 mins before
        boardingStart: new Date(departure.getTime() - (40 * 60 * 1000)), // 40 mins before
        boardingEnd: new Date(departure.getTime() - (10 * 60 * 1000)), // 10 mins before
        departure,
        arrival,
        baggageClaim: new Date(arrival.getTime() + (20 * 60 * 1000)) // 20 mins after
    };
}

async function logFlightUpdate(flightId, update) {
    const logs = flightLogs.get(flightId) || [];
    const log = {
        id: Date.now().toString(),
        ...update,
        timestamp: new Date()
    };
    logs.push(log);
    flightLogs.set(flightId, logs);
}

async function verifyPilotQualifications(pilotId, aircraft, role) {
    // Implementation would check pilot's qualifications
    // This is a placeholder
    return true;
}

module.exports = router;
