const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)){
    fs.mkdirSync(logsDir, { recursive: true });
}

// Clear previous logs before starting
const apiLogPath = path.join(logsDir, 'api.log');
const errorLogPath = path.join(logsDir, 'error.log');
const adminLogPath = path.join(logsDir, 'admin.log');

// Function to clear log file
const clearLogFile = (filePath) => {
    fs.writeFileSync(filePath, '', 'utf8');
};

// Configure logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: apiLogPath,
            level: 'info'
        }),
        new winston.transports.File({ 
            filename: errorLogPath,
            level: 'error'
        }),
        new winston.transports.File({ 
            filename: adminLogPath,
            level: 'info'
        })
    ]
});

// Clear logs before starting
clearLogFile(apiLogPath);
clearLogFile(errorLogPath);

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

module.exports = logger;
