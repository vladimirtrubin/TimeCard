const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const logger = require('./logger');

dotenv.config();

// Log transporter configuration (without sensitive data)
logger.info('Email configuration:', {
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME ? '***' : 'missing',
        pass: process.env.MAIL_PASSWORD ? '***' : 'missing'
    }
});

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: parseInt(process.env.MAIL_PORT, 10),
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendEmail = async (to, subject, text, html, attachments = []) => {
    const mailOptions = {
        from: process.env.MAIL_DEFAULT_SENDER,
        to,
        subject,
        text,
        html,
        attachments
    };

    logger.info('Attempting to send email:', {
        to,
        subject,
        from: process.env.MAIL_DEFAULT_SENDER,
        hasText: !!text,
        hasHtml: !!html,
        attachmentCount: attachments.length
    });

    try {
        // Verify transporter connection
        const verifyResult = await transporter.verify();
        logger.info('Transporter verification:', { success: verifyResult });

        // Send email
        const info = await transporter.sendMail(mailOptions);
        logger.info('Email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });
        return true;
    } catch (error) {
        logger.error('Email send error:', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        });
        return false;
    }
};

module.exports = { sendEmail };
