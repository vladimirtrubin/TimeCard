const bcrypt = require('bcryptjs');
const { sequelizeOrg } = require('../config/database');
const Organization = require('../models/Organization');

const organizations = [
    { 
        name: 'OrgA', 
        password: 'password123', 
        email: 'orga@example.com'
    },
    { 
        name: 'OrgB', 
        password: 'password456', 
        email: 'orgb@example.com'
    }
];

const seedOrganizations = async () => {
    try {
        // Force sync will drop and recreate the table
        await sequelizeOrg.sync({ force: true });
        
        for (let org of organizations) {
            const hashedPassword = await bcrypt.hash(org.password, 10);
            await Organization.create({
                name: org.name,
                password: hashedPassword,
                email: org.email
            });
            console.log(`Organization ${org.name} created with email ${org.email}`);
        }
        console.log('Organization seeding completed.');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedOrganizations();
