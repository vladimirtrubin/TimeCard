const Employee = require('../models/Employee');
const Timecard = require('../models/Timecard');
const axios = require('axios');
const dotenv = require('dotenv');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const bcryptjs = require('bcryptjs');  // Changed from 'bcrypt' to 'bcryptjs'
const fs = require('fs').promises;
const path = require('path');

dotenv.config();

// Configure API settings
const API_CONFIG = {
    baseUrl: process.env.BASE_URL,
    headers: {
        'Authorization': process.env.API_KEY,
        'Content-Type': 'application/json'
    }
};

// Add carrier identification function
const identifyCarrier = (textEmail) => {
    if (!textEmail) return 'Unknown';
    
    if (textEmail.includes('@txt.att.net')) return 'AT&T';
    if (textEmail.includes('@vtext.com')) return 'Verizon';
    if (textEmail.includes('@tmomail.net')) return 'T-Mobile';
    if (textEmail.includes('@messaging.sprintpcs.com')) return 'Sprint Mobile';
    
    return 'Other';
};

// Store 2FA codes temporarily (use Redis in production)
const verificationCodes = new Map();

// Add helper function to generate text email
function generateTextEmail(mobile, carrier) {
    if (!mobile) return null;
    
    // Remove any non-numeric characters from mobile
    const cleanMobile = mobile.replace(/\D/g, '');
    
    switch(carrier) {
        case 'AT&T':
            return `${cleanMobile}@txt.att.net`;
        case 'Verizon':
            return `${cleanMobile}@vtext.com`;
        case 'T-Mobile':
            return `${cleanMobile}@tmomail.net`;
        case 'Sprint':
            return `${cleanMobile}@messaging.sprintpcs.com`;
        default:
            return null;
    }
}

exports.getEmployeeById = async (req, res) => {
    const { employeeId } = req.params;
    
    try {
        // First check local database
        const existingEmployee = await Employee.findOne({ 
            where: { employeeId }
        });

        // Get data from Kronos
        const kronosResponse = await axios.post(
            `${process.env.BASE_URL}/api/v1/wfts/person/multi_read`,
            { ids: [employeeId] },
            { 
                headers: {
                    'Authorization': process.env.API_KEY,
                    'Content-Type': 'application/json'
                },
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            }
        );

        const person = kronosResponse.data?.persons?.[0];
        
        if (!person) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found in Kronos system' 
            });
        }

        // Find current rank from profiles
        let currentRank = 'FIREFIGHTER'; // Default rank
        if (person.profiles && person.profiles.length > 0) {
            const now = new Date();
            // Filter active profiles
            const activeProfiles = person.profiles.filter(profile => {
                const fromDate = profile.fromDate ? new Date(profile.fromDate) : new Date(0);
                const thruDate = profile.thruDate ? new Date(profile.thruDate) : new Date('9999-12-31');
                return fromDate <= now && now <= thruDate;
            });

            if (activeProfiles.length > 0) {
                // Sort by fromDate descending to get most recent
                activeProfiles.sort((a, b) => {
                    const dateA = a.fromDate ? new Date(a.fromDate) : new Date(0);
                    const dateB = b.fromDate ? new Date(b.fromDate) : new Date(0);
                    return dateB - dateA;
                });
                currentRank = activeProfiles[0].rank?.name || 'FIREFIGHTER';
            }
        }

        // Format employee information
        const employeeInfo = {
            employeeId: person.employeeId,
            firstName: person.firstName,
            lastName: person.lastName,
            mobile: person.contact1?.contactValue,
            carrier: identifyCarrier(person.contact3?.contactValue),
            email: person.contact4?.contactValue,
            contact3: person.contact3?.contactValue,
            currentRank: existingEmployee?.currentRank || currentRank,
            profile_fromDate: existingEmployee?.profile_fromDate || 'N/A',
            requiresPassword: !!existingEmployee?.password,
            showProfile: true
        };

        return res.status(200).json({
            success: true,
            message: existingEmployee ? 'Employee found in database' : 'Employee found in Kronos',
            employee: employeeInfo
        });

    } catch (error) {
        logger.error('[Employee Lookup] Error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error retrieving employee data',
            error: error.message
        });
    }
};

