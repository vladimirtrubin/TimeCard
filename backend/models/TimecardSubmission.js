const { DataTypes } = require('sequelize');
const { sequelizeEmp } = require('../config/database');

const TimecardSubmission = sequelizeEmp.define('TimecardSubmission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    payPeriod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sentBy: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    validatedCount: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    financeEmail: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = TimecardSubmission; 