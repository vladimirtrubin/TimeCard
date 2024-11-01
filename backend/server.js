const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');

// Enable CORS with specific options for Replit
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Parse JSON bodies
app.use(express.json());

// API routes should come before static file serving
app.use('/api', require('./routes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from the frontend build
const frontendPath = path.join(__dirname, '../frontend/public');
app.use(express.static(frontendPath));

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Serving frontend from: ${frontendPath}`);
}); 