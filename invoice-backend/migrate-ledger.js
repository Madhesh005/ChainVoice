const pool = require('./db');

async function migrate() {
  console.log('🔹 Migrating invoice_ledger table...\n');

  try {
    // Check if columns exist
    console.log('Step 1: Checking existing columns...');
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger';
    `);
    
    const existingColumns = checkColumns.rows.map(r => r.column_name);
    console.log('✓ Existing columns:', existingColumns.join(', '));
    console.log();

    // Add missing columns
    console.log('Step 2: Adding missing columns...');
    
    if (!existingColumns.includes('lender_id')) {
      await pool.query('ALTER TABLE invoice_ledger ADD COLUMN lender_id TEXT;');
      console.log('✓ Added lender_id column');
    } else {
      console.log('  lender_id already exists');
    }

    if (!existingColumns.includes('financed_at')) {
      await pool.query('ALTER TABLE invoice_ledger ADD COLUMN financed_at TIMESTAMP;');
      console.log('✓ Added financed_at column');
    } else {
      console.log('  financed_at already exists');
    }

    if (!existingColumns.includes('closed_at')) {
      await pool.query('ALTER TABLE invoice_ledger ADD COLUMN closed_at TIMESTAMP;');
      console.log('✓ Added closed_at column');
    } else {
      console.log('  closed_at already exists');
    }
    console.log();

    // Verify final structure
    console.log('Step 3: Verifying final structure...');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger'
      ORDER BY ordinal_position;
    `);
    
    console.log('✓ Final table structure:');
    finalColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    console.log();

    await pool.end();

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrate();
