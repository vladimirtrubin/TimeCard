const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const { initializeDirectories } = require('./utils/init');
const fs = require('fs').promises;
const path = require('path');
const { createDefaultTemplate } = require('./config/defaultTemplate');

// Load environment variables once
dotenv.config();

// Log environment variables check
logger.info('Environment Check:', {
    hasBaseUrl: !!process.env.BASE_URL,
    hasApiKey: !!process.env.API_KEY,
    baseUrlValue: process.env.BASE_URL,
    apiKeyLength: process.env.API_KEY ? process.env.API_KEY.length : 0
});

// Import routes and middleware
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const pdfRoutes = require('./routes/pdf');
const testRoutes = require('./routes/test');
const errorHandler = require('./middleware/errorHandler');
const { sequelizeOrg, sequelizeEmp } = require('./config/database');
const timecardRoutes = require('./routes/timecard');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Update CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',  // Frontend port
        'http://localhost:5000',  // Backend port
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000',
        'http://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Routes
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/timecard', timecardRoutes);

// Add this before registering the admin routes
console.log('Registering admin routes...');
app.use('/api/admin', adminRoutes);
console.log('Admin routes registered');

// Add this after registering all routes
app.use((req, res, next) => {
    console.log(`Request received: ${req.method} ${req.path}`);
    next();
});

// Error handling
app.use(errorHandler);

// Database initialization
async function initializeDatabases() {
    try {
        await Promise.all([
            sequelizeOrg.authenticate(),
            sequelizeEmp.authenticate()
        ]);
        logger.info('Databases connected...');
        
        await Promise.all([
            sequelizeOrg.sync(),
            sequelizeEmp.sync()
        ]);
        logger.info('Databases synced.');
        createDefaultTemplate();
    } catch (err) {
        logger.error('Database Error:', err);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

async function ensureDirectories() {
    const dirs = [
        path.join(__dirname, 'generated_pdfs'),
        path.join(__dirname, 'logs')
    ];

    for (const dir of dirs) {
        try {
            await fs.access(dir);
            logger.info(`Directory exists: ${dir}`);
        } catch {
            await fs.mkdir(dir, { recursive: true });
            logger.info(`Created directory: ${dir}`);
        }
    }
}

// Wrap all initialization in async function
async function startServer() {
    try {
        await ensureDirectories();
        // Initialize in sequence
        await initializeDirectories();
        await initializeDatabases();
        
        // Health check endpoint
        app.get('/api/health', (req, res) => {
            logger.info('Health check endpoint hit');
            res.json({ status: 'OK', timestamp: new Date().toISOString() });
        });
        
        // Start server
        app.listen(PORT, HOST, () => {
            logger.info(`Backend server running on http://${HOST}:${PORT}`);
            logger.info(`Test the API at http://localhost:${PORT}/api/health`);
            logger.info(`For local network access, use: http://192.168.1.101:${PORT}/api/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch(error => {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
});
