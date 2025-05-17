const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');

// TODO: Replace with your real database logic
const users = new Map();

// Roblox OAuth login route
router.post('/login', async (req, res) => {
    const { robloxToken } = req.body;
    if (!robloxToken) {
        return res.status(400).json({ error: 'Roblox OAuth token required' });
    }

    try {
        // Get Roblox user info using OAuth token
        const userInfo = await axios.get('https://apis.roblox.com/oauth/v1/userinfo', {
            headers: { Authorization: `Bearer ${robloxToken}` }
        });

        // Save or update user in your database here
        const user = {
            id: userInfo.data.sub,
            username: userInfo.data.name,
            robloxId: userInfo.data.sub,
            role: 'passenger' // TODO: Set role from your DB/group logic
        };
        users.set(user.id, user);

        // Issue JWT for your backend
        const token = jwt.sign(user, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        res.json({ token, user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid Roblox OAuth token', details: error.message });
    }
});

// Gamepass verification endpoint (for middleware)
router.get('/verify-gamepass/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const gamepassId = process.env.ROBLOX_GAMEPASS_ID;
        const url = `https://inventory.roblox.com/v1/users/${userId}/items/GamePass/${gamepassId}`;
        const response = await axios.get(url);
        const hasGamepass = Array.isArray(response.data.data) && response.data.data.length > 0;
        res.json({ hasGamepass });
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify gamepass', details: error.message });
    }
});

// Get user profile (requires authentication)
router.get('/profile', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        res.json({ user });
    });
});

module.exports = router;
