const { DataTypes } = require('sequelize');
const { sequelizeEmp } = require('../config/database');

const TimecardSignature = sequelizeEmp.define('TimecardSignature', {
    employeeId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    payPeriod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    signatureDate: {
        type: DataTypes.STRING,
        allowNull: false
    },
    employeeName: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = TimecardSignature;
