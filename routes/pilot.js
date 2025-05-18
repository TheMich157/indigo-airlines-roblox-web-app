const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { verifyGamepass } = require('../middleware/auth');

// In-memory storage (replace with database in production)
const pilotLogs = new Map();
const pilotStats = new Map();
const activeFlights = new Map();
const flightPlans = new Map();

// Validation middleware
const validatePilotId = param('pilotId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Valid pilot ID is required');

const validateFlightLog = [
    body('pilotId').isString().trim().notEmpty(),
    body('flightNumber').isString().trim().notEmpty(),
    body('departure').isString().trim().length(3),
    body('arrival').isString().trim().length(3),
    body('aircraft').isString().trim().notEmpty(),
    body('duration').isNumeric().toFloat(),
    body('miles').isNumeric().toFloat(),
    body('fuelUsed').isNumeric().toFloat().optional(),
    body('remarks').isString().trim().optional()
];

const validateFlightPlan = [
    body('flightNumber').isString().trim().notEmpty(),
    body('departure').isString().trim().length(3),
    body('arrival').isString().trim().length(3),
    body('aircraft').isString().trim().notEmpty(),
    body('cruiseAltitude').isInt({ min: 1000, max: 45000 }),
    body('route').isString().trim().notEmpty(),
    body('alternates').isArray().optional(),
    body('plannedFuel').isNumeric().toFloat()
];

// Get pilot profile and stats
router.get('/profile/:pilotId', validatePilotId, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const stats = pilotStats.get(req.params.pilotId) || {
            totalMiles: 0,
            totalFlights: 0,
            hoursFlown: 0,
            currentRank: 'Trainee First Officer',
            rankProgress: 0,
            aircraftQualifications: ['A320'],
            routeQualifications: ['domestic'],
            lastActivity: null,
            joinDate: new Date(),
            status: 'available'
        };

        // Get recent activity
        const logs = pilotLogs.get(req.params.pilotId) || [];
        const recentFlights = logs.slice(0, 5);

        // Check if pilot is currently flying
        const activeFlight = activeFlights.get(req.params.pilotId);

        res.json({
            stats,
            recentFlights,
            activeFlight,
            qualifications: await getPilotQualifications(req.params.pilotId)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get pilot profile' });
    }
});

// Get pilot flight logs with filtering and pagination
router.get('/logs/:pilotId', [
    validatePilotId,
    param('page').optional().isInt({ min: 1 }),
    param('limit').optional().isInt({ min: 1, max: 100 }),
    param('startDate').optional().isISO8601(),
    param('endDate').optional().isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let logs = pilotLogs.get(req.params.pilotId) || [];

        // Apply date filters
        if (startDate || endDate) {
            logs = logs.filter(log => {
                const logDate = new Date(log.timestamp);
                if (startDate && logDate < startDate) return false;
                if (endDate && logDate > endDate) return false;
                return true;
            });
        }

        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Paginate results
        const totalLogs = logs.length;
        const totalPages = Math.ceil(totalLogs / limit);
        const offset = (page - 1) * limit;
        const paginatedLogs = logs.slice(offset, offset + limit);

        res.json({
            logs: paginatedLogs,
            pagination: {
                page,
                limit,
                totalLogs,
                totalPages
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get flight logs' });
    }
});

// Add flight log entry
router.post('/logs', validateFlightLog, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const log = {
            id: Date.now().toString(),
            ...req.body,
            timestamp: new Date(),
            verified: false
        };

        // Get existing logs or create new array
        const logs = pilotLogs.get(req.body.pilotId) || [];
        logs.push(log);
        pilotLogs.set(req.body.pilotId, logs);

        // Update pilot stats
        await updatePilotStats(req.body.pilotId, log);

        // Remove from active flights
        activeFlights.delete(req.body.pilotId);

        // Notify via Socket.IO
        req.app.get('io').to(`pilot_${req.body.pilotId}`).emit('flight_completed', log);

        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create flight log' });
    }
});

// File flight plan
router.post('/flight-plan', [validateFlightPlan, verifyGamepass], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Validate pilot qualifications
        const qualifications = await getPilotQualifications(req.user.id);
        if (!qualifications.aircraft.includes(req.body.aircraft)) {
            return res.status(403).json({ error: 'Not qualified for this aircraft' });
        }

        const flightPlan = {
            id: Date.now().toString(),
            pilotId: req.user.id,
            status: 'filed',
            timestamp: new Date(),
            ...req.body
        };

        flightPlans.set(flightPlan.id, flightPlan);

        // Notify ATC via Socket.IO
        req.app.get('io').to('atc').emit('flight_plan_filed', flightPlan);

        res.status(201).json(flightPlan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to file flight plan' });
    }
});

