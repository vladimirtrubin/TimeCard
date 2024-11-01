const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Print environment variables (masked)
console.log('Environment Variables Check:');
console.log('MAIL_SERVER:', process.env.MAIL_SERVER);
console.log('MAIL_PORT:', process.env.MAIL_PORT);
console.log('MAIL_USERNAME:', process.env.MAIL_USERNAME ? '***@gmail.com' : 'missing');
console.log('MAIL_PASSWORD:', process.env.MAIL_PASSWORD ? '***' : 'missing');
console.log('MAIL_DEFAULT_SENDER:', process.env.MAIL_DEFAULT_SENDER);

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: parseInt(process.env.MAIL_PORT, 10),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Test function
async function testEmail() {
    try {
        // Test 1: Verify transporter
        console.log('\nTest 1: Verifying transporter configuration...');
        const verifyResult = await transporter.verify();
        console.log('Transporter verification successful:', verifyResult);

        // Test 2: Send test email
        console.log('\nTest 2: Sending test email...');
        const testMailOptions = {
            from: process.env.MAIL_DEFAULT_SENDER,
            to: "vladimritrubin@gmail.com", // Your test email
            subject: "Email Configuration Test",
            text: "If you receive this email, the configuration is working correctly.",
            html: "<h1>Email Test</h1><p>If you receive this email, the configuration is working correctly.</p>"
        };

        const info = await transporter.sendMail(testMailOptions);
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('Accepted:', info.accepted);
        console.log('Rejected:', info.rejected);

    } catch (error) {
        console.error('\nError occurred:');
        console.error('Name:', error.name);
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Command:', error.command);
        console.error('Stack:', error.stack);
    }
}

// Run the test
console.log('Starting email test...\n');
testEmail().then(() => {
    console.log('\nTest completed.');
}).catch(error => {
    console.error('\nTest failed:', error);
}); 