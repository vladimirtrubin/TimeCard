const MessageTemplate = require('../models/MessageTemplate');
const logger = require('../utils/logger');

async function createDefaultTemplate() {
    try {
        const defaultTemplate = await MessageTemplate.findOne({
            where: { isDefault: true }
        });

        if (!defaultTemplate) {
            await MessageTemplate.create({
                name: 'Timecard Reminder',
                subject: 'Timecard Reminder',
                template: 'Hello {employeeName},\n\nThis is a reminder to submit your timecard for the current pay period.\n\nThank you,\n{senderName}\n{senderRank}',
                isDefault: true
            });
            logger.info('[Config] Default message template created');
        } else {
            // Update existing template to ensure it has the correct format
            await defaultTemplate.update({
                template: 'Hello {employeeName},\n\nThis is a reminder to submit your timecard for the current pay period.\n\nThank you,\n{senderName}\n{senderRank}'
            });
            logger.info('[Config] Default message template updated');
        }
    } catch (error) {
        logger.error('[Config] Error creating default template:', error);
    }
}

module.exports = { createDefaultTemplate }; 