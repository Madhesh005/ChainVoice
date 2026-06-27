require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('Fixing ERP Connection Issue');
console.log('========================================\n');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixERPConnection() {
    const client = await pool.connect();
    
    try {
        console.log('✓ Connected to database\n');

        // Check if updated_at column exists
        console.log('📋 Checking erp_connections table schema...');
        const columnCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'erp_connections'
            ORDER BY ordinal_position;
        `);

        console.log('Current columns:');
        columnCheck.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        const hasUpdatedAt = columnCheck.rows.some(col => col.column_name === 'updated_at');

        if (hasUpdatedAt) {
            console.log('\n✅ updated_at column already exists!\n');
        } else {
            console.log('\n❌ updated_at column is missing. Adding it now...\n');

            // Run the migration
            console.log('📋 Running migration...');
            const migrationSql = fs.readFileSync(
                path.join(__dirname, 'migrations', 'add-updated-at-to-erp-connections.sql'),
                'utf8'
            );
            await client.query(migrationSql);
            console.log('✓ Migration complete\n');
        }

        // Verify the fix
        console.log('📋 Verifying schema after fix...');
        const verifyCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'erp_connections' AND column_name = 'updated_at';
        `);

        if (verifyCheck.rows.length > 0) {
            console.log('✅ Verification passed: updated_at column exists\n');
        } else {
            console.log('❌ Verification failed: updated_at column still missing\n');
            process.exit(1);
        }

        // Check if there are any existing ERP connections
        console.log('📋 Checking existing ERP connections...');
        const existingConnections = await client.query(`
            SELECT id, msme_id, erp_type, base_url, created_at, updated_at
            FROM erp_connections
            ORDER BY created_at DESC;
        `);

        if (existingConnections.rows.length > 0) {
            console.log(`Found ${existingConnections.rows.length} existing connection(s):\n`);
            existingConnections.rows.forEach((conn, idx) => {
                console.log(`Connection ${idx + 1}:`);
                console.log(`  ID: ${conn.id}`);
                console.log(`  MSME ID: ${conn.msme_id}`);
                console.log(`  ERP Type: ${conn.erp_type}`);
                console.log(`  URL: ${conn.base_url}`);
                console.log(`  Created: ${conn.created_at}`);
                console.log(`  Updated: ${conn.updated_at}`);
                console.log('');
            });
        } else {
            console.log('No existing ERP connections found.\n');
        }

        console.log('========================================');
        console.log('✅ Fix Complete!');
        console.log('========================================\n');

        console.log('📝 Next Steps:');
        console.log('   1. Restart your backend: npm start');
        console.log('   2. Go to: http://localhost:5173/msme/erp-connection');
        console.log('   3. Enter your Odoo credentials:');
        console.log('      - ERP Type: odoo');
        console.log('      - Base URL: http://localhost:8069');
        console.log('      - Database: invoice_chain');
        console.log('      - Username: admin');
        console.log('      - Password: admin');
        console.log('   4. Click "Connect"');
        console.log('\n   You should see: "ERP connection established successfully" ✅\n');

    } catch (error) {
        console.error('\n❌ Fix failed:', error.message);
        console.error('\nStack:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run fix
fixERPConnection().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
