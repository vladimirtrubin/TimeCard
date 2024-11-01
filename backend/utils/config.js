const dotenv = require('dotenv');
const logger = require('./logger');

function validateConfig() {
    const required = [
        'JWT_SECRET',
        'API_KEY',
        'BASE_URL',
        'MAIL_SERVER',
        'MAIL_USERNAME',
        'MAIL_PASSWORD'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        logger.error('Missing required environment variables:', missing);
        process.exit(1);
    }

    logger.info('Environment configuration validated');
}

module.exports = { validateConfig };
