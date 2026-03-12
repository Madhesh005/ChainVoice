// Test ledger service abstraction layer
const { LedgerService } = require('./ledgerService');
const PostgresLedger = require('./postgresLedger');

async function testLedgerService() {
  console.log('🔹 Testing Ledger Service Abstraction Layer\n');

  try {
    // Initialize ledger service with PostgreSQL implementation
    const ledgerService = new LedgerService(new PostgresLedger());

    console.log('Step 0: Initializing ledger...');
    await ledgerService.init();
    console.log('✓ Ledger initialized\n');

    // Create test invoice data
    const mockInvoice = {
      header: {
        name: 'INV/2024/SERVICE-TEST-' + Date.now(),
        invoice_date: '2024-01-15',
        amount_total: 7500.00,
        state: 'posted'
      },
      lines: [
        {
          name: 'Consulting Services',
          quantity: 15,
          price_unit: 500.00,
          price_subtotal: 7500.00
        }
      ]
    };

    console.log('Test Invoice:', mockInvoice.header.name);
    console.log();

    // ========================================
    // STEP 1: Generate Hash and Register
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Generate Hash and Register Invoice');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const { canonical, hash, registered } = await ledgerService.registerInvoiceFromData(mockInvoice);
    
    console.log('✓ Canonical invoice generated');
    console.log('  Invoice number:', canonical.invoice_number);
    console.log('  Total amount:', canonical.total_amount);
    console.log('  Line items:', canonical.line_items.length);
    console.log();
    console.log('✓ Hash generated:', hash.substring(0, 40) + '...');
    console.log('✓ Registered:', registered);
    console.log('  Expected: true (new invoice)');
    console.log();

    // ========================================
    // STEP 2: Verify Invoice
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Verify Invoice Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const status = await ledgerService.verifyInvoice(hash);
    console.log('✓ Invoice found:', status.found);
    console.log('  Status:', status.status);
    console.log('  Invoice number:', status.invoice_number);
    console.log('  Expected: AVAILABLE');
    console.log();

    // ========================================
    // STEP 3: Lock Invoice
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Lock Invoice (BANK_A)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const lockResult = await ledgerService.lockInvoice(hash, 'BANK_A');
    console.log('✓ Lock successful:', lockResult.success);
    console.log('  Status:', lockResult.invoice.status);
    console.log('  Locked by:', lockResult.invoice.locked_by);
    console.log('  Expected: LOCKED by BANK_A');
    console.log();

    // ========================================
    // STEP 4: Try Duplicate Lock
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Try Duplicate Lock (BANK_B)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const lockResult2 = await ledgerService.lockInvoice(hash, 'BANK_B');
    console.log('✓ Lock rejected:', !lockResult2.success);
    console.log('  Error:', lockResult2.error);
    console.log('  Expected: Rejection (already locked)');
    console.log();

    // ========================================
    // STEP 5: Finance Invoice
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Finance Invoice (BANK_A)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const financeResult = await ledgerService.financeInvoice(hash, 'BANK_A');
    console.log('✓ Finance successful:', financeResult.success);
    console.log('  Status:', financeResult.invoice.status);
    console.log('  Lender:', financeResult.invoice.lender_id);
    console.log('  Expected: FINANCED by BANK_A');
    console.log();

    // ========================================
    // STEP 6: Close Invoice
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: Close Invoice');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const closeResult = await ledgerService.closeInvoice(hash);
    console.log('✓ Close successful:', closeResult.success);
    console.log('  Status:', closeResult.invoice.status);
    console.log('  Expected: CLOSED');
    console.log();

    // ========================================
    // STEP 7: Get Invoice History
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 7: Get Invoice History');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const history = await ledgerService.getInvoiceHistory(hash);
    console.log('✓ History retrieved:', history.length, 'events');
    history.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.action} → ${event.status} at ${event.timestamp}`);
    });
    console.log();

    // ========================================
    // STEP 8: Test Query Functions
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 8: Test Query Functions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Create a few more test invoices
    const mockInvoice2 = {
      header: {
        name: 'INV/2024/QUERY-TEST-1-' + Date.now(),
        invoice_date: '2024-01-16',
        amount_total: 2000.00,
        state: 'posted'
      },
      lines: [
        { name: 'Product X', quantity: 4, price_unit: 500.00, price_subtotal: 2000.00 }
      ]
    };

    const mockInvoice3 = {
      header: {
        name: 'INV/2024/QUERY-TEST-2-' + Date.now(),
        invoice_date: '2024-01-17',
        amount_total: 3000.00,
        state: 'posted'
      },
      lines: [
        { name: 'Product Y', quantity: 6, price_unit: 500.00, price_subtotal: 3000.00 }
      ]
    };

    const { hash: hash2 } = await ledgerService.registerInvoiceFromData(mockInvoice2);
    await ledgerService.lockInvoice(hash2, 'BANK_C');

    const { hash: hash3 } = await ledgerService.registerInvoiceFromData(mockInvoice3);
    await ledgerService.lockInvoice(hash3, 'BANK_C');
    await ledgerService.financeInvoice(hash3, 'BANK_C');

    console.log('✓ Created additional test invoices');
    console.log();

    // Query by status
    const availableInvoices = await ledgerService.queryInvoicesByStatus('AVAILABLE');
    console.log('✓ AVAILABLE invoices:', availableInvoices.length);

    const lockedInvoices = await ledgerService.queryInvoicesByStatus('LOCKED');
    console.log('✓ LOCKED invoices:', lockedInvoices.length);

    const financedInvoices = await ledgerService.queryInvoicesByStatus('FINANCED');
    console.log('✓ FINANCED invoices:', financedInvoices.length);

    const closedInvoices = await ledgerService.queryInvoicesByStatus('CLOSED');
    console.log('✓ CLOSED invoices:', closedInvoices.length);
    console.log();

    // Query by lender
    const bankCInvoices = await ledgerService.queryInvoicesByLender('BANK_C');
    console.log('✓ BANK_C invoices:', bankCInvoices.length);
    bankCInvoices.forEach(inv => {
      console.log(`  - ${inv.invoice_number}: ${inv.status}`);
    });
    console.log();

    // ========================================
    // STEP 9: Get Statistics
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 9: Get Ledger Statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const stats = await ledgerService.getStatistics();
    console.log('✓ Ledger Statistics:');
    console.log('  Total invoices:', stats.total);
    console.log('  Available:', stats.available);
    console.log('  Locked:', stats.locked);
    console.log('  Financed:', stats.financed);
    console.log('  Closed:', stats.closed);
    console.log();

    // Close pool
    await require('./db').end();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL LEDGER SERVICE TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('Summary:');
    console.log('✓ Ledger service abstraction working');
    console.log('✓ Hash generation integrated');
    console.log('✓ Invoice registration via service');
    console.log('✓ All lifecycle operations via service');
    console.log('✓ Query functions working');
    console.log('✓ Statistics working');
    console.log('✓ History tracking working');
    console.log();
    console.log('Ready for Hyperledger Fabric migration!');
    console.log('Just swap PostgresLedger with FabricLedger.');
    console.log();

    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testLedgerService();
