const ExcelJS = require('exceljs');
const logger = require('./logger');

const exportTimecards = async (timecards, format = 'xlsx') => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Timecards');
        
        worksheet.columns = [
            { header: 'Employee ID', key: 'employeeId' },
            { header: 'Date', key: 'date' },
            { header: 'Hours', key: 'hoursWorked' }
        ];
        
        timecards.forEach(timecard => {
            worksheet.addRow(timecard);
        });
        
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    } catch (error) {
        logger.error('Export failed:', error);
        throw error;
    }
};

module.exports = { exportTimecards };
