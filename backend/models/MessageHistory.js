const { DataTypes } = require('sequelize');
const { sequelizeEmp } = require('../config/database');

const MessageHistory = sequelizeEmp.define('MessageHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employeeId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    sentBy: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
});

module.exports = MessageHistory; 