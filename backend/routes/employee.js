const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken } = require('../middleware/security');

// Employee lookup and verification routes
router.get('/:employeeId', authenticateToken, employeeController.getEmployeeById);
router.post('/send-2fa', authenticateToken, employeeController.send2FA);
router.post('/verify-2fa', authenticateToken, employeeController.verify2FA);
router.post('/set-password', authenticateToken, employeeController.setPassword);
router.post('/verify-password', authenticateToken, employeeController.verifyPassword);

// Database operations routes
router.post('/update-profile', authenticateToken, employeeController.updateProfile);
router.post('/edit-profile', authenticateToken, employeeController.editProfile);
router.post('/sync-kronos', authenticateToken, employeeController.syncWithKronos);

// Add this new route
router.post('/confirm-profile', authenticateToken, employeeController.confirmProfile);

module.exports = router;
