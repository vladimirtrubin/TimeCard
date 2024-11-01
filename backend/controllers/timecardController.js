const TimecardSignature = require('../models/TimecardSignature');
const logger = require('../utils/logger');

exports.signTimecard = async (req, res) => {
    try {
        const { employeeId, payPeriod, signatureDate, employeeName } = req.body;

        logger.info('[Timecard Signature] Signing timecard:', {
            employeeId,
            payPeriod,
            signatureDate
        });

        const signature = await TimecardSignature.create({
            employeeId,
            payPeriod,
            signatureDate,
            employeeName
        });

        logger.info('[Timecard Signature] Timecard signed successfully:', {
            signatureId: signature.id
        });

        res.status(200).json({
            success: true,
            message: 'Timecard signed successfully',
            signature
        });

    } catch (error) {
        logger.error('[Timecard Signature] Error:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Error signing timecard',
            error: error.message
        });
    }
};
