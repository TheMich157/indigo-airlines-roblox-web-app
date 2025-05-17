const express = require('express');
const router = express.Router();

// In-memory storage for pilot data
const pilotLogs = new Map();
const pilotStats = new Map();

// Get pilot profile and stats
router.get('/profile/:pilotId', (req, res) => {
    const stats = pilotStats.get(req.params.pilotId) || {
        totalMiles: 0,
        totalFlights: 0,
        hoursFlown: 0,
        currentRank: 'First Officer',
        rankProgress: 0
    };
    res.json(stats);
});

// Get pilot flight logs
router.get('/logs/:pilotId', (req, res) => {
    const logs = pilotLogs.get(req.params.pilotId) || [];
    res.json(logs.sort((a, b) => b.timestamp - a.timestamp));
});

// Add flight log entry
router.post('/logs', (req, res) => {
    // Verify pilot authentication
    if (!req.body.pilotId) {
        return res.status(401).json({ error: 'Pilot authentication required' });
    }

    const log = {
        id: Date.now().toString(),
        ...req.body,
        timestamp: new Date()
    };

    // Get existing logs or create new array
    const logs = pilotLogs.get(req.body.pilotId) || [];
    logs.push(log);
    pilotLogs.set(req.body.pilotId, logs);

    // Update pilot stats
    updatePilotStats(req.body.pilotId, log);

    res.status(201).json(log);
});

// Update pilot stats based on new flight log
function updatePilotStats(pilotId, log) {
    const stats = pilotStats.get(pilotId) || {
        totalMiles: 0,
        totalFlights: 0,
        hoursFlown: 0,
        currentRank: 'First Officer',
        rankProgress: 0
    };

    // Update stats
    stats.totalMiles += log.miles || 0;
    stats.totalFlights += 1;
    stats.hoursFlown += log.duration || 0;

    // Calculate rank progress
    const rankRequirements = {
        'First Officer': { miles: 5000, flights: 20 },
        'Senior First Officer': { miles: 15000, flights: 50 },
        'Captain': { miles: 30000, flights: 100 }
    };

    // Update rank and progress
    if (stats.currentRank === 'First Officer' && 
        stats.totalMiles >= rankRequirements['Senior First Officer'].miles && 
        stats.totalFlights >= rankRequirements['Senior First Officer'].flights) {
        stats.currentRank = 'Senior First Officer';
        stats.rankProgress = 0;
    } else if (stats.currentRank === 'Senior First Officer' && 
        stats.totalMiles >= rankRequirements['Captain'].miles && 
        stats.totalFlights >= rankRequirements['Captain'].flights) {
        stats.currentRank = 'Captain';
        stats.rankProgress = 100;
    } else {
        const nextRank = stats.currentRank === 'First Officer' ? 'Senior First Officer' : 'Captain';
        const req = rankRequirements[nextRank];
        const milesProgress = Math.min(100, (stats.totalMiles / req.miles) * 100);
        const flightsProgress = Math.min(100, (stats.totalFlights / req.flights) * 100);
        stats.rankProgress = Math.floor((milesProgress + flightsProgress) / 2);
    }

    pilotStats.set(pilotId, stats);
}

// Request rank up
router.post('/rank-up', (req, res) => {
    // Verify pilot authentication
    if (!req.body.pilotId) {
        return res.status(401).json({ error: 'Pilot authentication required' });
    }

    const stats = pilotStats.get(req.body.pilotId);
    if (!stats) {
        return res.status(404).json({ error: 'Pilot stats not found' });
    }

    if (stats.rankProgress < 100) {
        return res.status(400).json({ 
            error: 'Insufficient progress',
            message: 'You have not met the requirements for rank up yet'
        });
    }

    // Create rank up request
    const request = {
        id: Date.now().toString(),
        pilotId: req.body.pilotId,
        currentRank: stats.currentRank,
        stats: { ...stats },
        status: 'Pending',
        timestamp: new Date()
    };

    // Emit rank up request via Socket.IO
    req.app.get('io').emit('rank_up_requested', request);

    res.json(request);
});

// Join voice channel
router.post('/voice/join', (req, res) => {
    // Verify pilot authentication
    if (!req.body.pilotId) {
        return res.status(401).json({ error: 'Pilot authentication required' });
    }

    // Emit voice channel join via Socket.IO
    req.app.get('io').emit('voice_channel_joined', {
        userId: req.body.pilotId,
        frequency: req.body.frequency,
        role: 'Pilot'
    });

    res.json({ message: 'Joined voice channel successfully' });
});

// Leave voice channel
router.post('/voice/leave', (req, res) => {
    // Verify pilot authentication
    if (!req.body.pilotId) {
        return res.status(401).json({ error: 'Pilot authentication required' });
    }

    // Emit voice channel leave via Socket.IO
    req.app.get('io').emit('voice_channel_left', {
        userId: req.body.pilotId,
        frequency: req.body.frequency,
        role: 'Pilot'
    });

    res.json({ message: 'Left voice channel successfully' });
});

// Get upcoming flights for pilot
router.get('/upcoming-flights/:pilotId', (req, res) => {
    // TODO: Implement integration with flights system
    const mockFlights = [
        {
            id: '1',
            flightNumber: '6E-123',
            route: 'COK → BOM',
            departure: '2024-02-20T10:00',
            aircraft: 'A320',
            role: 'Captain'
        },
        {
            id: '2',
            flightNumber: '6E-456',
            route: 'BOM → DEL',
            departure: '2024-02-21T14:30',
            aircraft: 'A330',
            role: 'First Officer'
        }
    ];

    res.json(mockFlights);
});

module.exports = router;
