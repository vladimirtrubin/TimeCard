const express = require('express');
const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Add your other routes here
router.get('/test', (req, res) => {
  res.json({ message: 'API is working' });
});

module.exports = router; 