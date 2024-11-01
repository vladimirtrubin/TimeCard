const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const axios = require('axios');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const TimecardValidation = require('../models/TimecardValidation');
const archiver = require('archiver');
const { sendEmail } = require('../utils/emailService');
const TimecardSubmission = require('../models/TimecardSubmission');
const MessageTemplate = require('../models/MessageTemplate');
const MessageHistory = require('../models/MessageHistory');

// Make sure PDFDocument is properly imported
if (!PDFDocument) {
    throw new Error('PDFDocument not properly imported');
}

// Add a test function to verify PDF manipulation works
async function testPdfLib() {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { height } = page.getSize();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        page.drawText('Test PDF', {
            x: 50,
            y: height - 50,
            size: 12,
            font: helveticaFont
        });
        
        const pdfBytes = await pdfDoc.save();
        return true;
    } catch (error) {
        logger.error('PDF-Lib test failed:', error);
        return false;
    }
}

// Test PDF-Lib when route is registered
testPdfLib().then(success => {
    if (success) {
        logger.info('PDF-Lib test successful');
    } else {
        logger.error('PDF-Lib test failed');
    }
});

router.use(authenticateToken);

router.get('/employees', async (req, res) => {
    try {
        logger.info('[Admin] Fetching all employees from Kronos', {
            url: `${process.env.BASE_URL}/api/v1/wfts/person/multi_read`,
            headers: {
                Authorization: process.env.API_KEY ? 'Bearer ***' : 'none'
            }
        });
        
        // Build the request payload to match successful curl
        const payload = {
            "filters": {
                "dateFilter": {
                    "inactiveOnDate": false,
                    "noProfileOnDate": false,
                    "targetDate": new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
                }
            }
        };

        logger.info('[Admin] Request payload:', payload);

        // Make the API request
        const kronosResponse = await axios.post(
            `${process.env.BASE_URL}/api/v1/wfts/person/multi_read?idType=EMPLOYEE`,
            payload,
            { 
                headers: {
                    'Authorization': process.env.API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            }
        );

        logger.info('[Admin] Kronos response received:', {
            status: kronosResponse.status,
            hasData: !!kronosResponse.data,
            personCount: kronosResponse.data?.persons?.length || 0
        });

        if (!kronosResponse.data?.persons) {
            throw new Error('No data received from Kronos');
        }

        // Process each employee
        const employees = kronosResponse.data.persons.map(person => {
            logger.debug('[Admin] Processing employee:', {
                employeeId: person.employeeId,
                name: `${person.firstName} ${person.lastName}`
            });

            return {
                employeeId: person.employeeId,
                firstName: person.firstName,
                lastName: person.lastName,
                textEmail: person.contact3?.contactValue || 'N/A',
                email: person.contact4?.contactValue || 'N/A',
                status: person.status || 'Active',
                hireDate: person.hireDate || 'N/A',
                department: person.department?.name || 'N/A',
                position: person.position?.name || 'N/A'
            };
        });

        logger.info('[Admin] Successfully processed employees:', {
            count: employees.length,
            activeCount: employees.filter(emp => emp.status === 'Active').length
        });

        res.json({
            success: true,
            employees
        });

    } catch (error) {
        logger.error('[Admin] Error fetching employees:', {
            error: error.message,
            stack: error.stack,
            url: `${process.env.BASE_URL}/api/v1/wfts/person/multi_read`
        });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employees',
            error: error.message
        });
    }
});

router.post('/sync', async (req, res) => {
    try {
        logger.info('[Admin] Sync requested');
        
        // Add Kronos sync logic here
        const payload = {
            "filters": {
                "persons": {
                    "idType": "EMPLOYEE"
                }
            }
        };

        const kronosResponse = await axios.post(
            `${process.env.BASE_URL}/api/v1/wfts/person/multi_read`,
            payload,
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

        logger.info('[Admin] Sync completed successfully:', {
            employeesCount: kronosResponse.data?.persons?.length || 0
        });

        res.json({ 
            success: true,
            message: 'Sync completed',
            count: kronosResponse.data?.persons?.length || 0
        });
    } catch (error) {
        logger.error('[Admin] Sync error:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            success: false,
            message: 'Sync failed',
            error: error.message
        });
    }
});

