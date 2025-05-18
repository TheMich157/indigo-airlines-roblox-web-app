const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/bookings');
const atcRoutes = require('./routes/atc');
const pilotRoutes = require('./routes/pilot');

// Import middleware
const { authenticateToken, verifyRole, verifyGamepass } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with security
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? 'https://your-production-domain.com' 
            : 'http://localhost:8000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 5000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 10000
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.roblox.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://apis.roblox.com', 'wss:', 'ws:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", 'https://www.roblox.com']
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://your-production-domain.com' 
        : 'http://localhost:8000',
    credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(limiter);

// Make io available to routes
app.set('io', io);

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Invalid token'));
        socket.user = decoded;
        next();
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.user.username}`);

    // Join user-specific room
    socket.join(`user_${socket.user.id}`);

    // Join role-specific rooms
    if (socket.user.roles.includes('pilot')) {
        socket.join('pilots');
    }
    if (socket.user.roles.includes('atc')) {
        socket.join('atc');
    }

    // Handle ATC clearances
    socket.on('atc_clearance', async (data) => {
        try {
            if (!socket.user.roles.includes('atc')) {
                throw new Error('Unauthorized');
            }

            // Broadcast clearance to relevant clients
            io.to(`flight_${data.flightNumber}`).emit('clearance_issued', {
                flightNumber: data.flightNumber,
                clearanceType: data.clearanceType,
                message: data.message,
                issuedBy: socket.user.username,
                timestamp: new Date()
            });

            // Log clearance
            await logATCAction(socket.user.id, 'clearance_issued', data);
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    // Handle voice channel management
    socket.on('join_voice_channel', (data) => {
        try {
            const { frequency } = data;
            const previousChannels = Object.keys(socket.rooms)
                .filter(room => room.startsWith('voice_'));
            
            // Leave previous voice channels
            previousChannels.forEach(channel => {
                socket.leave(channel);
                io.to(channel).emit('user_left_voice', {
                    userId: socket.user.id,
                    username: socket.user.username
                });
            });

            // Join new channel
            socket.join(`voice_${frequency}`);
            io.to(`voice_${frequency}`).emit('user_joined_voice', {
                userId: socket.user.id,
                username: socket.user.username,
                role: socket.user.roles[0]
            });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    // Handle flight updates
    socket.on('flight_update', async (data) => {
        try {
            if (!socket.user.roles.includes('pilot')) {
                throw new Error('Unauthorized');
            }

            // Broadcast flight update
            io.to('atc').emit('flight_status_updated', {
                ...data,
                pilotId: socket.user.id,
                timestamp: new Date()
            });

            // Log flight update
            await logFlightUpdate(socket.user.id, data);
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.user.username}`);
        // Clean up user presence
        await updateUserPresence(socket.user.id, false);
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', authenticateToken, flightRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/atc', authenticateToken, verifyRole(['atc']), atcRoutes);
app.use('/api/pilot', authenticateToken, verifyRole(['pilot']), pilotRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Handle validation errors
    if (err instanceof validationResult) {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.array()
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            message: err.message
        });
    }

    // Handle rate limit errors
    if (err.type === 'RateLimit') {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later'
        });
    }

    // Generic error response
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong' 
            : err.message
    });
});

// Utility functions
async function logATCAction(userId, action, data) {
    // TODO: Implement ATC action logging
    console.log(`ATC Action: ${action}`, { userId, ...data });
}

async function logFlightUpdate(pilotId, data) {
    // TODO: Implement flight update logging
    console.log(`Flight Update from pilot ${pilotId}:`, data);
}

async function updateUserPresence(userId, isOnline) {
    // TODO: Implement user presence tracking
    console.log(`User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
}

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;
