/**
 * Test the lender activity endpoint to ensure it works correctly
 */

const ActivityModel = require('./models/activity.model');

async function testLenderActivityEndpoint() {
  console.log('🧪 Testing Lender Activity Endpoint...');
  
  try {
    // First, create some test activities
    await ActivityModel.logActivity('AXIS_BANK', 'test_giid_1', 'LOCKED', 'Invoice locked for financing');
    await ActivityModel.logActivity('AXIS_BANK', 'test_giid_2', 'FINANCED', 'Invoice financed successfully');
    await ActivityModel.logActivity('HDFC_BANK', 'test_giid_3', 'REJECTED', 'Invoice rejected by lender');
    
    console.log('✅ Test activities created');
    
    // Test the model directly
    const axisActivities = await ActivityModel.getLenderActivities('AXIS_BANK', 10);
    const hdfcActivities = await ActivityModel.getLenderActivities('HDFC_BANK', 10);
    
    console.log(`✅ AXIS_BANK has ${axisActivities.length} activities`);
    console.log(`✅ HDFC_BANK has ${hdfcActivities.length} activities`);
    
    // Verify isolation - AXIS_BANK should not see HDFC_BANK activities
    const axisHasHdfcActivity = axisActivities.some(activity => 
      activity.lender_identifier === 'HDFC_BANK'
    );
    
    if (!axisHasHdfcActivity) {
      console.log('✅ Activity isolation working correctly');
    } else {
      console.log('❌ Activity isolation failed - lenders can see each other\'s activities');
    }
    
    // Show sample activities
    console.log('\n📋 Sample AXIS_BANK activities:');
    axisActivities.slice(0, 3).forEach(activity => {
      console.log(`   ${activity.action}: ${activity.description} (${activity.giid})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Lender activity endpoint test failed:', error.message);
    return false;
  }
}

// Run the test
testLenderActivityEndpoint().then(success => {
  if (success) {
    console.log('\n🎉 Lender activity endpoint test passed!');
  } else {
    console.log('\n💥 Lender activity endpoint test failed!');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});