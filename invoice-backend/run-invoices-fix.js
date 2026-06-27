require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runFix() {
    const client = await pool.connect();
    
    try {
        console.log('\n========================================');
        console.log('Fixing invoices.msme_id Column Type');
        console.log('========================================\n');
        
        // Check current state
        console.log('📋 Current state:');
        const beforeCheck = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name='invoices' AND column_name='msme_id'
        `);
        console.log(`   msme_id type: ${beforeCheck.rows[0].data_type}\n`);
        
        // Run the migration
        console.log('🔧 Running migration...\n');
        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'fix-invoices-msme-id-uuid.sql'),
            'utf8'
        );
        
        await client.query(sql);
        
        // Verify the change
        console.log('\n📋 After migration:');
        const afterCheck = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name='invoices' AND column_name='msme_id'
        `);
        console.log(`   msme_id type: ${afterCheck.rows[0].data_type}`);
        
        // Check constraints
        const constraints = await client.query(`
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'invoices'::regclass
            AND conname = 'fk_invoices_msme'
        `);
        
        if (constraints.rows.length > 0) {
            console.log(`   ✅ Foreign key: fk_invoices_msme`);
        }
        
        // Count invoices
        const count = await client.query('SELECT COUNT(*) FROM invoices');
        console.log(`   ✅ Invoices remaining: ${count.rows[0].count}`);
        
        console.log('\n========================================');
        console.log('✅ Migration Complete!');
        console.log('========================================\n');
        console.log('Next steps:');
        console.log('1. Restart backend server');
        console.log('2. Test financing request again\n');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runFix();
