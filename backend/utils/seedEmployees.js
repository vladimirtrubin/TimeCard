const sequelizeEmp = require('../config/database').sequelizeEmp;
const Employee = require('../models/Employee');

const employees = [
    { employeeId: 'E001', name: 'John Doe' },
    { employeeId: 'E002', name: 'Jane Smith' },
    // Add more employees as needed
];

const seedEmployees = async () => {
    try {
        await sequelizeEmp.sync({ force: true });
        for (let emp of employees) {
            await Employee.create(emp);
            console.log(`Employee ${emp.employeeId} - ${emp.name} created.`);
        }
        console.log('Employee seeding completed.');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedEmployees();
