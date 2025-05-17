const express = require('express');
const router = express.Router();

// In-memory storage for clearances and active flights
const clearances = new Map();
const activeFlights = new Map();

// Get all active flights
router.get('/active-flights', (req, res) => {
    res.json(Array.from(activeFlights.values()));
});

// Issue clearance
router.post('/clearance', (req, res) => {
    // Verify ATC role
    if (!req.body.atcId) {
        return res.status(401).json({ error: 'ATC authentication required' });
    }

    const clearance = {
        id: Date.now().toString(),
        ...req.body,
        timestamp: new Date(),
        status: 'Issued'
    };

    clearances.set(clearance.id, clearance);

    // Emit clearance via Socket.IO (handled in server.js)
    req.app.get('io').emit('clearance_issued', clearance);

    res.status(201).json(clearance);
});

// Get clearance history for a flight
router.get('/clearances/:flightId', (req, res) => {
    const flightClearances = Array.from(clearances.values())
        .filter(clearance => clearance.flightId === req.params.flightId)
        .sort((a, b) => b.timestamp - a.timestamp);
    
    res.json(flightClearances);
});

// Update flight status
router.patch('/flight-status/:flightId', (req, res) => {
    // Verify ATC role
    if (!req.body.atcId) {
        return res.status(401).json({ error: 'ATC authentication required' });
    }

    const flight = activeFlights.get(req.params.flightId);
    if (!flight) {
        return res.status(404).json({ error: 'Flight not found' });
    }

    const updatedFlight = {
        ...flight,
        status: req.body.status,
        updatedAt: new Date()
    };

    activeFlights.set(req.params.flightId, updatedFlight);

    // Emit status update via Socket.IO
    req.app.get('io').emit('flight_status_updated', updatedFlight);

    res.json(updatedFlight);
});

// Issue delay
router.post('/delay/:flightId', (req, res) => {
    // Verify ATC role
    if (!req.body.atcId) {
        return res.status(401).json({ error: 'ATC authentication required' });
    }

    const flight = activeFlights.get(req.params.flightId);
    if (!flight) {
        return res.status(404).json({ error: 'Flight not found' });
    }

    const delay = {
        id: Date.now().toString(),
        flightId: req.params.flightId,
        reason: req.body.reason,
        duration: req.body.duration,
        issuedBy: req.body.atcId,
        timestamp: new Date()
    };

    const updatedFlight = {
        ...flight,
        status: 'Delayed',
        delay,
        updatedAt: new Date()
    };

    activeFlights.set(req.params.flightId, updatedFlight);

    // Emit delay notification via Socket.IO
    req.app.get('io').emit('flight_delayed', updatedFlight);

    res.json(updatedFlight);
});

// Get weather information
router.get('/weather', (req, res) => {
    // TODO: Implement actual weather API integration
    const mockWeather = {
        windDirection: `${Math.floor(Math.random() * 360)}° @ ${Math.floor(Math.random() * 30)}kts`,
        visibility: `${Math.floor(Math.random() * 10 + 5)}km`,
        cloudBase: `${Math.floor(Math.random() * 3000 + 1000)}ft`,
        temperature: `${Math.floor(Math.random() * 20 + 15)}°C`,
        updatedAt: new Date()
    };

    res.json(mockWeather);
});

// Join voice channel
router.post('/voice/join', (req, res) => {
    // Verify ATC role
    if (!req.body.atcId) {
        return res.status(401).json({ error: 'ATC authentication required' });
    }

    // Emit voice channel join via Socket.IO
    req.app.get('io').emit('voice_channel_joined', {
        userId: req.body.atcId,
        frequency: req.body.frequency,
        role: 'ATC'
    });

    res.json({ message: 'Joined voice channel successfully' });
});

// Leave voice channel
router.post('/voice/leave', (req, res) => {
    // Verify ATC role
    if (!req.body.atcId) {
        return res.status(401).json({ error: 'ATC authentication required' });
    }

    // Emit voice channel leave via Socket.IO
    req.app.get('io').emit('voice_channel_left', {
        userId: req.body.atcId,
        frequency: req.body.frequency,
        role: 'ATC'
    });

    res.json({ message: 'Left voice channel successfully' });
});

// Get ATC statistics
router.get('/stats', (req, res) => {
    const allClearances = Array.from(clearances.values());
    const stats = {
        totalClearances: allClearances.length,
        activeFlights: activeFlights.size,
        clearancesByType: allClearances.reduce((acc, clearance) => {
            acc[clearance.type] = (acc[clearance.type] || 0) + 1;
            return acc;
        }, {}),
        delayedFlights: Array.from(activeFlights.values()).filter(f => f.status === 'Delayed').length
    };

    res.json(stats);
});

module.exports = router;
