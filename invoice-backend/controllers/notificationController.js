/**
 * Notification Controller
 * Handles MSME notifications for lender actions
 */

const db = require('../db');

class NotificationController {
  /**
   * Get notifications for logged-in MSME
   * GET /api/notifications
   */
  static async getNotifications(req, res) {
    try {
      const msme_id = req.user.id;

      console.log(`📬 Fetching notifications for MSME ID: ${msme_id}`);

      // Get notifications for this MSME
      const result = await db.query(`
        SELECT 
          id,
          invoice_giid,
          invoice_number,
          lender_id,
          action_type,
          message,
          is_read,
          created_at
        FROM notifications
        WHERE msme_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `, [msme_id]);

      // Get unread count
      const unreadResult = await db.query(`
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE msme_id = $1 AND is_read = FALSE
      `, [msme_id]);

      const unreadCount = parseInt(unreadResult.rows[0].unread_count) || 0;

      console.log(`✅ Found ${result.rows.length} notifications (${unreadCount} unread) for MSME ID: ${msme_id}`);

      res.json({
        success: true,
        notifications: result.rows,
        unread_count: unreadCount,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch notifications',
        details: error.message,
      });
    }
  }

  /**
   * Mark notification as read
   * POST /api/notifications/read/:id
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const msme_id = req.user.id;

      console.log(`📖 Marking notification ${id} as read for MSME ID: ${msme_id}`);

      // Update notification as read (ensure it belongs to this MSME)
      const result = await db.query(`
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1 AND msme_id = $2
        RETURNING *
      `, [id, msme_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found or does not belong to this MSME',
        });
      }

      console.log(`✅ Notification ${id} marked as read`);

      res.json({
        success: true,
        message: 'Notification marked as read',
        notification: result.rows[0],
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to mark notification as read',
        details: error.message,
      });
    }
  }

  /**
   * Create notification (internal function for lender actions)
   * This is called by the financing controller when lenders perform actions
   */
  static async createNotification(msme_id, invoice_giid, invoice_number, lender_id, action_type, message) {
    try {
      console.log(`📬 Creating notification for MSME ${msme_id}: ${action_type} by ${lender_id}`);

      const result = await db.query(`
        INSERT INTO notifications (msme_id, invoice_giid, invoice_number, lender_id, action_type, message)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [msme_id, invoice_giid, invoice_number, lender_id, action_type, message]);

      console.log(`✅ Notification created with ID: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationController;