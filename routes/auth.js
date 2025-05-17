const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const noblox = require('noblox.js');

// Environment variables
const {
    ROBLOX_GROUP_ID,
    ROBLOX_OAUTH_CLIENT_ID,
    ROBLOX_OAUTH_CLIENT_SECRET,
    JWT_SECRET,
    COOKIE_SECRET
} = process.env;

// In-memory cache (replace with Redis in production)
const users = new Map();
const sessions = new Map();
const pendingAuths = new Map();

// Roblox group rank to role mapping
const rankToRole = {
    255: 'owner',
    100: 'admin',
    80: 'supervisor',
    50: 'atc',
    40: 'trainee_atc',
    30: 'senior_pilot',
    20: 'pilot',
    10: 'trainee_pilot',
    1: 'passenger'
};

// Initialize noblox.js
async function initializeNoblox() {
    try {
        await noblox.setCookie(process.env.ROBLOX_COOKIE);
        console.log('Successfully authenticated with Roblox');
    } catch (error) {
        console.error('Failed to authenticate with Roblox:', error);
    }
}

initializeNoblox();

// Middleware to verify Roblox signatures
const verifyRobloxSignature = async (req, res, next) => {
    const signature = req.headers['roblox-signature'];
    if (!signature) {
        return res.status(401).json({ error: 'Missing Roblox signature' });
    }

    try {
        // Verify signature logic here
        // This would use Roblox's public key to verify the request
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid signature' });
    }
};

// OAuth login route
router.post('/login', async (req, res) => {
    try {
        const { code } = req.body;
        
        // Exchange code for token
        const tokenResponse = await axios.post('https://apis.roblox.com/oauth/v1/token', {
            client_id: ROBLOX_OAUTH_CLIENT_ID,
            client_secret: ROBLOX_OAUTH_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code'
        });

        const { access_token } = tokenResponse.data;

        // Get user info
        const userResponse = await axios.get('https://apis.roblox.com/oauth/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const robloxUser = userResponse.data;

        // Get group rank
        const groupRank = await noblox.getRankInGroup(ROBLOX_GROUP_ID, robloxUser.sub);
        const role = rankToRole[groupRank] || 'passenger';

        // Create user object
        const user = {
            id: robloxUser.sub,
            username: robloxUser.preferred_username || robloxUser.name,
            displayName: robloxUser.nickname,
            role: role,
            groupRank: groupRank,
            premium: robloxUser.premium,
            created: new Date(),
            lastLogin: new Date()
        };

        // Store user
        users.set(user.id, user);

        // Create JWT
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set secure cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            error: 'Authentication failed',
            details: error.message
        });
    }
});

// Game server authentication
router.post('/game-auth', verifyRobloxSignature, async (req, res) => {
    try {
        const { placeId, jobId, userId } = req.body;

        // Verify place ID
        if (placeId !== process.env.ROBLOX_PLACE_ID) {
            throw new Error('Invalid place ID');
        }

        // Get user info
        const user = users.get(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Create game session token
        const gameToken = jwt.sign(
            { userId, placeId, jobId },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            gameToken,
            user: {
                id: user.id,
                role: user.role,
                groupRank: user.groupRank
            }
        });
    } catch (error) {
        res.status(401).json({
            error: 'Game authentication failed',
            details: error.message
        });
    }
});

// Verify game pass
router.get('/verify-gamepass/:userId/:gamepassId', async (req, res) => {
    try {
        const { userId, gamepassId } = req.params;
        const hasPass = await noblox.getGamePass(userId, gamepassId);
        res.json({ success: true, hasPass });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to verify game pass',
            details: error.message
        });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            throw new Error('No authentication token');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.get(decoded.userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Get additional Roblox info
        const [groupRank, premium] = await Promise.all([
            noblox.getRankInGroup(ROBLOX_GROUP_ID, user.id),
            noblox.getPremium(user.id)
        ]);

        res.json({
            success: true,
            user: {
                ...user,
                groupRank,
                premium
            }
        });
    } catch (error) {
        res.status(401).json({
            error: 'Failed to get profile',
            details: error.message
        });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            throw new Error('No refresh token');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.get(decoded.userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Create new token
        const newToken = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set new cookie
        res.cookie('auth_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true });
    } catch (error) {
        res.status(401).json({
            error: 'Failed to refresh token',
            details: error.message
        });
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
