/**
 * ERP Connection Model
 * Handles database operations for ERP connections
 */

const db = require('../db');

class ERPConnectionModel {
  /**
   * Create a new ERP connection
   */
  static async create(connectionData) {
    const {
      msme_id,
      erp_type,
      base_url,
      database,
      username,
      encrypted_password,
    } = connectionData;

    const query = `
      INSERT INTO erp_connections (
        msme_id, erp_type, base_url, database, username, encrypted_password
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (msme_id, erp_type) 
      DO UPDATE SET
        base_url = EXCLUDED.base_url,
        database = EXCLUDED.database,
        username = EXCLUDED.username,
        encrypted_password = EXCLUDED.encrypted_password,
        is_active = true,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [msme_id, erp_type, base_url, database, username, encrypted_password];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get ERP connection by MSME ID and type
   */
  static async findByMSMEAndType(msme_id, erp_type) {
    const query = `
      SELECT * FROM erp_connections
      WHERE msme_id = $1 AND erp_type = $2 AND is_active = true
    `;
    const result = await db.query(query, [msme_id, erp_type]);
    return result.rows[0];
  }

  /**
   * Get all ERP connections for an MSME
   */
  static async findByMSME(msme_id) {
    const query = `
      SELECT * FROM erp_connections
      WHERE msme_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [msme_id]);
    return result.rows;
  }

  /**
   * Get ERP connection by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM erp_connections WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update last sync timestamp
   */
  static async updateLastSync(id, status = 'success', error = null) {
    const query = `
      UPDATE erp_connections
      SET last_sync_at = NOW(),
          sync_status = $2,
          last_error = $3
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, status, error]);
    return result.rows[0];
  }

  /**
   * Update sync status
   */
  static async updateSyncStatus(id, status, error = null) {
    const query = `
      UPDATE erp_connections
      SET sync_status = $2,
          last_error = $3
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, status, error]);
    return result.rows[0];
  }

  /**
   * Deactivate ERP connection
   */
  static async deactivate(id) {
    const query = `
      UPDATE erp_connections
      SET is_active = false
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Delete ERP connection
   */
  static async delete(id) {
    const query = 'DELETE FROM erp_connections WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = ERPConnectionModel;
