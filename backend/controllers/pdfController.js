const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const axios = require('axios');
const path = require('path');
const fs = require('fs'); // Use regular fs instead of fs.promises for existsSync
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const fetchKronosData = async (employeeId, fromDate, toDate) => {
    const API_URL = process.env.BASE_URL + '/api/v1/wfts/schedule/multi_read';
    
    logger.info('[Kronos API] Starting request:', {
        employeeId,
        fromDate,
        toDate,
        url: API_URL
    });

    const payload = {
        "fromDate": fromDate,
        "thruDate": toDate,
        "filters": {
            "persons": {
                "idType": "EMPLOYEE",
                "ids": [employeeId]
            },
            "workCodeType": {
                "includeNonWorkingCodes": true,
                "includeWorkingCodes": true
            },
            "includeChargeCodes": true,
            "includeHiddenCodes": false,
            "includeInactivePersonOrProfileExceptions": true,
            "includeIntegrationMappedCodesOnly": false,
            "recordTypes": [
                "SCHEDULE", "ASSIGNMENT", "EXCEPTION", "VACANCY", "POSITION", "REMOVE_EXCEPTION"
            ],
            "includeWorkCodes": true,
            "includePayrollCodes": true
        }
    };

    try {
        const response = await axios.post(API_URL, payload, {
            headers: {
                'Authorization': process.env.API_KEY,
                'Content-Type': 'application/json'
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });

        logger.info('[Kronos API] Response received:', {
            status: response.status,
            hasData: !!response.data
        });

        const data = response.data;
        const filtered_data = [];
        const work_code_totals = {};
        let grand_total_hours = 0;
        let employee_rank = null;

        // Process schedules
        data.schedules?.forEach(schedule => {
            schedule.schedule?.forEach(entry => {
                entry.personSchedule?.forEach(ps => {
                    if (ps.workCode?.payrollCode) {
                        const work_code = ps.workCode.payrollCode;
                        const payroll_duration = ps.payrollDurationInHours || 0;

                        // Extract additional data
                        const physical_unit = ps.organization?.physicalUnit?.abbreviation || 'N/A';
                        const position = ps.organization?.position?.rank?.abbreviation || 'N/A';
                        
                        // Get employee rank if not already set
                        if (!employee_rank) {
                            employee_rank = ps.profile?.name || 'N/A';
                        }

                        // Add to filtered data
                        filtered_data.push({
                            date: schedule.date,
                            employee_id: entry.person?.employeeId,
                            code: work_code,
                            hours: payroll_duration,
                            unit: physical_unit,
                            position: position
                        });

                        // Update totals
                        work_code_totals[work_code] = (work_code_totals[work_code] || 0) + payroll_duration;
                        grand_total_hours += payroll_duration;
                    }
                });
            });
        });

        logger.info('[Kronos API] Data processed:', {
            entries: filtered_data.length,
            totalHours: grand_total_hours,
            workCodes: Object.keys(work_code_totals)
        });

        return {
            scheduleData: filtered_data,
            workCodeTotals: work_code_totals,
            grandTotalHours: grand_total_hours,
            employeeRank: employee_rank,
            employeeName: data.schedules?.[0]?.schedule?.[0]?.person?.name || 'Unknown',
            payPeriod: `${fromDate} to ${toDate}`
        };

    } catch (error) {
        logger.error('[Kronos API] Request failed:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
};

exports.generateTimecardPDF = async (req, res) => {
    logger.info('[PDF Generation] Starting generation request:', {
        body: req.body
    });

    const { employeeId, payPeriod } = req.body;
    
    try {
        const dates = calculatePayPeriodDates(payPeriod);
        logger.info('[PDF Generation] Calculated pay period dates:', dates);

        const kronosData = await fetchKronosData(
            employeeId,
            dates.startDate,
            dates.endDate
        );

        logger.info('[PDF Generation] Received Kronos data:', {
            entriesCount: kronosData.scheduleData.length,
            totalHours: kronosData.grandTotalHours,
            employeeRank: kronosData.employeeRank
        });

        if (!kronosData.scheduleData.length) {
            logger.warn('[PDF Generation] No schedule data found');
            return res.status(404).json({
                message: 'No schedule data found for the selected period'
            });
        }

        // Return the processed data to the frontend
        res.json({
            success: true,
            data: {
                employeeName: kronosData.employeeName,
                employeeId: employeeId,
                employeeRank: kronosData.employeeRank,
                payPeriod: kronosData.payPeriod,
                scheduleData: kronosData.scheduleData,
                workCodeTotals: kronosData.workCodeTotals,
                grandTotalHours: kronosData.grandTotalHours
            }
        });

    } catch (error) {
        logger.error('[PDF Generation] Error:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({ 
            success: false,
            message: 'Error generating timecard.',
            error: error.message
        });
    }
};

function calculatePayPeriodDates(payPeriod) {
    logger.info('[Date Calculation] Calculating dates for period:', payPeriod);
    
    const startDate = new Date(2024, 8, 9); // September 9, 2024
    const payPeriodLength = 14;
    const today = new Date();
    
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const periodsSinceStart = Math.floor(daysSinceStart / payPeriodLength);

    let selectedStart = new Date(startDate);
    selectedStart.setDate(startDate.getDate() + (periodsSinceStart * payPeriodLength));

    if (payPeriod === 'previous') {
        selectedStart.setDate(selectedStart.getDate() - payPeriodLength);
    } else if (payPeriod === 'next') {
        selectedStart.setDate(selectedStart.getDate() + payPeriodLength);
    }

    const selectedEnd = new Date(selectedStart);
    selectedEnd.setDate(selectedStart.getDate() + payPeriodLength - 1);

    const result = {
        startDate: selectedStart.toISOString().split('T')[0],
        endDate: selectedEnd.toISOString().split('T')[0]
    };

    logger.info('[Date Calculation] Calculated dates:', result);
    return result;
}

exports.downloadTimecard = async (req, res) => {
    try {
        const { filename } = req.params;
        // Get the pay period from the filename
        const payPeriodMatch = filename.match(/\d{8}__\d{8}/);
        const payPeriodDir = payPeriodMatch ? payPeriodMatch[0] : '';
        
        const filepath = path.join(__dirname, '../generated_pdfs', payPeriodDir, filename);

        logger.info('[PDF Download] Request for file:', {
            filename,
            filepath,
            exists: fs.existsSync(filepath)
        });

        if (!fs.existsSync(filepath)) {
            logger.error('[PDF Download] File not found:', filepath);
            return res.status(404).json({ message: 'PDF file not found.' });
        }

        logger.info('[PDF Download] Sending file');
        res.download(filepath);
    } catch (error) {
        logger.error('[PDF Download] Error:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Error downloading file',
            error: error.message 
        });
    }
};

exports.submitSignedTimecard = async (req, res) => {
    try {
        const { employeeId, payPeriod, signature, timecardData } = req.body;

        // Create directory path based on pay period
        const payPeriodDir = payPeriod.replace(/\s+to\s+/, '__').replace(/[^0-9_]/g, '');
        const baseDir = path.join(__dirname, '../generated_pdfs');
        const payPeriodPath = path.join(baseDir, payPeriodDir);

        // Create directories if they don't exist
        await fs.promises.mkdir(baseDir, { recursive: true });
        await fs.promises.mkdir(payPeriodPath, { recursive: true });

        // Generate PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;

        // Add content to PDF
        page.drawText('Timecard', { x: 50, y: height - 50, size: 20, font });
        page.drawText(`Name: ${timecardData.employeeName}`, { x: 50, y: height - 80, size: fontSize, font });
        page.drawText(`Employee ID: ${employeeId}`, { x: 50, y: height - 100, size: fontSize, font });
        page.drawText(`Pay Period: ${payPeriod}`, { x: 50, y: height - 120, size: fontSize, font });

        // Add schedule data
        let yPos = height - 160;
        page.drawText('Schedule Data:', { x: 50, y: yPos, size: fontSize, font });
        yPos -= 20;

        timecardData.scheduleData.forEach(entry => {
            page.drawText(`${entry.date} - ${entry.code} - ${entry.hours} hours - ${entry.unit} - ${entry.position}`, 
                { x: 50, y: yPos, size: fontSize, font });
            yPos -= 20;
        });

        // Add totals
        yPos -= 20;
        page.drawText('Work Code Totals:', { x: 50, y: yPos, size: fontSize, font });
        yPos -= 20;

        Object.entries(timecardData.workCodeTotals).forEach(([code, hours]) => {
            page.drawText(`${code}: ${hours.toFixed(1)} hours`, 
                { x: 50, y: yPos, size: fontSize, font });
            yPos -= 20;
        });

        yPos -= 20;
        page.drawText(`Total Hours: ${timecardData.grandTotalHours.toFixed(1)}`, 
            { x: 50, y: yPos, size: fontSize, font });

        // Add signature
        yPos -= 40;
        page.drawText('Signed by:', { x: 50, y: yPos, size: fontSize, font });
        page.drawText(signature.name, { x: 150, y: yPos, size: fontSize, font });
        yPos -= 20;
        page.drawText('Date:', { x: 50, y: yPos, size: fontSize, font });
        page.drawText(signature.date, { x: 150, y: yPos, size: fontSize, font });

        // Save PDF with consistent naming
        const pdfBytes = await pdfDoc.save();
        const filename = `timecard_${employeeId}_${payPeriodDir}.pdf`;
        const filePath = path.join(payPeriodPath, filename);
        
        await fs.promises.writeFile(filePath, pdfBytes);

        logger.info('[PDF Generation] Signed timecard saved:', {
            employeeId,
            payPeriod,
            filename,
            path: filePath
        });

        res.status(200).json({
            success: true,
            message: 'Signed timecard submitted successfully',
            filename: filename
        });

    } catch (error) {
        logger.error('[PDF Generation] Error generating signed timecard:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Error generating signed timecard',
            error: error.message
        });
    }
};

