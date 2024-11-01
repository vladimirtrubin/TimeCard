const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const authenticateToken = (req, res, next) => {
    console.log('Authenticating request to:', req.path);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('No token provided');
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.error('[Auth Middleware] Token verification failed:', err);
            return res.status(403).json({ message: 'Invalid token.' });
        }

        logger.info('[Auth Middleware] Token verified successfully:', {
            userId: user.orgId
        });
        
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
