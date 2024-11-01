const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger'); // Fix the path

const dbDir = path.join(__dirname, '../../databases');

// Create directory synchronously if it doesn't exist
try {
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info('Created database directory:', { path: dbDir });
    }
} catch (error) {
    logger.error('Failed to create database directory:', error);
    process.exit(1);
}

const sequelizeOrg = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(dbDir, 'organization.db'),
    logging: false
});

const sequelizeEmp = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(dbDir, 'employees.db'),
    logging: false
});

module.exports = { sequelizeOrg, sequelizeEmp };
