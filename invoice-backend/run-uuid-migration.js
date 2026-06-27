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

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Running lender_id UUID fix migration...\n');
        
        // Read the migration SQL
        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'fix-lender-id-uuid.sql'),
            'utf8'
        );
        
        // Try to run the migration
        try {
            await client.query(sql);
            console.log('✅ Migration successful!\n');
        } catch (err) {
            if (err.message.includes('cannot cast')) {
                console.log('⚠️  Found invalid TEXT data in financing_requests table');
                console.log('   Clearing old data and retrying...\n');
                
                await client.query('DELETE FROM financing_requests');
                console.log('✅ Old financing requests cleared\n');
                
                // Retry the migration
                await client.query(sql);
                console.log('✅ Migration successful after cleanup!\n');
            } else {
                throw err;
            }
        }
        
        // Verify the change
        console.log('📋 Verifying schema...\n');
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name='financing_requests' 
            AND column_name='lender_id'
        `);
        
        if (result.rows.length > 0) {
            console.log(`✅ lender_id type: ${result.rows[0].data_type}`);
        }
        
        // Check constraints
        const constraints = await client.query(`
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'financing_requests'::regclass
            AND conname IN ('fk_lender', 'unique_invoice_lender')
        `);
        
        console.log('\n✅ Constraints:');
        constraints.rows.forEach(row => {
            const type = row.contype === 'f' ? 'Foreign Key' : 
                        row.contype === 'u' ? 'Unique' : row.contype;
            console.log(`   - ${row.conname}: ${type}`);
        });
        
        console.log('\n========================================');
        console.log('✅ Migration Complete!');
        console.log('========================================\n');
        console.log('Next steps:');
        console.log('1. Restart backend: npm start');
        console.log('2. Test MSME financing request flow');
        console.log('3. Verify request appears in lender dashboard\n');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
