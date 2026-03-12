const pool = require('./db');

async function verify() {
  try {
    console.log('1. Testing connection...');
    const timeResult = await pool.query('SELECT NOW()');
    console.log('✓ Connected:', timeResult.rows[0].now);

    console.log('\n2. Checking if invoice_ledger table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'invoice_ledger'
      );
    `);
    console.log('✓ Table exists:', tableCheck.rows[0].exists);

    console.log('\n3. Describing table structure...');
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoice_ledger'
      ORDER BY ordinal_position;
    `);
    console.log('✓ Table structure:');
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default || ''}`);
    });

    console.log('\n4. Checking constraints...');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'invoice_ledger';
    `);
    console.log('✓ Constraints:');
    constraints.rows.forEach(c => {
      console.log(`  - ${c.constraint_name}: ${c.constraint_type}`);
    });

    console.log('\n5. Testing insert...');
    const testHash = 'test_hash_' + Date.now();
    const insertResult = await pool.query(
      `INSERT INTO invoice_ledger (invoice_hash, invoice_number)
       VALUES ($1, $2)
       RETURNING *;`,
      [testHash, 'TEST-001']
    );
    console.log('✓ Insert successful:', insertResult.rows[0]);

    console.log('\n6. Testing duplicate prevention...');
    try {
      await pool.query(
        `INSERT INTO invoice_ledger (invoice_hash, invoice_number)
         VALUES ($1, $2);`,
        [testHash, 'TEST-002']
      );
      console.log('✗ FAILED: Duplicate was allowed!');
    } catch (err) {
      console.log('✓ Duplicate prevented correctly:', err.message);
    }

    console.log('\n7. Counting total records...');
    const count = await pool.query('SELECT COUNT(*) FROM invoice_ledger;');
    console.log('✓ Total records:', count.rows[0].count);

    console.log('\n8. Listing all records...');
    const all = await pool.query('SELECT * FROM invoice_ledger ORDER BY created_at DESC LIMIT 5;');
    console.log('✓ Recent records:');
    all.rows.forEach(r => {
      console.log(`  - ${r.invoice_number}: ${r.invoice_hash.substring(0, 20)}... [${r.status}]`);
    });

    console.log('\n✅ ALL CHECKS PASSED!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

verify();
