/**
 * Activity Model
 * Handles activity logging for dashboard display
 */

const db = require('../db');

class ActivityModel {
  /**
   * Log an activity (new simplified format for lender actions)
   * @param {string} lender_identifier - Lender identifier (e.g., 'AXIS_BANK')
   * @param {string} giid - Global Invoice ID
   * @param {string} action - Action type (e.g., 'LOCKED', 'REJECTED', 'FINANCED')
   * @param {string} description - Action description
   */
  static async logActivity(lender_identifier, giid, action, description) {
    const query = `
      INSERT INTO activity_log (lender_identifier, giid, action, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [lender_identifier, giid, action, description];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Log an activity (legacy format for backward compatibility)
   */
  static async logActivityLegacy(activityData) {
    const {
      msme_id,
      lender_identifier,
      activity_type,
      activity_title,
      activity_description,
      related_invoice_id,
      related_invoice_number,
      metadata,
    } = activityData;

    const query = `
      INSERT INTO activity_log (
        msme_id, lender_identifier, activity_type, activity_title, activity_description,
        related_invoice_id, related_invoice_number, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      msme_id,
      lender_identifier || null,
      activity_type,
      activity_title,
      activity_description || null,
      related_invoice_id || null,
      related_invoice_number || null,
      metadata ? JSON.stringify(metadata) : null,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get recent activities for MSME
   */
  static async getRecentActivities(msme_id, limit = 10) {
    const query = `
      SELECT 
        id,
        activity_type,
        activity_title,
        activity_description,
        related_invoice_id,
        related_invoice_number,
        lender_identifier,
        metadata,
        created_at
      FROM activity_log
      WHERE msme_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [msme_id, limit]);
    return result.rows;
  }

  /**
   * Get recent activities for lender (updated to use new format)
   */
  static async getLenderActivities(lender_identifier, limit = 10) {
    const query = `
      SELECT *
      FROM activity_log
      WHERE lender_identifier = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [lender_identifier, limit]);
    return result.rows;
  }

  /**
   * Get activities by type
   */
  static async getActivitiesByType(msme_id, activity_type, limit = 10) {
    const query = `
      SELECT *
      FROM activity_log
      WHERE msme_id = $1 AND activity_type = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await db.query(query, [msme_id, activity_type, limit]);
    return result.rows;
  }

  /**
   * Delete old activities (cleanup)
   */
  static async deleteOldActivities(daysOld = 90) {
    const query = `
      DELETE FROM activity_log
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING id
    `;

    const result = await db.query(query);
    return result.rowCount;
  }
}

module.exports = ActivityModel;
