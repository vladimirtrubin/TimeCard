const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

<<<<<<< HEAD
// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API routes
app.use('/api', require('./routes'));

// Serve index.html for all other routes
=======
// API routes - use correct path
const routes = require('./routes');
app.use('/api', routes);

// Serve static files from frontend/public with correct path
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve index.html for all other routes with correct path
>>>>>>> c2ea421738a9bef670c45cd37fc260e8f53b6e39
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
<<<<<<< HEAD
=======
  console.log(`Current directory: ${__dirname}`);
>>>>>>> c2ea421738a9bef670c45cd37fc260e8f53b6e39
});
