const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { verifyGamepass } = require('../middleware/auth');

// In-memory storage (replace with database in production)
const clearances = new Map();
const activeFlights = new Map();
const atcLogs = new Map();
const atcPositions = new Map();
const weatherReports = new Map();

// Validation middleware
const validatePilotId = param('userId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Valid pilot ID is required');

const validateClearance = [
    body('flightId').isString().trim().notEmpty(),
    body('type').isIn(['pushback', 'taxi', 'takeoff', 'landing', 'approach', 'handoff']),
    body('instructions').isString().trim().notEmpty(),
    body('frequency').optional().matches(/^\d{3}\.\d{1,3}$/),
    body('runway').optional().isString().trim(),
    body('restrictions').optional().isArray()
];

const validateWeatherReport = [
    body('windDirection').isInt({ min: 0, max: 360 }),
    body('windSpeed').isInt({ min: 0, max: 100 }),
    body('visibility').isInt({ min: 0 }),
    body('cloudBase').isInt({ min: 0 }),
    body('temperature').isInt({ min: -50, max: 50 }),
    body('qnh').isFloat({ min: 900, max: 1100 }),
    body('phenomena').optional().isArray()
];

// Get all active flights with filtering
router.get('/active-flights', [
    param('sector').optional().isString(),
    param('status').optional().isIn(['taxi', 'takeoff', 'enroute', 'approach', 'landing']),
    param('altitude').optional().isInt({ min: 0, max: 45000 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        let flights = Array.from(activeFlights.values());

        // Apply filters
        if (req.query.sector) {
            flights = flights.filter(f => f.sector === req.query.sector);
        }
        if (req.query.status) {
            flights = flights.filter(f => f.status === req.query.status);
        }
        if (req.query.altitude) {
            const alt = parseInt(req.query.altitude);
            flights = flights.filter(f => Math.abs(f.altitude - alt) <= 1000);
        }

        res.json(flights);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get active flights' });
    }
});

// Issue clearance with enhanced validation
router.post('/clearance', [validateClearance, verifyGamepass], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verify flight exists
        const flight = activeFlights.get(req.body.flightId);
        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }

        // Verify clearance sequence
        const lastClearance = Array.from(clearances.values())
            .filter(c => c.flightId === req.body.flightId)
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!isValidClearanceSequence(lastClearance?.type, req.body.type)) {
            return res.status(400).json({ error: 'Invalid clearance sequence' });
        }

        const clearance = {
            id: Date.now().toString(),
            ...req.body,
            issuedBy: req.user.id,
            position: req.user.position,
            timestamp: new Date(),
            status: 'issued'
        };

        clearances.set(clearance.id, clearance);

        // Update flight status
        flight.status = getClearanceStatus(req.body.type);
        flight.lastClearance = clearance;
        activeFlights.set(flight.id, flight);

        // Log ATC action
        await logATCAction(req.user.id, 'clearance_issued', clearance);

        // Emit via Socket.IO
        const io = req.app.get('io');
        io.to(`flight_${flight.id}`).emit('clearance_issued', clearance);
        io.to('atc').emit('flight_updated', flight);

        res.status(201).json({ clearance, flight });
    } catch (error) {
        res.status(500).json({ error: 'Failed to issue clearance' });
    }
});

// Take position
router.post('/position/take', [
    body('position').isIn(['ground', 'tower', 'approach', 'departure', 'center']),
    body('frequency').matches(/^\d{3}\.\d{1,3}$/),
    verifyGamepass
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if position is already taken
        const currentController = Array.from(atcPositions.values())
            .find(p => p.position === req.body.position && p.active);

        if (currentController && currentController.userId !== req.user.id) {
            return res.status(409).json({ error: 'Position already taken' });
        }

        const position = {
            userId: req.user.id,
            position: req.body.position,
            frequency: req.body.frequency,
            startTime: new Date(),
            active: true
        };

        atcPositions.set(`${req.user.id}_${req.body.position}`, position);

        // Emit via Socket.IO
        const io = req.app.get('io');
        io.emit('atc_position_update', {
            type: 'position_taken',
            position: position
        });

        res.json(position);
    } catch (error) {
        res.status(500).json({ error: 'Failed to take position' });
    }
});