// Start flight
router.post('/start-flight', [
    body('flightPlanId').isString().trim().notEmpty(),
    verifyGamepass
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const flightPlan = flightPlans.get(req.body.flightPlanId);
        if (!flightPlan) {
            return res.status(404).json({ error: 'Flight plan not found' });
        }

        if (flightPlan.pilotId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized for this flight' });
        }

        const activeFlight = {
            ...flightPlan,
            startTime: new Date(),
            status: 'active'
        };

        activeFlights.set(req.user.id, activeFlight);

        // Notify ATC via Socket.IO
        req.app.get('io').to('atc').emit('flight_started', activeFlight);

        res.json(activeFlight);
    } catch (error) {
        res.status(500).json({ error: 'Failed to start flight' });
    }
});

// Request rank assessment
router.post('/rank-assessment', verifyGamepass, async (req, res) => {
    try {
        const stats = pilotStats.get(req.user.id);
        if (!stats) {
            return res.status(404).json({ error: 'Pilot stats not found' });
        }

        if (stats.rankProgress < 100) {
            return res.status(400).json({
                error: 'Insufficient progress',
                required: getRankRequirements(stats.currentRank),
                current: {
                    totalMiles: stats.totalMiles,
                    totalFlights: stats.totalFlights,
                    hoursFlown: stats.hoursFlown
                }
            });
        }

        const assessment = {
            id: Date.now().toString(),
            pilotId: req.user.id,
            currentRank: stats.currentRank,
            stats: { ...stats },
            status: 'pending',
            timestamp: new Date()
        };

        // Notify supervisors via Socket.IO
        req.app.get('io').to('supervisors').emit('rank_assessment_requested', assessment);

        res.json(assessment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to request rank assessment' });
    }
});

// Utility functions
async function updatePilotStats(pilotId, log) {
    const stats = pilotStats.get(pilotId) || {
        totalMiles: 0,
        totalFlights: 0,
        hoursFlown: 0,
        currentRank: 'Trainee First Officer',
        rankProgress: 0,
        aircraftQualifications: ['A320'],
        routeQualifications: ['domestic'],
        lastActivity: null,
        joinDate: new Date(),
        status: 'available'
    };

    // Update basic stats
    stats.totalMiles += log.miles || 0;
    stats.totalFlights += 1;
    stats.hoursFlown += log.duration || 0;
    stats.lastActivity = new Date();

    // Calculate rank progress
    const requirements = getRankRequirements(stats.currentRank);
    if (requirements) {
        const milesProgress = Math.min(100, (stats.totalMiles / requirements.miles) * 100);
        const flightsProgress = Math.min(100, (stats.totalFlights / requirements.flights) * 100);
        const hoursProgress = Math.min(100, (stats.hoursFlown / requirements.hours) * 100);
        stats.rankProgress = Math.floor((milesProgress + flightsProgress + hoursProgress) / 3);
    }

    pilotStats.set(pilotId, stats);
}

function getRankRequirements(currentRank) {
    const requirements = {
        'Trainee First Officer': {
            miles: 5000,
            flights: 20,
            hours: 50
        },
        'First Officer': {
            miles: 15000,
            flights: 50,
            hours: 150
        },
        'Senior First Officer': {
            miles: 30000,
            flights: 100,
            hours: 300
        },
        'Captain': {
            miles: 50000,
            flights: 200,
            hours: 500
        }
    };

    return requirements[currentRank];
}

async function getPilotQualifications(pilotId) {
    const stats = pilotStats.get(pilotId);
    if (!stats) {
        return {
            aircraft: ['A320'],
            routes: ['domestic'],
            special: []
        };
    }

    return {
        aircraft: stats.aircraftQualifications,
        routes: stats.routeQualifications,
        special: getSpecialQualifications(stats)
    };
}

function getSpecialQualifications(stats) {
    const special = [];
    if (stats.hoursFlown >= 1000) special.push('long_haul');
    if (stats.totalFlights >= 500) special.push('experienced');
    if (stats.currentRank === 'Captain') special.push('instructor');
    return special;
}

module.exports = router;
