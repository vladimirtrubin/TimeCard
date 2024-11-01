// Create this new file to verify database contents
const { sequelizeOrg } = require('../config/database');
const Organization = require('../models/Organization');

async function verifyDatabase() {
    try {
        await sequelizeOrg.authenticate();
        console.log('Database connection OK');

        // Get table info
        const [results] = await sequelizeOrg.query('PRAGMA table_info(Organizations);');
        console.log('Table structure:', results);

        const orgs = await Organization.findAll();
        console.log('Organizations in database:', orgs.map(org => ({
            name: org.name,
            email: org.email
        })));
    } catch (error) {
        console.error('Database verification failed:', error);
    }
    process.exit();
}

verifyDatabase();
