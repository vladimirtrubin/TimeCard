const express = require('express');
const router = express.Router();
const timecardController = require('../controllers/timecardController');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.post('/sign', timecardController.signTimecard);

module.exports = router;
