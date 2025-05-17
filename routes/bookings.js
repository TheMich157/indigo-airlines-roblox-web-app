const express = require('express');
const { authenticateToken, verifyGamepass } = require('../middleware/auth');
const router = express.Router();

// In-memory storage for bookings
const bookings = new Map();

// Get all bookings for a user
router.get('/user/:userId', (req, res) => {
    const userBookings = Array.from(bookings.values())
        .filter(booking => booking.userId === req.params.userId);
    res.json(userBookings);
});

// Get a specific booking
router.get('/:id', (req, res) => {
    const booking = bookings.get(req.params.id);
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
});

// Create a new booking
router.post('/', authenticateToken, async (req, res, next) => {
    // If booking business class, check gamepass
    if (req.body.seatClass === 'business') {
        return verifyGamepass(req, res, () => createBooking(req, res));
    }
    createBooking(req, res);
});

function createBooking(req, res) {
    if (!req.body.userId) {
        return res.status(401).json({ error: 'User authentication required' });
    }
    const booking = {
        id: Date.now().toString(),
        ...req.body,
        status: 'Confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    bookings.set(booking.id, booking);
    res.status(201).json(booking);
}

// Update a booking
router.put('/:id', authenticateToken, (req, res) => {
    const booking = bookings.get(req.params.id);
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify user owns the booking
    if (booking.userId !== req.body.userId) {
        return res.status(403).json({ error: 'Unauthorized to modify this booking' });
    }

    const updatedBooking = {
        ...booking,
        ...req.body,
        id: booking.id, // Prevent ID from being modified
        updatedAt: new Date()
    };
    bookings.set(booking.id, updatedBooking);
    res.json(updatedBooking);
});

// Cancel a booking
router.delete('/:id', authenticateToken, (req, res) => {
    const booking = bookings.get(req.params.id);
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify user owns the booking
    if (booking.userId !== req.query.userId) {
        return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    bookings.delete(req.params.id);
    res.status(204).send();
});

// Get booking statistics
router.get('/stats/overview', (req, res) => {
    const allBookings = Array.from(bookings.values());
    const stats = {
        total: allBookings.length,
        economy: allBookings.filter(b => b.seatClass === 'economy').length,
        business: allBookings.filter(b => b.seatClass === 'business').length,
        revenue: allBookings.reduce((total, booking) => total + (booking.price || 0), 0)
    };
    res.json(stats);
});

// Check seat availability
router.get('/availability/:flightId', (req, res) => {
    const flightBookings = Array.from(bookings.values())
        .filter(booking => booking.flightId === req.params.flightId);
    
    const occupiedSeats = flightBookings.map(booking => booking.seatNumber);
    
    res.json({
        flightId: req.params.flightId,
        occupiedSeats
    });
});

// Get booking receipt
router.get('/:id/receipt', authenticateToken, (req, res) => {
    const booking = bookings.get(req.params.id);
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify user owns the booking
    if (booking.userId !== req.query.userId) {
        return res.status(403).json({ error: 'Unauthorized to view this receipt' });
    }

    const receipt = {
        bookingId: booking.id,
        flightNumber: booking.flightNumber,
        passenger: booking.passengerName,
        seatNumber: booking.seatNumber,
        seatClass: booking.seatClass,
        price: booking.price,
        bookingDate: booking.createdAt,
        status: booking.status
    };

    res.json(receipt);
});

module.exports = router;
