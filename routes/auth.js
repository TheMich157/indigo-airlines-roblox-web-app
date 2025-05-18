const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const noblox = require('noblox.js');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
require('dotenv').config();

// Rate limiting configuration
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many login attempts, please try again later' }
});

// In-memory storage (replace with Redis in production)
const users = new Map();
const sessions = new Map();
const pendingAuths = new Map();
const blacklistedTokens = new Set();

// Constants
const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    ATC: 'atc',
    TRAINEE_ATC: 'trainee_atc',
    SENIOR_PILOT: 'senior_pilot',
    PILOT: 'pilot',
    TRAINEE_PILOT: 'trainee_pilot',
    PASSENGER: 'passenger'
};

const RANK_TO_ROLE = {
    255: ROLES.OWNER,
    100: ROLES.ADMIN,
    80: ROLES.SUPERVISOR,
    50: ROLES.ATC,
    40: ROLES.TRAINEE_ATC,
    30: ROLES.SENIOR_PILOT,
    20: ROLES.PILOT,
    10: ROLES.TRAINEE_PILOT,
    1: ROLES.PASSENGER
};

// Initialize noblox.js with retry mechanism
async function initializeNoblox(retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            await noblox.setCookie(process.env.ROBLOX_COOKIE);
            console.log('Successfully authenticated with Roblox');
            return;
        } catch (error) {
            console.error(`Roblox authentication attempt ${i + 1} failed:`, error);
            if (i === retryCount - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
        }
    }
}

// Initialize on startup
initializeNoblox().catch(console.error);

// Middleware to verify Roblox signatures
const verifyRobloxSignature = async (req, res, next) => {
    try {
        const signature = req.headers['roblox-signature'];
        if (!signature) {
            return res.status(401).json({ error: 'Missing Roblox signature' });
        }

        const payload = req.body;
        const timestamp = req.headers['roblox-timestamp'];
        
        if (!timestamp || Date.now() - new Date(timestamp).getTime() > 300000) { // 5 minutes
            return res.status(401).json({ error: 'Invalid or expired timestamp' });
        }

        const computedSignature = crypto
            .createHmac('sha256', process.env.ROBLOX_API_KEY)
            .update(JSON.stringify(payload) + timestamp)
            .digest('hex');

        if (signature !== computedSignature) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        next();
    } catch (error) {
        res.status(401).json({ error: 'Signature verification failed' });
    }
};

// Validation middleware
const validateLogin = [
    body('code').isString().trim().notEmpty(),
    body('state').isString().trim().notEmpty()
];

// OAuth login route with rate limiting
router.post('/login', [authLimiter, validateLogin], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { code, state } = req.body;

        // Verify state parameter
        const storedState = pendingAuths.get(state);
        if (!storedState) {
            return res.status(400).json({ error: 'Invalid state parameter' });
        }
        pendingAuths.delete(state);

        // Exchange code for token
        const tokenResponse = await axios.post('https://apis.roblox.com/oauth/v1/token', {
            client_id: process.env.ROBLOX_OAUTH_CLIENT_ID,
            client_secret: process.env.ROBLOX_OAUTH_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.ROBLOX_OAUTH_REDIRECT_URI
        });

        const { access_token, refresh_token } = tokenResponse.data;

        // Get user info with retry mechanism
        const userInfo = await getUserInfo(access_token);

        // Get group rank with verification
        const groupRank = await verifyGroupMembership(userInfo.sub);
        if (!groupRank) {
            return res.status(403).json({ 
                error: 'Group membership required',
                groupId: process.env.ROBLOX_GROUP_ID
            });
        }

        // Create user object with enhanced security
        const user = {
            id: userInfo.sub,
            username: userInfo.preferred_username || userInfo.name,
            displayName: userInfo.nickname,
            role: RANK_TO_ROLE[groupRank] || ROLES.PASSENGER,
            groupRank,
            premium: userInfo.premium,
            created: new Date(),
            lastLogin: new Date(),
            lastIp: req.ip,
            securityVersion: 1, // For forced logout on security events
            permissions: calculatePermissions(groupRank)
        };

        // Store user with session tracking
        users.set(user.id, user);
        const sessionId = crypto.randomBytes(32).toString('hex');
        
        // Create JWT with enhanced security
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                sessionId,
                securityVersion: user.securityVersion
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRY || '7d',
                algorithm: 'HS512'
            }
        );

        // Store session info
        sessions.set(sessionId, {
            userId: user.id,
            createdAt: new Date(),
            lastActivity: new Date(),
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });

        // Set secure cookie with enhanced options
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
            signed: true
        });

        // Store refresh token
        user.refreshToken = refresh_token;
        users.set(user.id, user);

        // Log successful login
        await logAuthEvent(user.id, 'login_success', req);

        res.json({ 
            success: true, 
            user: sanitizeUser(user),
            expiresIn: 7 * 24 * 60 * 60
        });
    } catch (error) {
        console.error('Login error:', error);
        await logAuthEvent(null, 'login_failed', req, error.message);
        res.status(401).json({
            error: 'Authentication failed',
            message: process.env.NODE_ENV === 'production' 
                ? 'Authentication failed' 
                : error.message
        });
    }
});