router.get('/export', async (req, res) => {
    try {
        logger.info('[Admin] Export requested');
        // Add export logic here
        res.json({ message: 'Export completed' });
    } catch (error) {
        logger.error('[Admin] Export error:', error);
        res.status(500).json({ message: 'Export failed' });
    }
});

router.get('/folders', async (req, res) => {
    try {
        console.log('Folders endpoint hit');
        const pdfDir = path.join(__dirname, '..', 'generated_pdfs');
        console.log('PDF directory path:', pdfDir);
        
        // Check if directory exists, create if it doesn't
        try {
            await fsPromises.access(pdfDir);
        } catch {
            logger.info('[Admin] Creating PDF directory:', { path: pdfDir });
            await fsPromises.mkdir(pdfDir, { recursive: true });
        }

        // Read directory contents
        const items = await fsPromises.readdir(pdfDir, { withFileTypes: true });
        
        // Filter only directories and sort
        const folders = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort((a, b) => b.localeCompare(a));

        logger.info('[Admin] Found folders:', { count: folders.length, folders });

        res.json({
            success: true,
            folders
        });

    } catch (error) {
        console.error('Folders endpoint error:', error);
        logger.error('[Admin] Error reading PDF folders:', {
            error: error.message,
            stack: error.stack,
            path: path.join(__dirname, '..', 'generated_pdfs')
        });
        res.status(500).json({
            success: false,
            message: 'Failed to read folders',
            error: error.message
        });
    }
});

router.get('/timecards/:folder', async (req, res) => {
    try {
        const folder = req.params.folder;
        const pdfDir = path.join(__dirname, '..', 'generated_pdfs', folder);
        
        // Check if directory exists
        try {
            await fsPromises.access(pdfDir);
        } catch {
            return res.json({ success: true, timecards: [] });
        }

        // Read PDF files in the directory
        const files = await fsPromises.readdir(pdfDir);
        const timecards = files.filter(file => file.endsWith('.pdf'));

        // Extract employee IDs from filenames
        const signedEmployees = timecards.map(file => {
            const match = file.match(/timecard_(\d+)_/);
            return match ? match[1] : null;
        }).filter(id => id !== null);

        logger.info('[Admin] Found timecards:', { 
            folder, 
            count: timecards.length,
            signedEmployees 
        });

        res.json({
            success: true,
            timecards,
            signedEmployees
        });

    } catch (error) {
        logger.error('[Admin] Error reading timecards:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Failed to read timecards',
            error: error.message
        });
    }
});

router.get('/download/:folder/:file', authenticateToken, async (req, res) => {
    try {
        const { folder, file } = req.params;
        
        // Validate input
        if (!folder || !file) {
            return res.status(400).json({
                success: false,
                message: 'Missing folder or file parameter'
            });
        }

        // Clean up paths and prevent directory traversal
        const cleanFolder = path.normalize(folder).replace(/^(\.\.[\/\\])+/, '').trim();
        const cleanFile = path.normalize(file).replace(/^(\.\.[\/\\])+/, '').trim();
        
        // Log the request details
        console.log('Download request:', {
            folder: cleanFolder,
            file: cleanFile,
            params: req.params
        });

        // Construct absolute file path
        const filePath = path.resolve(
            __dirname,
            '..',
            'generated_pdfs',
            cleanFolder,
            cleanFile
        );

        console.log('Attempting to access file:', filePath);

        // Verify file exists
        try {
            await fsPromises.access(filePath);
            console.log('File exists:', filePath);
        } catch (error) {
            console.error('File access error:', error);
            return res.status(404).json({
                success: false,
                message: 'File not found',
                path: filePath
            });
        }

        // Get file stats
        const stats = await fsPromises.stat(filePath);
        if (!stats.isFile()) {
            return res.status(400).json({
                success: false,
                message: 'Not a file'
            });
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanFile}"`);
        res.setHeader('Content-Length', stats.size);

        // Stream the file
        const stream = require('fs').createReadStream(filePath);
        
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error streaming file'
                });
            }
        });

        // Pipe the file stream to response
        stream.pipe(res);

    } catch (error) {
        console.error('Download handler error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Server error while processing download',
                error: error.message
            });
        }
    }
});

