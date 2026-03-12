/**
 * Lender Invoice Access Model
 * Manages which lenders can view which invoices
 */

const db = require('../db');

class LenderInvoiceAccessModel {
  /**
   * Grant access to lenders for an invoice
   * @param {Object} data - Access data
   * @returns {Array} Created access records
   */
  static async grantAccess(data) {
    const { invoice_giid, invoice_id, lender_ids, msme_id } = data;

    if (!lender_ids || lender_ids.length === 0) {
      throw new Error('At least one lender must be selected');
    }

    const results = [];

    for (const lender_id of lender_ids) {
      const query = `
        INSERT INTO lender_invoice_access (invoice_giid, invoice_id, lender_id, msme_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (invoice_giid, lender_id) DO NOTHING
        RETURNING *
      `;

      const values = [invoice_giid, invoice_id, lender_id, msme_id];
      const result = await db.query(query, values);
      
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }

    return results;
  }

  /**
   * Get all lenders who have access to an invoice
   * @param {string} invoice_giid - Invoice GIID
   * @returns {Array} Lender IDs
   */
  static async getLendersByInvoice(invoice_giid) {
    const query = `
      SELECT lender_id, created_at
      FROM lender_invoice_access
      WHERE invoice_giid = $1
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, [invoice_giid]);
    return result.rows;
  }

  /**
   * Get all invoices accessible to a lender
   * @param {string} lender_id - Lender ID
   * @returns {Array} Invoices
   */
  static async getInvoicesByLender(lender_id) {
    const query = `
      SELECT 
        i.*,
        lia.created_at as shared_at,
        m.company_name as msme_company_name,
        m.email as msme_email,
        m.gstin as msme_gstin
      FROM lender_invoice_access lia
      JOIN invoices i ON lia.invoice_id = i.id
      JOIN msme_users m ON lia.msme_id = m.id
      WHERE lia.lender_id = $1
      ORDER BY lia.created_at DESC
    `;

    const result = await db.query(query, [lender_id]);
    return result.rows;
  }

  /**
   * Check if a lender has access to an invoice
   * @param {string} lender_id - Lender ID
   * @param {string} invoice_giid - Invoice GIID
   * @returns {boolean} Has access
   */
  static async hasAccess(lender_id, invoice_giid) {
    const query = `
      SELECT id
      FROM lender_invoice_access
      WHERE lender_id = $1 AND invoice_giid = $2
    `;

    const result = await db.query(query, [lender_id, invoice_giid]);
    return result.rows.length > 0;
  }

  /**
   * Revoke lender access to an invoice
   * @param {string} invoice_giid - Invoice GIID
   * @param {string} lender_id - Lender ID
   * @returns {boolean} Success
   */
  static async revokeAccess(invoice_giid, lender_id) {
    const query = `
      DELETE FROM lender_invoice_access
      WHERE invoice_giid = $1 AND lender_id = $2
      RETURNING id
    `;

    const result = await db.query(query, [invoice_giid, lender_id]);
    return result.rowCount > 0;
  }

  /**
   * Get statistics for a lender
   * @param {string} lender_id - Lender ID
   * @returns {Object} Statistics
   */
  static async getLenderStatistics(lender_id) {
    const query = `
      SELECT 
        COUNT(DISTINCT lia.invoice_id) as total_invoices,
        COUNT(DISTINCT lia.msme_id) as total_msmes,
        COALESCE(SUM(i.amount), 0) as total_amount
      FROM lender_invoice_access lia
      JOIN invoices i ON lia.invoice_id = i.id
      WHERE lia.lender_id = $1
    `;

    const result = await db.query(query, [lender_id]);
    return result.rows[0];
  }
}

module.exports = LenderInvoiceAccessModel;