// Game server authentication with enhanced security
router.post('/game-auth', verifyRobloxSignature, async (req, res) => {
    try {
        const { placeId, jobId, userId, serverKey } = req.body;

        // Verify server key
        if (serverKey !== process.env.GAME_SERVER_KEY) {
            throw new Error('Invalid server key');
        }

        // Verify place ID
        if (placeId !== process.env.ROBLOX_PLACE_ID) {
            throw new Error('Invalid place ID');
        }

        // Get and verify user
        const user = await getAndVerifyUser(userId);
        if (!user) {
            throw new Error('User not found or not authorized');
        }

        // Create game session token with limited scope
        const gameToken = jwt.sign(
            {
                userId,
                placeId,
                jobId,
                scope: 'game',
                permissions: user.permissions
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h',
                algorithm: 'HS512'
            }
        );

        // Log game authentication
        await logAuthEvent(userId, 'game_auth_success', req);

        res.json({
            success: true,
            gameToken,
            user: sanitizeUser(user)
        });
    } catch (error) {
        await logAuthEvent(req.body.userId, 'game_auth_failed', req, error.message);
        res.status(401).json({
            error: 'Game authentication failed',
            message: process.env.NODE_ENV === 'production' 
                ? 'Authentication failed' 
                : error.message
        });
    }
});

// Logout with session cleanup
router.post('/logout', async (req, res) => {
    try {
        const token = req.signedCookies.auth_token;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Add token to blacklist
            blacklistedTokens.add(token);
            
            // Clean up session
            sessions.delete(decoded.sessionId);
            
            // Log logout
            await logAuthEvent(decoded.userId, 'logout_success', req);
        }

        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Token refresh with security checks
router.post('/refresh-token', async (req, res) => {
    try {
        const token = req.signedCookies.auth_token;
        if (!token) {
            throw new Error('No refresh token');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = users.get(decoded.userId);
        const session = sessions.get(decoded.sessionId);

        if (!user || !session) {
            throw new Error('Invalid session');
        }

        // Verify security version
        if (user.securityVersion !== decoded.securityVersion) {
            throw new Error('Security version mismatch');
        }

        // Verify session is still valid
        if (isSessionExpired(session)) {
            throw new Error('Session expired');
        }

        // Create new token
        const newToken = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                sessionId: decoded.sessionId,
                securityVersion: user.securityVersion
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRY || '7d',
                algorithm: 'HS512'
            }
        );

        // Update session
        session.lastActivity = new Date();
        sessions.set(decoded.sessionId, session);

        // Set new cookie
        res.cookie('auth_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
            signed: true
        });

        res.json({ success: true });
    } catch (error) {
        res.status(401).json({
            error: 'Token refresh failed',
            message: process.env.NODE_ENV === 'production' 
                ? 'Token refresh failed' 
                : error.message
        });
    }
});

// Utility functions
async function getUserInfo(accessToken, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            const response = await axios.get('https://apis.roblox.com/oauth/v1/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return response.data;
        } catch (error) {
            if (i === retryCount - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

async function verifyGroupMembership(userId) {
    try {
        return await noblox.getRankInGroup(process.env.ROBLOX_GROUP_ID, userId);
    } catch (error) {
        console.error('Group verification failed:', error);
        return null;
    }
}

function calculatePermissions(groupRank) {
    const permissions = new Set();
    
    // Add base permissions
    permissions.add('view_flights');
    permissions.add('book_flights');
    
    // Add role-specific permissions
    if (groupRank >= 10) permissions.add('access_training');
    if (groupRank >= 20) permissions.add('fly_aircraft');
    if (groupRank >= 30) permissions.add('train_others');
    if (groupRank >= 40) permissions.add('atc_ground');
    if (groupRank >= 50) permissions.add('atc_tower');
    if (groupRank >= 80) permissions.add('manage_flights');
    if (groupRank >= 100) permissions.add('manage_users');
    if (groupRank >= 255) permissions.add('admin_panel');
    
    return Array.from(permissions);
}

function sanitizeUser(user) {
    const { refreshToken, securityVersion, lastIp, ...safeUser } = user;
    return safeUser;
}

function isSessionExpired(session) {
    const maxAge = parseInt(process.env.SESSION_MAX_AGE) || (7 * 24 * 60 * 60 * 1000);
    return Date.now() - new Date(session.lastActivity).getTime() > maxAge;
}

async function logAuthEvent(userId, event, req, details = null) {
    // Implementation would depend on logging system
    console.log({
        timestamp: new Date(),
        userId,
        event,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details
    });
}

// Cleanup tasks
setInterval(() => {
    // Clean up expired sessions
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (isSessionExpired(session)) {
            sessions.delete(sessionId);
        }
    }

    // Clean up blacklisted tokens older than 24 hours
    const yesterday = now - (24 * 60 * 60 * 1000);
    for (const token of blacklistedTokens) {
        try {
            const decoded = jwt.decode(token);
            if (decoded.exp * 1000 < yesterday) {
                blacklistedTokens.delete(token);
            }
        } catch (error) {
            blacklistedTokens.delete(token);
        }
    }
}, 60 * 60 * 1000); // Run every hour

module.exports = router;
