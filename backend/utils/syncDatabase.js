const { sequelizeEmp } = require('../config/database');
const Employee = require('../models/Employee');
const logger = require('./logger');

async function syncDatabase() {
    try {
        await sequelizeEmp.sync({ alter: true }); // Use alter instead of force to preserve data
        logger.info('Employee database synced successfully');
    } catch (error) {
        logger.error('Error syncing employee database:', error);
        throw error;
    }
}

// Function to sync a specific employee with Kronos
async function syncEmployeeWithKronos(employeeId) {
    try {
        const employee = await Employee.findOne({ where: { employeeId } });
        if (!employee) {
            throw new Error('Employee not found in database');
        }

        // Update lastKronosUpdate timestamp
        await employee.update({
            lastKronosUpdate: new Date()
        });

        logger.info('Employee synced with Kronos:', { employeeId });
        return true;
    } catch (error) {
        logger.error('Error syncing employee with Kronos:', error);
        throw error;
    }
}

module.exports = {
    syncDatabase,
    syncEmployeeWithKronos
};
