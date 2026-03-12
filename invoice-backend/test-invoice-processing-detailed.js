const { fetchInvoice } = require('./odooClient');
const { IdentityEngine } = require('./services/identityEngine');
const { LedgerService } = require('./ledgerService');
const FabricLedger = require('./fabricLedger');

async function testInvoiceProcessingDetailed() {
  try {
    console.log('🧪 Testing detailed invoice processing for ID 47...');
    
    // Step 1: Test Odoo fetch
    console.log('\n1️⃣  Testing Odoo fetch...');
    const invoice = await fetchInvoice(47);
    if (!invoice || invoice.length === 0) {
      console.log('❌ Invoice not found in Odoo');
      return;
    }
    
    const header = invoice[0];
    console.log('✅ Invoice fetched from Odoo:', {
      name: header.name,
      state: header.state,
      partner_id: header.partner_id,
      company_id: header.company_id
    });
    
    // Step 2: Test Identity Engine initialization
    console.log('\n2️⃣  Testing Identity Engine...');
    const fabricLedger = new FabricLedger();
    await fabricLedger.init();
    const ledgerService = new LedgerService(fabricLedger);
    await ledgerService.init();
    const identityEngine = new IdentityEngine(ledgerService);
    console.log('✅ Identity Engine initialized');
    
    // Step 3: Test invoice data preparation
    console.log('\n3️⃣  Testing invoice data preparation...');
    const invoiceData = {
      header: header,
      lines: [], // Simplified for testing
      seller_gstin: '33ABCDE1234F1Z5',
      buyer_gstin: '27AAACT2727Q1ZV',
      invoiceId: 47
    };
    console.log('✅ Invoice data prepared');
    
    // Step 4: Test canonical ordering
    console.log('\n4️⃣  Testing canonical ordering...');
    const canonical = identityEngine.enforceCanonicalOrdering(invoiceData);
    console.log('✅ Canonical ordering successful');
    
    // Step 5: Test GIID generation
    console.log('\n5️⃣  Testing GIID generation...');
    const giid = identityEngine.generateGIID(canonical);
    console.log('✅ GIID generated:', giid.substring(0, 32) + '...');
    
    // Step 6: Test if invoice already exists
    console.log('\n6️⃣  Testing ledger verification...');
    const existing = await ledgerService.verifyInvoice(giid);
    console.log('✅ Ledger verification result:', {
      found: existing.found,
      status: existing.status
    });
    
    if (existing.found) {
      console.log('ℹ️  Invoice already exists in ledger, skipping registration');
      return;
    }
    
    // Step 7: Test document service
    console.log('\n7️⃣  Testing document storage...');
    try {
      const docResult = await identityEngine.documentService.storeDocument(
        giid, 
        47, 
        header.name
      );
      console.log('✅ Document storage successful:', {
        document_hash: docResult.document_hash?.substring(0, 32) + '...',
        ipfs_cid: docResult.ipfs_cid,
        size: docResult.size
      });
      
      // Step 8: Test ledger registration
      console.log('\n8️⃣  Testing ledger registration...');
      const bindingHash = identityEngine.generateBindingHash(giid, docResult.document_hash);
      const registered = await ledgerService.registerInvoice(
        giid, 
        header.name,
        docResult.document_hash,
        docResult.ipfs_cid,
        bindingHash
      );
      
      if (registered) {
        console.log('✅ Ledger registration successful');
      } else {
        console.log('⚠️  Ledger registration returned false (duplicate)');
      }
      
    } catch (docError) {
      console.log('❌ Document storage failed:', docError.message);
      console.log('Stack:', docError.stack);
    }
    
    console.log('\n🎉 Detailed test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testInvoiceProcessingDetailed();