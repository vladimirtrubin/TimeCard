const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const logger = require('../utils/logger');

router.post('/login', (req, res, next) => {
    logger.info('Login request received:', {
        organization: req.body.organization,
        hasPassword: !!req.body.password
    });
    authController.login(req, res, next);
});

module.exports = router;
