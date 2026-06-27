require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTable() {
    const client = await pool.connect();
    try {
        console.log('\n📋 Checking invoices table structure...\n');
        
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'invoices'
            ORDER BY ordinal_position
        `);
        
        console.log('Columns in invoices table:');
        result.rows.forEach(r => {
            console.log(`  - ${r.column_name}: ${r.data_type} (${r.is_nullable === 'NO' ? 'required' : 'optional'})`);
        });
        
        // Check for blockchain-related columns
        const blockchainCols = result.rows.filter(r => 
            r.column_name.includes('ipfs') || 
            r.column_name.includes('blockchain') || 
            r.column_name.includes('giid') ||
            r.column_name.includes('document_hash')
        );
        
        console.log('\n📊 Blockchain-related columns:');
        if (blockchainCols.length === 0) {
            console.log('  ⚠️  No blockchain columns found!');
        } else {
            blockchainCols.forEach(r => {
                console.log(`  ✓ ${r.column_name}: ${r.data_type}`);
            });
        }
        
        // Check msme_id column type
        const msmeIdCol = result.rows.find(r => r.column_name === 'msme_id');
        console.log('\n📊 msme_id column type:', msmeIdCol ? msmeIdCol.data_type : 'NOT FOUND');
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkTable();
