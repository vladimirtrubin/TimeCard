const { DataTypes } = require('sequelize');
const { sequelizeEmp } = require('../config/database');
const Employee = require('./Employee');

const Timecard = sequelizeEmp.define('Timecard', {
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hoursWorked: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    // Add additional fields like project, description, etc.
});

// Establish relationships
Employee.hasMany(Timecard, { foreignKey: 'employeeId' });
Timecard.belongsTo(Employee, { foreignKey: 'employeeId' });

module.exports = Timecard;
