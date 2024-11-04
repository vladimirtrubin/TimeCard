<<<<<<< HEAD
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

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Your API routes here
app.use('/api', require('./routes'));

// Handle other routes by serving the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
=======
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
>>>>>>> c2ea421738a9bef670c45cd37fc260e8f53b6e39
}); 