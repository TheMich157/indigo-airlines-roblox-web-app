const jwt = require('jsonwebtoken');
const axios = require('axios');
const express = require('express');
const router = express.Router();

// Authentication middleware (expects JWT from Roblox OAuth)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Role verification middleware
const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Access denied',
                message: `This action requires one of the following roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

// Gamepass verification middleware (uses Roblox API)
const verifyGamepass = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Roblox API endpoint for gamepass ownership
        const userId = req.user.robloxId || req.user.id;
        const gamepassId = process.env.ROBLOX_GAMEPASS_ID;
        // Roblox API: https://games.roblox.com/docs#!/GamePasses/get_v1_game_passes_gamePassId_isUserEligible_userId
        const url = `https://inventory.roblox.com/v1/users/${userId}/items/GamePass/${gamepassId}`;
        const response = await axios.get(url);

        // If the array is not empty, user owns the gamepass
        const hasGamepass = Array.isArray(response.data.data) && response.data.data.length > 0;

        if (!hasGamepass) {
            return res.status(403).json({
                error: 'Gamepass required',
                message: 'You need to own the Business Class gamepass to access this feature'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify gamepass', details: error.message });
    }
};

router.post('/', authenticateToken, verifyRole(['admin', 'supervisor']), (req, res) => { ... });


router.post('/gamepass', authenticateToken, verifyGamepass, (req, res) => {
    // Your logic for handling the request goes here
    res.json({ message: 'Gamepass verified successfully!' });
}
);
// Example route using the middleware
router.get('/protected', authenticateToken, verifyRole(['admin']), (req, res) => {
    res.json({ message: 'This is a protected route for admins only!' });
});
// Example route using the gamepass verification middleware
router.get('/gamepass-protected', authenticateToken, verifyGamepass, (req, res) => {
    res.json({ message: 'This is a protected route for users with the gamepass!' });
});
// Example route for user profile
router.get('/profile', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});
// Example route for user profile
router.get('/profile', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

module.exports = {
    authenticateToken,
    verifyRole,
    verifyGamepass
};
