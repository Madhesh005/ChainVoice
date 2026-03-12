/**
 * Financing Request Model
 * Manages financing requests from MSMEs to lenders
 */

const db = require('../db');

class FinancingRequestModel {
  /**
   * Create a financing request
   * @param {Object} data - Request data
   * @returns {Object} Created financing request
   */
  static async create(data) {
    const { invoice_giid, invoice_id, lender_id, msme_id, requested_amount } = data;

    const query = `
      INSERT INTO financing_requests (
        invoice_giid, 
        invoice_id, 
        lender_id, 
        msme_id,
        requested_amount,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      ON CONFLICT (invoice_giid, lender_id) 
      DO UPDATE SET
        updated_at = NOW()
      RETURNING *
    `;

    const values = [invoice_giid, invoice_id, lender_id, msme_id, requested_amount];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get financing requests by lender ID
   * @param {string} lender_id - Lender ID
   * @param {string} status - Optional status filter
   * @returns {Array} Financing requests with invoice details
   */
  static async getByLender(lender_id, status = 'PENDING') {
    const query = `
      SELECT 
        fr.id as request_id,
        fr.invoice_giid,
        fr.lender_id,
        fr.status as request_status,
        fr.requested_amount,
        fr.created_at as request_date,
        i.id as invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.buyer_name,
        i.seller_name,
        i.buyer_gstin,
        i.seller_gstin,
        i.amount,
        i.gst_amount,
        i.total_amount,
        i.currency,
        i.status as invoice_status,
        i.giid,
        i.ipfs_cid as ipfs_hash,
        i.document_hash,
        i.blockchain_status,
        m.id as msme_id,
        m.company_name as msme_company_name,
        m.email as msme_email,
        m.gstin as msme_gstin,
        m.contact_person as msme_contact_person,
        m.phone as msme_phone
      FROM financing_requests fr
      JOIN invoices i ON fr.invoice_id = i.id
      JOIN msme_users m ON fr.msme_id = m.id
      WHERE fr.lender_id = $1
        AND fr.status = $2
      ORDER BY fr.created_at DESC
    `;

    const result = await db.query(query, [lender_id, status]);
    return result.rows;
  }

  /**
   * Get financing requests by MSME ID
   * @param {string} msme_id - MSME user ID
   * @returns {Array} Financing requests
   */
  static async getByMSME(msme_id) {
    const query = `
      SELECT 
        fr.*,
        i.invoice_number,
        i.amount,
        i.currency
      FROM financing_requests fr
      JOIN invoices i ON fr.invoice_id = i.id
      WHERE fr.msme_id = $1
      ORDER BY fr.created_at DESC
    `;

    const result = await db.query(query, [msme_id]);
    return result.rows;
  }

  /**
   * Get financing request by GIID and lender
   * @param {string} invoice_giid - Invoice GIID
   * @param {string} lender_id - Lender ID
   * @returns {Object|null} Financing request
   */
  static async getByGIIDAndLender(invoice_giid, lender_id) {
    const query = `
      SELECT * FROM financing_requests
      WHERE invoice_giid = $1 AND lender_id = $2
    `;

    const result = await db.query(query, [invoice_giid, lender_id]);
    return result.rows[0] || null;
  }

  /**
   * Update financing request status
   * @param {number} id - Request ID
   * @param {string} status - New status
   * @returns {Object} Updated request
   */
  static async updateStatus(id, status) {
    const query = `
      UPDATE financing_requests
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id, status]);
    return result.rows[0];
  }

  /**
   * Get statistics for a lender
   * @param {string} lender_id - Lender ID
   * @returns {Object} Statistics
   */
  static async getLenderStatistics(lender_id) {
    const query = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_requests,
        COUNT(DISTINCT msme_id) as total_msmes,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN i.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN i.amount ELSE 0 END), 0) as approved_amount
      FROM financing_requests fr
      JOIN invoices i ON fr.invoice_id = i.id
      WHERE fr.lender_id = $1
    `;

    const result = await db.query(query, [lender_id]);
    return result.rows[0];
  }

  /**
   * Check if financing request exists
   * @param {string} invoice_giid - Invoice GIID
   * @param {string} lender_id - Lender ID
   * @returns {boolean} Exists
   */
  static async exists(invoice_giid, lender_id) {
    const query = `
      SELECT id FROM financing_requests
      WHERE invoice_giid = $1 AND lender_id = $2
    `;

    const result = await db.query(query, [invoice_giid, lender_id]);
    return result.rows.length > 0;
  }

  /**
   * Delete financing request
   * @param {number} id - Request ID
   * @returns {boolean} Success
   */
  static async delete(id) {
    const query = `
      DELETE FROM financing_requests
      WHERE id = $1
      RETURNING id
    `;

    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }
}

module.exports = FinancingRequestModel;
