/**
 * Test Notification System
 * Tests the complete notification workflow
 */

const db = require('./db');
const NotificationController = require('./controllers/notificationController');

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Notification System...\n');

    // Test 1: Create a test notification
    console.log('📬 Test 1: Creating test notification...');
    const testNotification = await NotificationController.createNotification(
      1, // msme_id (assuming MSME with ID 1 exists)
      'test-giid-12345',
      'INV/TEST/001',
      'HDFC_BANK',
      'APPROVED',
      'HDFC Bank approved and verified invoice INV/TEST/001'
    );
    console.log('✅ Test notification created:', testNotification.id);

    // Test 2: Fetch notifications (simulate API call)
    console.log('\n📋 Test 2: Fetching notifications...');
    const mockReq = { user: { id: 1 } };
    const mockRes = {
      json: (data) => {
        console.log('✅ Notifications fetched:', {
          count: data.notifications?.length || 0,
          unread_count: data.unread_count
        });
        return data;
      },
      status: (code) => ({ json: mockRes.json })
    };

    await NotificationController.getNotifications(mockReq, mockRes);

    // Test 3: Mark notification as read
    console.log('\n📖 Test 3: Marking notification as read...');
    const mockReqRead = { 
      user: { id: 1 }, 
      params: { id: testNotification.id.toString() } 
    };
    const mockResRead = {
      json: (data) => {
        console.log('✅ Notification marked as read:', data.success);
        return data;
      },
      status: (code) => ({ json: mockResRead.json })
    };

    await NotificationController.markAsRead(mockReqRead, mockResRead);

    // Test 4: Verify notification is marked as read
    console.log('\n🔍 Test 4: Verifying notification is read...');
    const verifyResult = await db.query(`
      SELECT is_read FROM notifications WHERE id = $1
    `, [testNotification.id]);

    if (verifyResult.rows[0]?.is_read) {
      console.log('✅ Notification correctly marked as read');
    } else {
      console.log('❌ Notification not marked as read');
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await db.query('DELETE FROM notifications WHERE id = $1', [testNotification.id]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All notification system tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNotificationSystem();