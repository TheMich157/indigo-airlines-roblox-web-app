// Import route modules
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/bookings');
const atcRoutes = require('./routes/atc');
const pilotRoutes = require('./routes/pilot');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
// Import middleware
const { authenticateToken, verifyRole } = require('./middleware/auth');

// Protected API routes
app.use('/api/flights', authenticateToken, flightRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/atc', authenticateToken, verifyRole(['atc']), atcRoutes);
app.use('/api/pilot', authenticateToken, verifyRole(['pilot']), pilotRoutes);

// Public routes

// Make io available to routes
app.set('io', io);

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve all non-API routes through index.html for client-side routing
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// In-memory storage (replace with database in production)
const flights = new Map();
const bookings = new Map();
const users = new Map();
const pilotLogs = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    // Handle ATC clearances
    socket.on('atc_clearance', (data) => {
        // Broadcast clearance to all connected clients
        io.emit('clearance_issued', {
            flightNumber: data.flightNumber,
            clearanceType: data.clearanceType,
            message: data.message
        });
    });

    // Handle voice channel connections
    socket.on('join_voice_channel', (data) => {
        socket.join(`voice_${data.frequency}`);
        io.to(`voice_${data.frequency}`).emit('user_joined', {
            userId: data.userId,
            role: data.role
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// API Routes

// Auth routes
app.post('/api/auth/roblox', (req, res) => {
    // TODO: Implement actual Roblox authentication
    const mockUser = {
        id: '12345',
        username: req.body.username,
        role: req.body.role || 'passenger'
    };

    const token = jwt.sign(mockUser, 'your-secret-key', { expiresIn: '24h' });
    res.json({ token, user: mockUser });
});

// Flight routes
app.post('/api/flights', (req, res) => {
    const flight = {
        id: Date.now().toString(),
        ...req.body,
        status: 'Scheduled'
    };
    flights.set(flight.id, flight);
    res.json(flight);
});

app.get('/api/flights', (req, res) => {
    res.json(Array.from(flights.values()));
});

// Booking routes
app.post('/api/bookings', (req, res) => {
    const booking = {
        id: Date.now().toString(),
        ...req.body,
        status: 'Confirmed'
    };
    bookings.set(booking.id, booking);
    res.json(booking);
});

app.get('/api/bookings/:userId', (req, res) => {
    const userBookings = Array.from(bookings.values())
        .filter(booking => booking.userId === req.params.userId);
    res.json(userBookings);
});

// Pilot routes
app.get('/api/pilot/logs/:pilotId', (req, res) => {
    const logs = pilotLogs.get(req.params.pilotId) || [];
    res.json(logs);
});

app.post('/api/pilot/logs', (req, res) => {
    const log = {
        id: Date.now().toString(),
        ...req.body,
        timestamp: new Date()
    };
    const pilotId = req.body.pilotId;
    const logs = pilotLogs.get(pilotId) || [];
    logs.push(log);
    pilotLogs.set(pilotId, logs);
    res.json(log);
});

// ATC routes
app.post('/api/atc/clearance', (req, res) => {
    const clearance = {
        id: Date.now().toString(),
        ...req.body,
        timestamp: new Date()
    };
    
    // Broadcast clearance via Socket.IO
    io.emit('clearance_issued', clearance);
    res.json(clearance);
});

// Gamepass verification route (mock)
app.get('/api/verify-gamepass/:userId', (req, res) => {
    // TODO: Implement actual Roblox gamepass verification
    res.json({
        hasGamepass: false,
        message: 'User does not own the Business Class gamepass'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export for testing
module.exports = app;
