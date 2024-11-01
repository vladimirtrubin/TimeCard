const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

async function initializeDirectories() {
    const dirs = [
        path.join(__dirname, '../../databases'),
        path.join(__dirname, '../logs')
    ];

    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
            logger.info(`Directory created/verified: ${dir}`);
        } catch (error) {
            logger.error(`Failed to create directory ${dir}:`, error);
            process.exit(1);
        }
    }
}

module.exports = { initializeDirectories };