// Add this new function to pdfController.js
exports.getEmployeeTimecards = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const baseDir = path.join(__dirname, '../generated_pdfs');
        let timecards = [];

        // Read all pay period directories
        const payPeriodDirs = await fs.promises.readdir(baseDir);
        
        for (const dir of payPeriodDirs) {
            const dirPath = path.join(baseDir, dir);
            const stats = await fs.promises.stat(dirPath);
            
            if (stats.isDirectory()) {
                const files = await fs.promises.readdir(dirPath);
                const employeeFiles = files.filter(file => 
                    file.startsWith(`timecard_${employeeId}_`) && file.endsWith('.pdf')
                );

                for (const file of employeeFiles) {
                    const filePath = path.join(dirPath, file);
                    const fileStats = await fs.promises.stat(filePath);
                    
                    // Convert directory name to readable date format
                    const dates = dir.split('__').map(date => 
                        `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
                    );

                    timecards.push({
                        filename: file,
                        payPeriod: `${dates[0]} to ${dates[1]}`,
                        submittedDate: fileStats.mtime,
                        directory: dir
                    });
                }
            }
        }

        // Sort by submission date (most recent first) and limit to 10
        timecards.sort((a, b) => b.submittedDate - a.submittedDate);
        timecards = timecards.slice(0, 10);

        res.json({
            success: true,
            timecards
        });

    } catch (error) {
        logger.error('[PDF History] Error fetching timecard history:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Error fetching timecard history',
            error: error.message
        });
    }
};
