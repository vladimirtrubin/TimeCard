const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    res.json({ message: 'Test route working' });
});

router.post('/echo', (req, res) => {
    console.log('Received data:', req.body);
    res.json({ 
        message: 'Echo test',
        received: req.body 
    });
});

// Add this new test route
router.get('/kronos-test', async (req, res) => {
    const API_URL = process.env.BASE_URL + '/api/v1/wfts/schedule/multi_read';
    
    logger.info('[Kronos Test] Making test request to Kronos API');

    try {
        const response = await axios.post(API_URL, {
            "fromDate": "2024-10-07",
            "thruDate": "2024-10-20",
            "filters": {
                "persons": {
                    "idType": "EMPLOYEE",
                    "ids": ["891"]
                }
            }
        }, {
            headers: {
                'Authorization': process.env.API_KEY,
                'Content-Type': 'application/json'
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });

        logger.info('[Kronos Test] Response received:', {
            status: response.status,
            hasData: !!response.data
        });

        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        logger.error('[Kronos Test] Error:', {
            message: error.message,
            response: error.response?.data
        });

        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

module.exports = router;
