const db = require('./db');

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing blockchain columns to invoices table...\n');

    // Check existing columns
    const existingColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
    `);
    
    const columnNames = existingColumns.rows.map(row => row.column_name);
    console.log('Existing columns:', columnNames.join(', '));

    // Add missing columns
    const columnsToAdd = [
      { name: 'ipfs_cid', type: 'VARCHAR(255)' },
      { name: 'document_hash', type: 'VARCHAR(255)' },
      { name: 'blockchain_status', type: 'VARCHAR(50)' },
      { name: 'blockchain_timestamp', type: 'TIMESTAMP' },
      { name: 'blockchain_tx_hash', type: 'VARCHAR(255)' },
      { name: 'blockchain_block_number', type: 'VARCHAR(50)' }
    ];

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`Adding column: ${column.name}`);
        await db.query(`ALTER TABLE invoices ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added ${column.name}`);
      } else {
        console.log(`✓ Column ${column.name} already exists`);
      }
    }

    console.log('\n✅ All required columns are now present');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

addMissingColumns();