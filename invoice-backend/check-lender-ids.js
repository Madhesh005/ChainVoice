require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLenders() {
    try {
        const result = await pool.query(`
            SELECT id, lender_name, lender_type, email 
            FROM lender_users 
            ORDER BY lender_name
        `);
        
        console.log('\nLender IDs in Database:\n');
        result.rows.forEach(row => {
            console.log(`${row.lender_name}:`);
            console.log(`  ID: ${row.id}`);
            console.log(`  Type: ${row.lender_type}`);
            console.log(`  Email: ${row.email}`);
            console.log('');
        });
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkLenders();