// Release position
router.post('/position/release', [
    body('position').isIn(['ground', 'tower', 'approach', 'departure', 'center']),
    verifyGamepass
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const positionKey = `${req.user.id}_${req.body.position}`;
        const position = atcPositions.get(positionKey);

        if (!position || !position.active) {
            return res.status(404).json({ error: 'Position not found or already released' });
        }

        position.active = false;
        position.endTime = new Date();
        atcPositions.set(positionKey, position);

        // Log position time
        await logATCAction(req.user.id, 'position_released', position);

        // Emit via Socket.IO
        const io = req.app.get('io');
        io.emit('atc_position_update', {
            type: 'position_released',
            position: position
        });

        res.json(position);
    } catch (error) {
        res.status(500).json({ error: 'Failed to release position' });
    }
});

// Submit weather report
router.post('/weather/report', [validateWeatherReport, verifyGamepass], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const report = {
            id: Date.now().toString(),
            ...req.body,
            reportedBy: req.user.id,
            timestamp: new Date()
        };

        weatherReports.set(report.id, report);

        // Calculate weather conditions
        const conditions = calculateWeatherConditions(report);
        report.conditions = conditions;

        // Emit via Socket.IO
        const io = req.app.get('io');
        io.emit('weather_updated', report);

        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit weather report' });
    }
});

// Get ATC statistics
router.get('/stats/:userId', [validatePilotId], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const logs = atcLogs.get(req.params.userId) || [];
        const positions = Array.from(atcPositions.values())
            .filter(p => p.userId === req.params.userId);

        const stats = calculateATCStats(logs, positions);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get ATC statistics' });
    }
});

// Utility functions
function isValidClearanceSequence(lastType, newType) {
    const sequences = {
        'pushback': ['taxi'],
        'taxi': ['takeoff', 'holding'],
        'takeoff': ['departure', 'enroute'],
        'approach': ['landing'],
        'landing': ['taxi'],
        'handoff': ['*']
    };

    if (!lastType) return true;
    return sequences[lastType]?.includes(newType) || sequences[lastType]?.includes('*');
}

function getClearanceStatus(clearanceType) {
    const statusMap = {
        'pushback': 'pushing_back',
        'taxi': 'taxiing',
        'takeoff': 'taking_off',
        'approach': 'approaching',
        'landing': 'landing',
        'handoff': 'transferred'
    };
    return statusMap[clearanceType] || 'unknown';
}

async function logATCAction(userId, action, data) {
    const logs = atcLogs.get(userId) || [];
    const log = {
        id: Date.now().toString(),
        userId,
        action,
        data,
        timestamp: new Date()
    };
    logs.push(log);
    atcLogs.set(userId, logs);
}

function calculateWeatherConditions(report) {
    let conditions = [];
    
    // Visibility conditions
    if (report.visibility < 1000) conditions.push('LIFR');
    else if (report.visibility < 3000) conditions.push('IFR');
    else if (report.visibility < 5000) conditions.push('MVFR');
    else conditions.push('VFR');

    // Wind conditions
    if (report.windSpeed > 25) conditions.push('HIGH_WIND');
    if (report.windSpeed > 15 && report.phenomena?.includes('gusting')) {
        conditions.push('GUSTING');
    }

    // Ceiling conditions
    if (report.cloudBase < 500) conditions.push('LOW_CEILING');

    return conditions;
}

function calculateATCStats(logs, positions) {
    return {
        totalClearances: logs.filter(l => l.action === 'clearance_issued').length,
        totalPositionTime: positions.reduce((acc, p) => {
            if (p.endTime) {
                return acc + (new Date(p.endTime) - new Date(p.startTime));
            }
            return acc;
        }, 0),
        clearancesByType: logs
            .filter(l => l.action === 'clearance_issued')
            .reduce((acc, l) => {
                acc[l.data.type] = (acc[l.data.type] || 0) + 1;
                return acc;
            }, {}),
        positionsByType: positions.reduce((acc, p) => {
            acc[p.position] = (acc[p.position] || 0) + 1;
            return acc;
        }, {}),
        lastActive: positions
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0]?.startTime
    };
}

module.exports = router;
