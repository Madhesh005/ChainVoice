const FabricLedger = require('./invoice-backend/fabricLedger');

async function testFabric() {
    console.log('🔍 Testing Fabric connection directly...');
    
    try {
        const fabricLedger = new FabricLedger();
        await fabricLedger.init();
        
        console.log('✅ Fabric connection initialized');
        
        // Test a simple query
        console.log('🔍 Testing GetAllInvoices...');
        const stats = await fabricLedger.getStatistics();
        console.log('✅ GetAllInvoices result:', stats);
        
        // Test verifyInvoice with a dummy hash
        console.log('🔍 Testing verifyInvoice with dummy hash...');
        const result = await fabricLedger.verifyInvoice('dummy-hash-12345');
        console.log('✅ verifyInvoice result:', result);
        
        await fabricLedger.disconnect();
        console.log('✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testFabric();