exports.submitTimecard = async (req, res) => {
    const { employeeId, date, hoursWorked } = req.body;
    logger.info('[Timecard Submit] Starting submission', { employeeId, date, hoursWorked });

    try {
        const employee = await Employee.findOne({ where: { employeeId } });
        if (!employee) {
            logger.warn('[Timecard Submit] Employee not found', { employeeId });
            return res.status(404).json({ message: 'Employee not found.' });
        }

        const timecard = await Timecard.create({ employeeId, date, hoursWorked });
        logger.info('[Timecard Submit] Timecard created successfully', { 
            employeeId, 
            timecardId: timecard.id 
        });

        return res.status(201).json({ 
            message: 'Timecard submitted successfully.', 
            timecard 
        });
    } catch (error) {
        logger.error('[Timecard Submit] Error:', {
            error: error.message,
            employeeId,
            stack: error.stack
        });
        return res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { employeeId, firstName, lastName, currentRank } = req.body;

        logger.info('Updating employee profile:', { 
            employeeId,
            updates: { firstName, lastName, currentRank }
        });

        const [updated] = await Employee.update({
            firstName,
            lastName,
            currentRank
        }, {
            where: { employeeId }
        });

        if (!updated) {
            throw new Error('Employee not found');
        }

        logger.info('Profile updated successfully:', { employeeId });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        logger.error('Profile update error:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

exports.editProfile = async (req, res) => {
    try {
        const { employeeId, firstName, lastName, currentRank, mobile, email } = req.body;
        
        const [updated] = await Employee.update({
            firstName,
            lastName,
            currentRank,
            mobile,
            email
        }, {
            where: { employeeId }
        });

        if (updated) {
            logger.info('Profile edited:', { employeeId });
            res.status(200).json({ message: 'Profile edited successfully' });
        } else {
            throw new Error('Employee not found');
        }
    } catch (error) {
        logger.error('Error editing profile:', error);
        res.status(500).json({ message: 'Error editing profile' });
    }
};

exports.syncWithKronos = async (req, res) => {
    try {
        const { employeeId } = req.body;
        
        // Get latest data from Kronos
        const kronosResponse = await axios.post(
            `${process.env.BASE_URL}/api/v1/wfts/person/multi_read`,
            { ids: [employeeId] },
            { 
                headers: API_CONFIG.headers,
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            }
        );

        const person = kronosResponse.data?.persons?.[0];
        
        if (!person) {
            throw new Error('Employee not found in Kronos');
        }

        // Find most recent profile
        const profiles = person.profiles || [];
        let mostRecentProfile = null;
        let latestDate = null;

        for (const profile of profiles) {
            const fromDateStr = profile.fromDate;
            const rank = profile.rank || {};
            const rankName = rank.name;

            if (fromDateStr && rankName) {
                try {
                    const fromDate = new Date(fromDateStr);
                    if (!latestDate || fromDate > latestDate) {
                        latestDate = fromDate;
                        mostRecentProfile = profile;
                    }
                } catch (error) {
                    logger.error('Error parsing date:', error);
                    continue;
                }
            }
        }

        // Update database
        const [updated] = await Employee.update({
            currentRank: mostRecentProfile ? mostRecentProfile.rank.name : 'N/A',
            profile_fromDate: mostRecentProfile ? mostRecentProfile.fromDate : null
        }, {
            where: { employeeId }
        });

        if (updated) {
            logger.info('Profile synced with Kronos:', { employeeId });
            res.status(200).json({ message: 'Profile synced successfully' });
        } else {
            throw new Error('Employee not found in database');
        }
    } catch (error) {
        logger.error('Error syncing with Kronos:', error);
        res.status(500).json({ message: 'Error syncing with Kronos' });
    }
};

exports.send2FA = async (req, res) => {
    try {
        const { employeeId, email } = req.body;
        
        logger.info('2FA request received:', { 
            employeeId,
            email,
            hasToken: !!req.headers.authorization
        });

        // Generate 6-digit code
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        
        logger.info('Generated verification code:', {
            employeeId,
            codeLength: verificationCode.length
        });

        // Store code with 5-minute expiration
        const verificationData = {
            code: verificationCode,
            expires: Date.now() + 5 * 60 * 1000,
            employeeData: {
                employeeId: employeeId,
                verificationEmail: email
            }
        };

        verificationCodes.set(employeeId, verificationData);
        
        logger.info('Verification data stored:', {
            employeeId,
            expiresAt: new Date(verificationData.expires).toISOString(),
            email: verificationData.employeeData.verificationEmail
        });

        // Prepare email content
        const emailSubject = 'Your Verification Code';
        const emailText = `Your verification code is: ${verificationCode}`;
        const emailHtml = `
            <h2>Verification Code</h2>
            <p>Your verification code is: <strong>${verificationCode}</strong></p>
            <p>This code will expire in 5 minutes.</p>
        `;

        // Send verification code via email
        const emailSent = await sendEmail(
            email,
            emailSubject,
            emailText,
            emailHtml
        );

        if (!emailSent) {
            throw new Error('Failed to send verification email');
        }

        logger.info('2FA process completed:', {
            employeeId,
            email,
            success: true
        });

        res.status(200).json({ 
            success: true,
            message: 'Verification code sent successfully' 
        });
    } catch (error) {
        logger.error('2FA process failed:', {
            error: error.message,
            stack: error.stack,
            employeeId: req.body.employeeId,
            email: req.body.email
        });
        
        res.status(500).json({ 
            success: false,
            message: 'Error sending verification code',
            error: error.message
        });
    }
};

exports.verify2FA = async (req, res) => {
    try {
        const { employeeId, verificationCode } = req.body;
        
        logger.info('Starting 2FA verification:', { 
            employeeId,
            receivedCode: verificationCode
        });

        const storedVerification = verificationCodes.get(employeeId);
        
        logger.info('Retrieved stored verification:', {
            hasStoredVerification: !!storedVerification,
            storedCode: storedVerification?.code,
            expiryTime: storedVerification?.expires ? new Date(storedVerification.expires).toISOString() : null,
            currentTime: new Date().toISOString()
        });

        if (!storedVerification) {
            logger.error('No verification code found:', { employeeId });
            return res.status(400).json({ message: 'No verification code found' });
        }

        if (Date.now() > storedVerification.expires) {
            logger.error('Code expired:', {
                employeeId,
                expiryTime: new Date(storedVerification.expires).toISOString(),
                currentTime: new Date().toISOString()
            });
            verificationCodes.delete(employeeId);
            return res.status(400).json({ message: 'Verification code expired' });
        }

        // Convert both codes to strings and trim any whitespace
        const providedCode = String(verificationCode).trim();
        const storedCode = String(storedVerification.code).trim();

        logger.info('Comparing codes:', {
            providedCode,
            storedCode,
            match: providedCode === storedCode
        });

        if (providedCode !== storedCode) {
            logger.error('Invalid verification code:', {
                employeeId,
                providedCode,
                storedCode
            });
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Check if employee exists in database
        let employee = await Employee.findOne({ where: { employeeId } });
        const needsPassword = !employee?.password;

        logger.info('2FA verification successful:', {
            employeeId,
            needsPassword
        });

        res.status(200).json({
            success: true,
            message: 'Verification successful',
            needsPassword: true
        });
    } catch (error) {
        logger.error('2FA verification error:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: 'Error verifying code' });
    }
};

exports.setPassword = async (req, res) => {
    try {
        const { employeeId, password } = req.body;
        
        logger.info('Setting password and updating profile for employee:', { employeeId });

        const storedVerification = verificationCodes.get(employeeId);
        
        if (!storedVerification) {
            logger.error('No verification data found:', { employeeId });
            return res.status(400).json({ message: 'No verification data found' });
        }

        // Get Kronos data again to ensure we have all required fields
        const kronosResponse = await axios.post(
            `${process.env.BASE_URL}/api/v1/wfts/person/multi_read`,
            { ids: [employeeId] },
            { 
                headers: {
                    'Authorization': process.env.API_KEY,
                    'Content-Type': 'application/json'
                },
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            }
        );

        const person = kronosResponse.data?.persons?.[0];
        if (!person) {
            throw new Error('Employee not found in Kronos');
        }

        // Get latest rank
        const profiles = person.profiles || [];
        let mostRecentProfile = null;
        let latestDate = null;

        for (const profile of profiles) {
            const fromDateStr = profile.fromDate;
            const rank = profile.rank || {};
            const rankName = rank.name;

            if (fromDateStr && rankName) {
                const fromDate = new Date(fromDateStr);
                if (!latestDate || fromDate > latestDate) {
                    latestDate = fromDate;
                    mostRecentProfile = profile;
                }
            }
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        // Log the data we're trying to save
        logger.info('Attempting to save employee data:', {
            employeeId,
            hasPassword: !!hashedPassword,
            hasKronosData: !!person,
            verificationEmail: storedVerification.employeeData?.verificationEmail
        });

        // Update or create employee record with all required fields
        const [employee, created] = await Employee.upsert({
            employeeId: employeeId,
            password: hashedPassword,
            firstName: person.firstName,
            lastName: person.lastName,
            currentRank: mostRecentProfile ? mostRecentProfile.rank.name : null,
            mobile: person.contact1?.contactValue,
            email: storedVerification.employeeData.verificationEmail,
            contact3: person.contact3?.contactValue,
            profile_fromDate: mostRecentProfile ? mostRecentProfile.fromDate : null,
            carrier: person.contact3?.contactValue ? identifyCarrier(person.contact3.contactValue) : null
        });

        // Clean up stored data
        verificationCodes.delete(employeeId);

        logger.info('Employee profile created successfully:', {
            employeeId,
            created,
            profile: {
                firstName: employee.firstName,
                lastName: employee.lastName,
                currentRank: employee.currentRank,
                email: employee.email
            }
        });

        res.status(200).json({ 
            success: true,
            message: 'Password set and profile updated successfully',
            employee: {
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                currentRank: employee.currentRank
            }
        });
    } catch (error) {
        logger.error('Password set error:', {
            error: error.message,
            stack: error.stack,
            employeeId: req.body.employeeId
        });
        res.status(500).json({ 
            success: false,
            message: 'Error setting password and updating profile',
            error: error.message
        });
    }
};

// Add new endpoint for password verification
exports.verifyPassword = async (req, res) => {
    try {
        const { employeeId, password } = req.body;
        
        const employee = await Employee.findOne({ 
            where: { employeeId } 
        });

        if (!employee) {
            return res.status(404).json({ 
                message: 'Employee not found' 
            });
        }

        const isValid = await bcryptjs.compare(password, employee.password);

        if (!isValid) {
            return res.status(401).json({ 
                message: 'Invalid password' 
            });
        }

        res.status(200).json({
            message: 'Password verified successfully',
            employee: {
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                currentRank: employee.currentRank
            }
        });
    } catch (error) {
        logger.error('Password verification error:', error);
        res.status(500).json({ 
            message: 'Error verifying password' 
        });
    }
};

// Add new function to handle profile confirmation
exports.confirmProfile = async (req, res) => {
    try {
        const { 
            employeeId, 
            firstName,
            lastName,
            currentRank, 
            profile_fromDate,
            mobile,
            email,
            contact3,
            carrier
        } = req.body;
        
        logger.info('Confirming profile data:', {
            employeeId,
            firstName,
            lastName,
            currentRank,
            profile_fromDate
        });

        // Check if employee exists
        let employee = await Employee.findOne({ where: { employeeId } });

        if (employee) {
            // Update existing employee
            await employee.update({
                firstName,
                lastName,
                currentRank,
                profile_fromDate,
                mobile,
                email,
                contact3,
                carrier
            });
            logger.info('Updated existing employee profile:', { employeeId });
        } else {
            // Create new employee record
            employee = await Employee.create({
                employeeId,
                firstName,
                lastName,
                currentRank,
                profile_fromDate,
                mobile,
                email,
                contact3,
                carrier
            });
            logger.info('Created new employee profile:', { employeeId });
        }

        res.status(200).json({
            message: 'Profile confirmed and saved',
            employee: {
                employeeId,
                firstName,
                lastName,
                currentRank,
                profile_fromDate
            }
        });
    } catch (error) {
        logger.error('Error confirming profile:', error);
        res.status(500).json({ 
            message: 'Error saving profile data',
            error: error.message 
        });
    }
};
