const FabricLedger = require('./invoice-backend/fabricLedger');

async function debugFabricError() {
    console.log('🔍 Debugging Fabric error details...');
    
    try {
        const fabricLedger = new FabricLedger();
        await fabricLedger.init();
        
        console.log('✅ Fabric connection initialized');
        
        // Test verifyInvoice with a dummy hash to trigger the error
        console.log('🔍 Testing verifyInvoice with dummy hash...');
        try {
            const result = await fabricLedger.contract.evaluateTransaction('QueryInvoice', 'dummy-hash');
            console.log('Unexpected success:', result.toString());
        } catch (error) {
            console.log('Error type:', typeof error);
            console.log('Error constructor:', error.constructor.name);
            console.log('Error message:', error.message);
            console.log('Error details:', JSON.stringify(error, null, 2));
            console.log('Error stack:', error.stack);
            
            // Check if it has specific properties
            if (error.responses) {
                console.log('Error responses:', error.responses);
            }
            if (error.errors) {
                console.log('Error errors:', error.errors);
            }
        }
        
        await fabricLedger.disconnect();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

debugFabricError();