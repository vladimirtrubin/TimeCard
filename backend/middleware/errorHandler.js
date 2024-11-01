// backend/middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('[Error Handler] Caught error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body
    });

    res.status(500).json({ 
        message: 'Error generating timecard.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
};

module.exports = errorHandler;

