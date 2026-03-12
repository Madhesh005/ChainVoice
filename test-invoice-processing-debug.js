const FabricLedger = require('./invoice-backend/fabricLedger');

async function testInvoiceProcessing() {
    console.log('🔍 Testing complete invoice processing flow...');
    
    try {
        const fabricLedger = new FabricLedger();
        await fabricLedger.init();
        
        console.log('✅ Fabric connection initialized');
        
        // Step 1: Test verifyInvoice (should return found: false)
        console.log('\n🔍 Step 1: Testing verifyInvoice...');
        const testHash = 'test-hash-backend-' + Date.now();
        const verifyResult = await fabricLedger.verifyInvoice(testHash);
        console.log('✅ verifyInvoice result:', verifyResult);
        
        if (verifyResult.found) {
            console.log('Invoice already exists, skipping registration test');
            await fabricLedger.disconnect();
            return;
        }
        
        // Step 2: Test registerInvoice
        console.log('\n🔍 Step 2: Testing registerInvoice...');
        try {
            const registerResult = await fabricLedger.registerInvoice(
                testHash,
                'TEST-INV-001',
                'doc-hash-12345',
                'ipfs-cid-12345',
                'binding-hash-12345'
            );
            console.log('✅ registerInvoice result:', registerResult);
            
            // Step 3: Verify the invoice was registered
            console.log('\n🔍 Step 3: Verifying registration...');
            const verifyAfterRegister = await fabricLedger.verifyInvoice(testHash);
            console.log('✅ verifyInvoice after registration:', verifyAfterRegister);
            
        } catch (registerError) {
            console.error('❌ registerInvoice failed:', registerError.message);
            console.error('Error details:', registerError);
        }
        
        await fabricLedger.disconnect();
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testInvoiceProcessing();