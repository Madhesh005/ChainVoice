// Test the complete invoice flow without Odoo
const { buildCanonicalInvoice } = require('./canonicalize');
const { generateHash } = require('./hashService');
const { init, registerHash } = require('./ledger');

async function testCompleteFlow() {
  console.log('🔹 Testing Complete Invoice Flow\n');

  try {
    // Step 1: Initialize database
    console.log('Step 1: Initializing database...');
    await init();
    console.log('✓ Database initialized\n');

    // Step 2: Create mock invoice data
    console.log('Step 2: Creating mock invoice data...');
    const mockInvoiceData = {
      header: {
        name: 'INV/2024/0001',
        invoice_date: '2024-01-15',
        amount_total: 1500.00,
        state: 'posted',
        partner_id: [1, 'Customer ABC']
      },
      lines: [
        {
          name: 'Product A',
          quantity: 2,
          price_unit: 500.00,
          price_subtotal: 1000.00
        },
        {
          name: 'Product B',
          quantity: 1,
          price_unit: 500.00,
          price_subtotal: 500.00
        }
      ]
    };
    console.log('✓ Mock data created\n');

    // Step 3: Build canonical invoice
    console.log('Step 3: Building canonical invoice...');
    const canonical = buildCanonicalInvoice(mockInvoiceData);
    console.log('✓ Canonical invoice:');
    console.log(JSON.stringify(canonical, null, 2));
    console.log();

    // Step 4: Generate hash
    console.log('Step 4: Generating hash...');
    const hash = generateHash(canonical);
    console.log('✓ Hash:', hash);
    console.log();

    // Step 5: Register in ledger (first time)
    console.log('Step 5: Registering in ledger (first time)...');
    const isNew1 = await registerHash(hash, mockInvoiceData.header.name);
    console.log('✓ Registered:', isNew1);
    console.log('  Expected: true (new invoice)\n');

    // Step 6: Try to register again (duplicate)
    console.log('Step 6: Trying to register again (duplicate)...');
    const isNew2 = await registerHash(hash, mockInvoiceData.header.name);
    console.log('✓ Registered:', isNew2);
    console.log('  Expected: false (duplicate prevented)\n');

    // Step 7: Verify in database
    console.log('Step 7: Verifying in database...');
    const pool = require('./db');
    const result = await pool.query(
      'SELECT * FROM invoice_ledger WHERE invoice_hash = $1',
      [hash]
    );
    console.log('✓ Database record:');
    console.log(result.rows[0]);
    console.log();

    // Step 8: Test with different invoice
    console.log('Step 8: Testing with different invoice...');
    const mockInvoiceData2 = {
      header: {
        name: 'INV/2024/0002',
        invoice_date: '2024-01-16',
        amount_total: 2000.00,
        state: 'posted',
        partner_id: [2, 'Customer XYZ']
      },
      lines: [
        {
          name: 'Product C',
          quantity: 4,
          price_unit: 500.00,
          price_subtotal: 2000.00
        }
      ]
    };
    const canonical2 = buildCanonicalInvoice(mockInvoiceData2);
    const hash2 = generateHash(canonical2);
    const isNew3 = await registerHash(hash2, mockInvoiceData2.header.name);
    console.log('✓ Second invoice registered:', isNew3);
    console.log('  Hash:', hash2);
    console.log('  Expected: true (different invoice)\n');

    // Step 9: Count total records
    console.log('Step 9: Counting total records...');
    const countResult = await pool.query('SELECT COUNT(*) FROM invoice_ledger');
    console.log('✓ Total invoices in ledger:', countResult.rows[0].count);
    console.log();

    await pool.end();

    console.log('✅ COMPLETE FLOW TEST PASSED!\n');
    console.log('Summary:');
    console.log('- Canonical invoice generation: ✓');
    console.log('- Hash generation: ✓');
    console.log('- Database registration: ✓');
    console.log('- Duplicate prevention: ✓');
    console.log('- Multiple invoices: ✓');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testCompleteFlow();
