const { DataTypes } = require('sequelize');
const { sequelizeEmp } = require('../config/database');

const TimecardValidation = sequelizeEmp.define('TimecardValidation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employeeId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    payPeriod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    validatedBy: {
        type: DataTypes.STRING,
        allowNull: false
    },
    validatorRank: {
        type: DataTypes.STRING,
        allowNull: false
    },
    validationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = TimecardValidation; 