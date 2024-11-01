const { body, validationResult } = require('express-validator');

const timecardValidation = [
    body('employeeId').notEmpty().trim(),
    body('date').isDate(),
    body('hoursWorked').isFloat({ min: 0, max: 24 }),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { timecardValidation };