router.post('/validate-timecard', async (req, res) => {
    try {
        const { employeeIds, folder, validatorInfo } = req.body;
        
        logger.info('[Admin] Starting timecard validation:', {
            employeeIds,
            folder,
            validator: validatorInfo
        });

        const results = await Promise.all(employeeIds.map(async (employeeId) => {
            try {
                // Load and modify the PDF
                const filePath = path.join(__dirname, '..', 'generated_pdfs', folder, `timecard_${employeeId}_${folder}.pdf`);
                const existingPdfBytes = await fsPromises.readFile(filePath);
                const pdfDoc = await PDFDocument.load(existingPdfBytes);
                
                // Get the first page and its dimensions
                const pages = pdfDoc.getPages();
                const page = pages[0];
                const { width, height } = page.getSize();

                // Embed font properly
                const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

                // Adjust validation box position to top right
                const boxWidth = 200;
                const boxHeight = 60;
                const margin = 20;
                const boxX = width - boxWidth - margin;  // Position from right
                const boxY = height - boxHeight - margin;  // Position from top
                
                // Draw validation box
                page.drawRectangle({
                    x: boxX,
                    y: boxY,
                    width: boxWidth,
                    height: boxHeight,
                    color: rgb(1, 1, 1),
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 1,
                    opacity: 0.1
                });

                // Add validation text - adjust text positions relative to box
                page.drawText('VALIDATION', {
                    x: boxX + boxWidth - 70,
                    y: boxY + boxHeight - 15,
                    size: 10,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                page.drawText(`Validated by: ${validatorInfo.name}`, {
                    x: boxX + boxWidth - (validatorInfo.name.length * 4 + 85),
                    y: boxY + boxHeight - 30,
                    size: 8,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                page.drawText(`Rank: ${validatorInfo.rank}`, {
                    x: boxX + boxWidth - (validatorInfo.rank.length * 4 + 45),
                    y: boxY + boxHeight - 42,
                    size: 8,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                page.drawText(`Date: ${new Date().toLocaleString()}`, {
                    x: boxX + boxWidth - 150,
                    y: boxY + boxHeight - 54,
                    size: 8,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                // Save the modified PDF
                const modifiedPdfBytes = await pdfDoc.save();
                const originalFilename = `timecard_${employeeId}_${folder}.pdf`;
                const validatedFilename = `timecard_${employeeId}_${folder}_v.pdf`;
                const originalPath = path.join(folderPath, originalFilename);
                const validatedPath = path.join(folderPath, validatedFilename);

                // Save the modified PDF with _v suffix
                await fsPromises.writeFile(validatedPath, modifiedPdfBytes);

                // Delete the original file
                if (await verifyPdfFile(originalPath)) {
                    await fsPromises.unlink(originalPath);
                }

                // Create validation record
                await TimecardValidation.create({
                    employeeId,
                    payPeriod: folder,
                    validatedBy: validatorInfo.name,
                    validatorRank: validatorInfo.rank,
                    validationDate: new Date(),
                    filename: validatedFilename  // Store new filename
                });

                return {
                    employeeId,
                    success: true,
                    message: 'Timecard validated successfully'
                };

            } catch (error) {
                logger.error('[Admin] Validation error for employee:', {
                    employeeId,
                    error: error.message,
                    stack: error.stack
                });
                return {
                    employeeId,
                    success: false,
                    message: error.message
                };
            }
        }));

        res.json({
            success: true,
            results
        });

    } catch (error) {
        logger.error('[Admin] Validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during validation',
            error: error.message
        });
    }
});

router.get('/validation-status/:folder', async (req, res) => {
    try {
        const validations = await TimecardValidation.findAll({
            where: { payPeriod: req.params.folder }
        });

        res.json({
            success: true,
            validations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching validation status',
            error: error.message
        });
    }
});

// Add this helper function
async function verifyPdfFile(filePath) {
    try {
        await fsPromises.access(filePath);
        const stats = await fsPromises.stat(filePath);
        if (!stats.isFile()) {
            throw new Error('Path exists but is not a file');
        }
        const content = await fsPromises.readFile(filePath);
        if (content.length === 0) {
            throw new Error('File exists but is empty');
        }
        return true;
    } catch (error) {
        logger.error('PDF verification failed:', {
            filePath,
            error: error.message
        });
        return false;
    }
}

router.post('/unvalidate-all', async (req, res) => {
    try {
        const { folder } = req.body;
        
        // Define folderPath here
        const folderPath = path.join(__dirname, '..', 'generated_pdfs', folder);

        // Get all validation records for this pay period
        const validatedTimecards = await TimecardValidation.findAll({
            where: { payPeriod: folder }
        });

        // Process each validated timecard
        for (const validation of validatedTimecards) {
            const validatedFilename = validation.filename;
            const originalFilename = validatedFilename.replace('_v.pdf', '.pdf');
            const validatedPath = path.join(folderPath, validatedFilename);
            const originalPath = path.join(folderPath, originalFilename);

            // Load and modify the PDF
            const pdfBytes = await fsPromises.readFile(validatedPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            // Get the first page
            const pages = pdfDoc.getPages();
            const page = pages[0];
            
            // Create a white rectangle to cover the validation box
            const { width, height } = page.getSize();
            page.drawRectangle({
                x: width - 320,
                y: height - 100,
                width: 300,
                height: 80,
                color: rgb(1, 1, 1),
                opacity: 1
            });

            // Save as original filename
            const modifiedPdfBytes = await pdfDoc.save();
            await fsPromises.writeFile(originalPath, modifiedPdfBytes);

            // Delete the validated version
            if (await verifyPdfFile(validatedPath)) {
                await fsPromises.unlink(validatedPath);
            }
        }

        // Delete validation records from database
        await TimecardValidation.destroy({
            where: { payPeriod: folder }
        });

        res.json({
            success: true,
            message: 'All timecards unvalidated successfully'
        });

    } catch (error) {
        logger.error('Unvalidate all error:', error);
        res.status(500).json({
            success: false,
            message: 'Error unvalidating timecards',
            error: error.message
        });
    }
});

router.post('/validate-all', async (req, res) => {
    try {
        const { folder, validatorInfo, employeeIds } = req.body;
        
        // Define folderPath here
        const folderPath = path.join(__dirname, '..', 'generated_pdfs', folder);
        
        logger.info('[Admin] Starting batch validation:', {
            folder,
            validator: validatorInfo,
            count: employeeIds.length
        });

        const results = await Promise.all(employeeIds.map(async (employeeId) => {
            try {
                // Load and modify the PDF
                const originalFilename = `timecard_${employeeId}_${folder}.pdf`;
                const validatedFilename = `timecard_${employeeId}_${folder}_v.pdf`;
                const originalPath = path.join(folderPath, originalFilename);
                const validatedPath = path.join(folderPath, validatedFilename);

                const existingPdfBytes = await fsPromises.readFile(originalPath);
                const pdfDoc = await PDFDocument.load(existingPdfBytes);
                
                // Get the first page and its dimensions
                const pages = pdfDoc.getPages();
                const page = pages[0];
                const { width, height } = page.getSize();

                // Embed font properly
                const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

                // Add validation box
                const boxWidth = 200;
                const boxHeight = 60;
                const margin = 20;
                const boxX = width - boxWidth - margin;
                const boxY = height - boxHeight - margin;
                
                page.drawRectangle({
                    x: boxX,
                    y: boxY,
                    width: boxWidth,
                    height: boxHeight,
                    color: rgb(1, 1, 1),
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 1,
                    opacity: 0.1
                });

                // Add validation text
                page.drawText('VALIDATION', {
                    x: boxX + boxWidth - 70,
                    y: boxY + boxHeight - 15,
                    size: 10,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                page.drawText(`Validated by: ${validatorInfo.name}`, {
                    x: boxX + boxWidth - (validatorInfo.name.length * 4 + 85),
                    y: boxY + boxHeight - 30,
                    size: 8,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                page.drawText(`Rank: ${validatorInfo.rank}`, {
                    x: boxX + boxWidth - (validatorInfo.rank.length * 4 + 45),
                    y: boxY + boxHeight - 42,
                    size: 8,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                page.drawText(`Date: ${new Date().toLocaleString()}`, {
                    x: boxX + boxWidth - 150,
                    y: boxY + boxHeight - 54,
                    size: 8,
                    font: helveticaFont,
                    color: rgb(0, 0, 0)
                });

                // Save the modified PDF
                const modifiedPdfBytes = await pdfDoc.save();
                await fsPromises.writeFile(validatedPath, modifiedPdfBytes);

                // Delete the original file
                if (await verifyPdfFile(originalPath)) {
                    await fsPromises.unlink(originalPath);
                }

                // Create validation record with new filename
                await TimecardValidation.create({
                    employeeId,
                    payPeriod: folder,
                    validatedBy: validatorInfo.name,
                    validatorRank: validatorInfo.rank,
                    validationDate: new Date(),
                    filename: validatedFilename  // Store new filename
                });

                return {
                    employeeId,
                    success: true
                };

            } catch (error) {
                logger.error('[Admin] Validation error for employee:', {
                    employeeId,
                    error: error.message
                });
                return {
                    employeeId,
                    success: false,
                    error: error.message
                };
            }
        }));

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        logger.info('[Admin] Batch validation completed:', {
            total: results.length,
            successful: successCount,
            failed: failureCount
        });

        res.json({
            success: true,
            results,
            summary: {
                total: results.length,
                validated: successCount,
                failed: failureCount
            }
        });

    } catch (error) {
        logger.error('[Admin] Batch validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during batch validation',
            error: error.message
        });
    }
});

router.post('/send-to-finance', async (req, res) => {
    try {
        const { folder, financeEmail, sentBy } = req.body;
        
        // Get all validated timecards for this pay period
        const validatedTimecards = await TimecardValidation.findAll({
            where: { payPeriod: folder }
        });

        if (validatedTimecards.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No validated timecards found for this pay period'
            });
        }

        // Create zip file in the selected pay period folder
        const folderPath = path.join(__dirname, '..', 'generated_pdfs', folder);
        const zipFileName = `Timecards_${folder}.zip`;
        const zipFilePath = path.join(folderPath, zipFileName);

        // Create write stream for zip
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Log archive progress
        archive.on('progress', (progress) => {
            const percent = Math.round((progress.fs.processedBytes / progress.fs.totalBytes) * 100);
            logger.info(`Zip progress: ${percent}%`);
        });

        // Wait for archive to finish
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            output.on('error', reject);
            archive.pipe(output);

            // Add each validated timecard to the zip
            validatedTimecards.forEach(validation => {
                const pdfPath = path.join(folderPath, validation.filename);
                if (fs.existsSync(pdfPath)) {
                    archive.file(pdfPath, { name: validation.filename });
                } else {
                    logger.warn(`File not found: ${pdfPath}`);
                }
            });

            archive.finalize();
        });

        // Verify zip file exists and has content
        try {
            const stats = await fsPromises.stat(zipFilePath);
            if (stats.size === 0) {
                throw new Error('Created zip file is empty');
            }
            logger.info(`Zip file created: ${zipFilePath}, size: ${stats.size} bytes`);
        } catch (error) {
            throw new Error(`Failed to verify zip file: ${error.message}`);
        }

        // Send email with attachment
        const emailText = `Please find attached the validated timecards for pay period ${folder}.`;
        const emailHtml = `
            <h2>Timecard Submission</h2>
            <p>Please find attached the validated timecards for pay period ${folder}.</p>
            <p>Total timecards: ${validatedTimecards.length}</p>
            <p>Sent by: ${sentBy}</p>
        `;

        const emailSent = await sendEmail(
            financeEmail,
            `Timecard Submission - ${folder}`,
            emailText,
            emailHtml,
            [{
                filename: zipFileName,
                path: zipFilePath
            }]
        );

        if (!emailSent) {
            throw new Error('Failed to send email');
        }

        // Record the submission
        await TimecardSubmission.create({
            payPeriod: folder,
            sentBy: sentBy,
            sentAt: new Date(),
            validatedCount: validatedTimecards.length,
            financeEmail: financeEmail
        });

        // Note: We don't delete the zip file anymore since we're keeping it in the folder

        res.json({
            success: true,
            message: 'Timecards sent successfully',
            validatedCount: validatedTimecards.length
        });

    } catch (error) {
        logger.error('[Admin] Error sending to finance:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending timecards to finance',
            error: error.message
        });
    }
});

router.get('/check-submission/:folder', async (req, res) => {
    try {
        const submission = await TimecardSubmission.findOne({
            where: { payPeriod: req.params.folder },
            order: [['sentAt', 'DESC']]
        });

        res.json({
            alreadySent: !!submission,
            sentAt: submission?.sentAt,
            sentBy: submission?.sentBy
        });

    } catch (error) {
        logger.error('[Admin] Error checking submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking submission status',
            error: error.message
        });
    }
});

// Add this route with authentication
router.get('/zip-progress', authenticateToken, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial progress
    res.write(`data: ${JSON.stringify({ percentage: 0 })}\n\n`);

    // Store the response object to send updates
    global.zipProgressResponse = res;
});

// Add this route to get configuration
router.get('/config', authenticateToken, (req, res) => {
    try {
        res.json({
            financeEmail: process.env.FINANCE_EMAIL
        });
    } catch (error) {
        logger.error('[Admin] Error getting config:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting configuration'
        });
    }
});

// Add these routes for message templates and messaging
router.get('/message-templates', async (req, res) => {
    try {
        const templates = await MessageTemplate.findAll({
            order: [['name', 'ASC']]
        });
        
        logger.info('[Admin] Message templates loaded:', {
            count: templates.length
        });
        
        res.json(templates);
    } catch (error) {
        logger.error('[Admin] Error loading message templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading message templates',
            error: error.message
        });
    }
});

router.get('/message-templates/:id', async (req, res) => {
    try {
        const template = await MessageTemplate.findByPk(req.params.id);
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        res.json(template);
    } catch (error) {
        logger.error('[Admin] Error loading message template:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading message template',
            error: error.message
        });
    }
});

router.post('/send-message', async (req, res) => {
    try {
        const { employeeId, email, subject, message, sentBy } = req.body;

        logger.info('[Admin] Sending message:', {
            to: email,
            subject,
            employeeId
        });

        // Send email
        const emailSent = await sendEmail(
            email,
            subject,
            message,  // Plain text version
            message.replace(/\n/g, '<br>')  // HTML version
        );

        if (!emailSent) {
            throw new Error('Failed to send email');
        }

        // Record in message history
        await MessageHistory.create({
            employeeId,
            subject,
            message,
            sentBy,
            sentAt: new Date()
        });

        logger.info('[Admin] Message sent successfully:', {
            employeeId,
            sentBy,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Message sent successfully'
        });

    } catch (error) {
        logger.error('[Admin] Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
});

module.exports = router;
