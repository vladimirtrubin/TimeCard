const { DataTypes } = require('sequelize');
const { sequelizeEmp } = require('../config/database');

const MessageTemplate = sequelizeEmp.define('MessageTemplate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    template: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = MessageTemplate; 