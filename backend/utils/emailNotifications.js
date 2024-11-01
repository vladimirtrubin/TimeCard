const { sendEmail } = require('./emailService');
const logger = require('./logger');

const sendTimecardNotification = async (employeeData, timecardData) => {
    const subject = `New Timecard Submission - ${employeeData.firstName} ${employeeData.lastName}`;
    const html = `
        <h2>New Timecard Submission</h2>
        <p>Employee: ${employeeData.firstName} ${employeeData.lastName}</p>
        <p>ID: ${employeeData.employeeId}</p>
        <p>Date: ${timecardData.date}</p>
        <p>Hours: ${timecardData.hoursWorked}</p>
    `;

    try {
        await sendEmail(process.env.FINANCE_EMAIL, subject, null, html);
        logger.info(`Timecard notification sent for employee ${employeeData.employeeId}`);
        return true;
    } catch (error) {
        logger.error('Failed to send timecard notification:', error);
        return false;
    }
};

module.exports = { sendTimecardNotification };
