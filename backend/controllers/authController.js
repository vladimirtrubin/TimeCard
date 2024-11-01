const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
    logger.info('Login attempt received:', {
        organization: req.body.organization,
        hasPassword: !!req.body.password
    });

    const { organization, password } = req.body;

    try {
        logger.info('Searching for organization:', organization);
        const org = await Organization.findOne({ where: { name: organization } });
        
        if (!org) {
            logger.error('Organization not found:', organization);
            return res.status(404).json({ 
                success: false,
                message: 'Organization not found. Please contact the administrator.' 
            });
        }

        logger.info('Organization found, verifying password');
        const isMatch = await bcryptjs.compare(password, org.password);
        
        if (!isMatch) {
            logger.error('Password verification failed for:', organization);
            return res.status(401).json({ 
                success: false,
                message: 'Incorrect password. Please contact the administrator.' 
            });
        }

        logger.info('Password verified, generating token');
        const token = jwt.sign(
            { orgId: org.id, organization: org.name }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

        logger.info('Login successful for:', organization);
        return res.status(200).json({ 
            success: true,
            message: 'Login successful.', 
            token,
            organization: org.name
        });
    } catch (error) {
        logger.error('Server error during login:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Server error.',
            error: error.message 
        });
    }
};
