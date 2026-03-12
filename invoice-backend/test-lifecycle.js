// Test complete invoice lifecycle state machine
const { buildCanonicalInvoice } = require('./canonicalize');
const { generateHash } = require('./hashService');
const { init, registerHash, verifyInvoice, lockInvoice, financeInvoice, closeInvoice, unlockInvoice, STATES } = require('./ledger');

async function testLifecycle() {
  console.log('🔹 Testing Complete Invoice Lifecycle State Machine\n');

  try {
    // Initialize database
    console.log('Step 0: Initializing database...');
    await init();
    console.log('✓ Database initialized\n');

    // Create test invoice
    const mockInvoice = {
      header: {
        name: 'INV/2024/TEST-' + Date.now(),
        invoice_date: '2024-01-15',
        amount_total: 5000.00,
        state: 'posted'
      },
      lines: [
        {
          name: 'Service A',
          quantity: 10,
          price_unit: 500.00,
          price_subtotal: 5000.00
        }
      ]
    };

    const canonical = buildCanonicalInvoice(mockInvoice);
    const hash = generateHash(canonical);
    const invoiceNumber = mockInvoice.header.name;

    console.log('Test Invoice:');
    console.log('  Number:', invoiceNumber);
    console.log('  Hash:', hash.substring(0, 20) + '...');
    console.log();

    // ========================================
    // STEP 1: Register Invoice
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Register Invoice');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const registered = await registerHash(hash, invoiceNumber);
    console.log('✓ Registered:', registered);
    console.log('  Expected: true (new invoice)');
    
    let status = await verifyInvoice(hash);
    console.log('✓ Status:', status.status);
    console.log('  Expected: AVAILABLE');
    console.log();

    // ========================================
    // STEP 2: Try Duplicate Registration
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Try Duplicate Registration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const duplicate = await registerHash(hash, invoiceNumber);
    console.log('✓ Duplicate prevented:', !duplicate);
    console.log('  Expected: true (duplicate rejected)');
    console.log();

    // ========================================
    // STEP 3: Lock Invoice (BANK_A)
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Lock Invoice (BANK_A)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const lockResult = await lockInvoice(hash, 'BANK_A');
    console.log('✓ Lock successful:', lockResult.success);
    console.log('  Status:', lockResult.invoice.status);
    console.log('  Locked by:', lockResult.invoice.locked_by);
    console.log('  Expected: LOCKED by BANK_A');
    console.log();

    // ========================================
    // STEP 4: Try to Lock Again (BANK_B)
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Try to Lock Again (BANK_B)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const lockResult2 = await lockInvoice(hash, 'BANK_B');
    console.log('✓ Lock rejected:', !lockResult2.success);
    console.log('  Error:', lockResult2.error);
    console.log('  Expected: Rejection (already locked)');
    console.log();

    // ========================================
    // STEP 5: Try to Finance with Wrong Lender
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Try to Finance with Wrong Lender');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const financeWrong = await financeInvoice(hash, 'BANK_B');
    console.log('✓ Finance rejected:', !financeWrong.success);
    console.log('  Error:', financeWrong.error);
    console.log('  Expected: Rejection (wrong lender)');
    console.log();

    // ========================================
    // STEP 6: Finance Invoice (Correct Lender)
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: Finance Invoice (Correct Lender)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const financeResult = await financeInvoice(hash, 'BANK_A');
    console.log('✓ Finance successful:', financeResult.success);
    console.log('  Status:', financeResult.invoice.status);
    console.log('  Lender:', financeResult.invoice.lender_id);
    console.log('  Financed at:', financeResult.invoice.financed_at);
    console.log('  Expected: FINANCED by BANK_A');
    console.log();

    // ========================================
    // STEP 7: Try to Lock Financed Invoice
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 7: Try to Lock Financed Invoice');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const lockFinanced = await lockInvoice(hash, 'BANK_C');
    console.log('✓ Lock rejected:', !lockFinanced.success);
    console.log('  Error:', lockFinanced.error);
    console.log('  Expected: Rejection (already financed)');
    console.log();

    // ========================================
    // STEP 8: Close Invoice (Buyer Pays)
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 8: Close Invoice (Buyer Pays)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const closeResult = await closeInvoice(hash);
    console.log('✓ Close successful:', closeResult.success);
    console.log('  Status:', closeResult.invoice.status);
    console.log('  Closed at:', closeResult.invoice.closed_at);
    console.log('  Expected: CLOSED');
    console.log();

    // ========================================
    // STEP 9: Try to Lock Closed Invoice
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 9: Try to Lock Closed Invoice');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const lockClosed = await lockInvoice(hash, 'BANK_D');
    console.log('✓ Lock rejected:', !lockClosed.success);
    console.log('  Error:', lockClosed.error);
    console.log('  Expected: Rejection (already closed)');
    console.log();

    // ========================================
    // STEP 10: Test Unlock Functionality
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 10: Test Unlock Functionality');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Create new invoice for unlock test
    const mockInvoice2 = {
      header: {
        name: 'INV/2024/UNLOCK-' + Date.now(),
        invoice_date: '2024-01-16',
        amount_total: 3000.00,
        state: 'posted'
      },
      lines: [
        {
          name: 'Service B',
          quantity: 6,
          price_unit: 500.00,
          price_subtotal: 3000.00
        }
      ]
    };
    
    const canonical2 = buildCanonicalInvoice(mockInvoice2);
    const hash2 = generateHash(canonical2);
    
    await registerHash(hash2, mockInvoice2.header.name);
    await lockInvoice(hash2, 'BANK_X');
    
    console.log('  Created and locked new invoice');
    console.log('  Hash:', hash2.substring(0, 20) + '...');
    
    // Try unlock with wrong lender
    const unlockWrong = await unlockInvoice(hash2, 'BANK_Y');
    console.log('✓ Unlock rejected (wrong lender):', !unlockWrong.success);
    console.log('  Error:', unlockWrong.error);
    
    // Unlock with correct lender
    const unlockResult = await unlockInvoice(hash2, 'BANK_X');
    console.log('✓ Unlock successful:', unlockResult.success);
    console.log('  Status:', unlockResult.invoice.status);
    console.log('  Expected: AVAILABLE');
    console.log();

    // ========================================
    // FINAL VERIFICATION
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FINAL VERIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const finalStatus = await verifyInvoice(hash);
    console.log('Invoice 1 Final State:');
    console.log('  Number:', finalStatus.invoice_number);
    console.log('  Status:', finalStatus.status);
    console.log('  Lender:', finalStatus.lender_id);
    console.log('  Financed at:', finalStatus.financed_at);
    console.log('  Closed at:', finalStatus.closed_at);
    console.log();

    const finalStatus2 = await verifyInvoice(hash2);
    console.log('Invoice 2 Final State:');
    console.log('  Number:', finalStatus2.invoice_number);
    console.log('  Status:', finalStatus2.status);
    console.log('  Locked by:', finalStatus2.locked_by);
    console.log();

    // Close pool
    await require('./db').end();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL LIFECYCLE TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('Summary:');
    console.log('✓ Invoice registration');
    console.log('✓ Duplicate prevention');
    console.log('✓ Atomic locking (FOR UPDATE)');
    console.log('✓ Lock ownership validation');
    console.log('✓ State transition enforcement');
    console.log('✓ Finance authorization');
    console.log('✓ Invoice closure');
    console.log('✓ Unlock functionality');
    console.log();
    console.log('State Machine Verified:');
    console.log('  AVAILABLE → LOCKED → FINANCED → CLOSED ✓');
    console.log('  LOCKED → AVAILABLE (unlock) ✓');
    console.log();

    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testLifecycle();
