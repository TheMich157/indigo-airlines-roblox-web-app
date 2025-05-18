const jwt = require('jsonwebtoken');
const axios = require('axios');

// Authentication middleware (expects JWT from Roblox OAuth)
const authenticateToken = (req, res, next) => {
    // Check both Authorization header and cookie
    const authHeader = req.headers['authorization'];
    const cookieToken = req.cookies?.auth_token;
    const token = authHeader?.split(' ')[1] || cookieToken;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Role verification middleware
const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!Array.isArray(roles)) {
            roles = [roles];
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
        const userId = req.user.userId || req.user.id;
        const gamepassId = process.env.ROBLOX_GAMEPASS_ID;
        
        // First check cache
        const cacheKey = `gamepass:${userId}:${gamepassId}`;
        const cached = await getCache(cacheKey);
        
        if (cached !== null) {
            req.hasGamepass = cached;
            return next();
        }

        // If not in cache, check Roblox API
        const url = `https://inventory.roblox.com/v1/users/${userId}/items/GamePass/${gamepassId}`;
        const response = await axios.get(url);
        const hasGamepass = Array.isArray(response.data.data) && response.data.data.length > 0;

        // Cache the result for 5 minutes
        await setCache(cacheKey, hasGamepass, 300);

        if (!hasGamepass) {
            return res.status(403).json({
                error: 'Gamepass required',
                message: 'You need to own the Business Class gamepass to access this feature'
            });
        }

        req.hasGamepass = true;
        next();
    } catch (error) {
        console.error('Gamepass verification error:', error);
        res.status(500).json({ 
            error: 'Failed to verify gamepass',
            message: 'Unable to verify gamepass ownership. Please try again later.'
        });
    }
};

// Group rank verification middleware
const verifyGroupRank = (minRank) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const userId = req.user.userId || req.user.id;
            const groupId = process.env.ROBLOX_GROUP_ID;
            
            // First check cache
            const cacheKey = `grouprank:${userId}:${groupId}`;
            const cached = await getCache(cacheKey);
            
            if (cached !== null) {
                if (cached >= minRank) {
                    req.groupRank = cached;
                    return next();
                }
                return res.status(403).json({
                    error: 'Insufficient rank',
                    message: `This action requires group rank ${minRank} or higher`
                });
            }

            // If not in cache, check Roblox API
            const url = `https://groups.roblox.com/v1/users/${userId}/groups/roles`;
            const response = await axios.get(url);
            const group = response.data.data.find(g => g.group.id === parseInt(groupId));
            
            if (!group) {
                return res.status(403).json({
                    error: 'Group membership required',
                    message: 'You must be a member of the IndiGo Airlines group'
                });
            }

            const rank = group.role.rank;
            
            // Cache the result for 5 minutes
            await setCache(cacheKey, rank, 300);

            if (rank < minRank) {
                return res.status(403).json({
                    error: 'Insufficient rank',
                    message: `This action requires group rank ${minRank} or higher`
                });
            }

            req.groupRank = rank;
            next();
        } catch (error) {
            console.error('Group rank verification error:', error);
            res.status(500).json({ 
                error: 'Failed to verify group rank',
                message: 'Unable to verify group rank. Please try again later.'
            });
        }
    };
};

// Simple in-memory cache (replace with Redis in production)
const cache = new Map();

async function getCache(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
        cache.delete(key);
        return null;
    }
    return item.value;
}

async function setCache(key, value, ttlSeconds) {
    cache.set(key, {
        value,
        expires: Date.now() + (ttlSeconds * 1000)
    });
}

// Rate limiting middleware
const rateLimit = (requests, period) => {
    const clients = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        
        // Initialize or clean up client record
        if (!clients.has(ip) || now > clients.get(ip).resetTime) {
            clients.set(ip, {
                count: 0,
                resetTime: now + period
            });
        }

        const client = clients.get(ip);
        
        if (client.count >= requests) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Please try again later'
            });
        }

        client.count++;
        next();
    };
};

module.exports = {
    authenticateToken,
    verifyRole,
    verifyGamepass,
    verifyGroupRank,
    rateLimit
};
