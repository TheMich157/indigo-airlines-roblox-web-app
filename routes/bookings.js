const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, verifyGamepass } = require('../middleware/auth');

// In-memory storage (replace with database in production)
const bookings = new Map();
const seatHolds = new Map();

// Validation middleware
const validateBooking = [
    body('flightId').isString().trim().notEmpty(),
    body('seatNumber').matches(/^[0-9]{1,2}[A-F]$/),
    body('seatClass').isIn(['economy', 'business']),
    body('passengerName').isString().trim().notEmpty(),
    body('passengerEmail').isEmail().normalizeEmail(),
    body('passengerPhone').optional().matches(/^\+?[0-9]{10,15}$/),
    body('specialRequests').optional().isArray()
];

const validateSeatHold = [
    body('flightId').isString().trim().notEmpty(),
    body('seatNumber').matches(/^[0-9]{1,2}[A-F]$/),
    body('holdDuration').isInt({ min: 1, max: 15 }) // minutes
];

// Get all bookings for a user with filtering and pagination
router.get('/user/:userId', [
    param('userId').isString().trim().notEmpty(),
    param('page').optional().isInt({ min: 1 }),
    param('limit').optional().isInt({ min: 1, max: 100 }),
    param('status').optional().isIn(['confirmed', 'cancelled', 'completed']),
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
        let userBookings = Array.from(bookings.values())
            .filter(booking => booking.userId === req.params.userId);

        // Apply filters
        if (req.query.status) {
            userBookings = userBookings.filter(b => b.status === req.query.status);
        }
        if (req.query.startDate) {
            const startDate = new Date(req.query.startDate);
            userBookings = userBookings.filter(b => new Date(b.createdAt) >= startDate);
        }
        if (req.query.endDate) {
            const endDate = new Date(req.query.endDate);
            userBookings = userBookings.filter(b => new Date(b.createdAt) <= endDate);
        }

        // Sort by creation date descending
        userBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Paginate results
        const totalBookings = userBookings.length;
        const totalPages = Math.ceil(totalBookings / limit);
        const offset = (page - 1) * limit;
        const paginatedBookings = userBookings.slice(offset, offset + limit);

        res.json({
            bookings: paginatedBookings,
            pagination: {
                page,
                limit,
                totalBookings,
                totalPages
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Create a new booking with seat hold verification
router.post('/', [authenticateToken, validateBooking], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if seat is held by this user
        const holdKey = `${req.body.flightId}_${req.body.seatNumber}`;
        const seatHold = seatHolds.get(holdKey);
        
        if (!seatHold || seatHold.userId !== req.user.id) {
            return res.status(400).json({ error: 'Seat not held or hold expired' });
        }

        // If booking business class, verify gamepass
        if (req.body.seatClass === 'business') {
            const hasGamepass = await verifyGamepass(req.user.id);
            if (!hasGamepass) {
                return res.status(403).json({ error: 'Business Class gamepass required' });
            }
        }

        const booking = {
            id: Date.now().toString(),
            userId: req.user.id,
            ...req.body,
            status: 'confirmed',
            confirmationCode: generateConfirmationCode(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Remove seat hold
        seatHolds.delete(holdKey);

        // Save booking
        bookings.set(booking.id, booking);

        // Emit booking created event
        req.app.get('io').emit('booking_created', {
            flightId: booking.flightId,
            seatNumber: booking.seatNumber,
            seatClass: booking.seatClass
        });

        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Hold a seat temporarily
router.post('/hold-seat', [authenticateToken, validateSeatHold], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const holdKey = `${req.body.flightId}_${req.body.seatNumber}`;
        
        // Check if seat is already held or booked
        if (seatHolds.has(holdKey)) {
            return res.status(409).json({ error: 'Seat is already held' });
        }

        const existingBooking = Array.from(bookings.values())
            .find(b => b.flightId === req.body.flightId && 
                      b.seatNumber === req.body.seatNumber &&
                      b.status === 'confirmed');

        if (existingBooking) {
            return res.status(409).json({ error: 'Seat is already booked' });
        }

        const hold = {
            userId: req.user.id,
            flightId: req.body.flightId,
            seatNumber: req.body.seatNumber,
            expiresAt: new Date(Date.now() + (req.body.holdDuration * 60 * 1000))
        };

        seatHolds.set(holdKey, hold);

        // Set timeout to remove hold
        setTimeout(() => {
            seatHolds.delete(holdKey);
            // Emit seat hold expired event
            req.app.get('io').emit('seat_hold_expired', {
                flightId: hold.flightId,
                seatNumber: hold.seatNumber
            });
        }, req.body.holdDuration * 60 * 1000);

        res.json(hold);
    } catch (error) {
        res.status(500).json({ error: 'Failed to hold seat' });
    }
});

// Cancel a booking
router.post('/:id/cancel', [
    authenticateToken,
    param('id').isString().trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const booking = bookings.get(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify user owns the booking
        if (booking.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
        }

        // Check cancellation policy
        const flightDate = new Date(booking.flightDate);
        const now = new Date();
        const hoursUntilFlight = (flightDate - now) / (1000 * 60 * 60);

        if (hoursUntilFlight < 24) {
            return res.status(400).json({ 
                error: 'Cancellation not allowed',
                message: 'Bookings cannot be cancelled within 24 hours of flight'
            });
        }

        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.updatedAt = new Date();
        bookings.set(booking.id, booking);

        // Emit booking cancelled event
        req.app.get('io').emit('booking_cancelled', {
            flightId: booking.flightId,
            seatNumber: booking.seatNumber,
            seatClass: booking.seatClass
        });

        res.json(booking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// Get booking receipt with QR code
router.get('/:id/receipt', [
    authenticateToken,
    param('id').isString().trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const booking = bookings.get(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify user owns the booking
        if (booking.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to view this receipt' });
        }

        const receipt = {
            bookingId: booking.id,
            confirmationCode: booking.confirmationCode,
            flightNumber: booking.flightNumber,
            passenger: booking.passengerName,
            seatNumber: booking.seatNumber,
            seatClass: booking.seatClass,
            price: booking.price,
            bookingDate: booking.createdAt,
            status: booking.status,
            qrCode: await generateQRCode(booking)
        };

        res.json(receipt);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate receipt' });
    }
});

// Utility functions
function generateConfirmationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function generateQRCode(booking) {
    // Implementation would depend on QR code library
    // This is a placeholder
    return `data:image/png;base64,${Buffer.from(JSON.stringify({
        confirmationCode: booking.confirmationCode,
        flightNumber: booking.flightNumber,
        seatNumber: booking.seatNumber
    })).toString('base64')}`;
}

// Cleanup expired holds periodically
setInterval(() => {
    const now = new Date();
    for (const [key, hold] of seatHolds.entries()) {
        if (new Date(hold.expiresAt) <= now) {
            seatHolds.delete(key);
        }
    }
}, 60000); // Check every minute

module.exports = router;
