const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const authenticateToken = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// Protect routes below
router.use(authenticateToken);

// Generate timecard PDF for a specific pay period
router.post('/timecard/generate', (req, res, next) => {
    logger.info('[PDF Route] Generate timecard request received:', {
        body: req.body,
        hasToken: !!req.headers.authorization,
        method: req.method,
        url: req.originalUrl,
        headers: {
            ...req.headers,
            authorization: req.headers.authorization ? 'Bearer ***' : undefined
        }
    });
    
    // Verify we have the required data
    if (!req.body.employeeId || !req.body.payPeriod) {
        logger.error('[PDF Route] Missing required parameters');
        return res.status(400).json({
            message: 'Missing required parameters',
            received: req.body
        });
    }
    
    pdfController.generateTimecardPDF(req, res, next);
});

// Download generated timecard
router.get('/timecard/download/:filename', (req, res, next) => {
    logger.info('[PDF Route] Download request received:', {
        filename: req.params.filename,
        hasToken: !!req.headers.authorization
    });
    pdfController.downloadTimecard(req, res, next);
});

router.post('/timecard/submit', pdfController.submitSignedTimecard);

// Add this new route to pdf.js
router.get('/timecard/history/:employeeId', pdfController.getEmployeeTimecards);

module.exports = router;
