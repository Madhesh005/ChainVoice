/**
 * Invoice Model
 * Handles database operations for invoices from ERP systems
 */

const db = require('../db');

class InvoiceModel {
  /**
   * Create or update invoice (upsert)
   */
  static async upsert(invoiceData) {
    const {
      msme_id,
      erp_connection_id,
      erp_invoice_id,
      invoice_number,
      invoice_date,
      buyer_name,
      buyer_gstin,
      seller_name,
      seller_gstin,
      amount,
      currency,
      status,
      raw_data,
      normalized_hash,
    } = invoiceData;

    const query = `
      INSERT INTO invoices (
        msme_id, erp_connection_id, erp_invoice_id, invoice_number,
        invoice_date, buyer_name, buyer_gstin, seller_name, seller_gstin,
        amount, currency, status, raw_data, normalized_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (erp_connection_id, erp_invoice_id)
      DO UPDATE SET
        invoice_number = EXCLUDED.invoice_number,
        invoice_date = EXCLUDED.invoice_date,
        buyer_name = EXCLUDED.buyer_name,
        buyer_gstin = EXCLUDED.buyer_gstin,
        seller_name = EXCLUDED.seller_name,
        seller_gstin = EXCLUDED.seller_gstin,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        raw_data = EXCLUDED.raw_data,
        normalized_hash = EXCLUDED.normalized_hash,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      msme_id,
      erp_connection_id,
      erp_invoice_id,
      invoice_number,
      invoice_date,
      buyer_name,
      buyer_gstin,
      seller_name,
      seller_gstin,
      amount,
      currency,
      status,
      JSON.stringify(raw_data),
      normalized_hash,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Bulk upsert invoices
   */
  static async bulkUpsert(invoices) {
    const results = [];
    for (const invoice of invoices) {
      const result = await this.upsert(invoice);
      results.push(result);
    }
    return results;
  }

  /**
   * Get invoices by MSME ID
   */
  static async findByMSME(msme_id, filters = {}) {
    let query = `
      SELECT i.*, ec.erp_type, ec.base_url
      FROM invoices i
      LEFT JOIN erp_connections ec ON i.erp_connection_id = ec.id
      WHERE i.msme_id = $1
    `;

    const values = [msme_id];
    let paramCount = 1;

    // Add filters
    if (filters.status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.from_date) {
      paramCount++;
      query += ` AND i.invoice_date >= $${paramCount}`;
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      query += ` AND i.invoice_date <= $${paramCount}`;
      values.push(filters.to_date);
    }

    if (filters.erp_type) {
      paramCount++;
      query += ` AND ec.erp_type = $${paramCount}`;
      values.push(filters.erp_type);
    }

    query += ' ORDER BY i.invoice_date DESC, i.created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get invoice by ID
   */
  static async findById(id) {
    const query = `
      SELECT i.*, ec.erp_type, ec.base_url
      FROM invoices i
      LEFT JOIN erp_connections ec ON i.erp_connection_id = ec.id
      WHERE i.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get invoice by invoice number
   */
  static async findByInvoiceNumber(msme_id, invoice_number) {
    const query = `
      SELECT i.*, ec.erp_type
      FROM invoices i
      LEFT JOIN erp_connections ec ON i.erp_connection_id = ec.id
      WHERE i.msme_id = $1 AND i.invoice_number = $2
    `;
    const result = await db.query(query, [msme_id, invoice_number]);
    return result.rows[0];
  }

  /**
   * Get invoice by ERP invoice ID
   */
  static async findByErpInvoiceId(erp_invoice_id) {
    if (!erp_invoice_id) {
      throw new Error('ERP invoice ID is required');
    }
    
    const query = `
      SELECT i.*, ec.erp_type, ec.base_url
      FROM invoices i
      LEFT JOIN erp_connections ec ON i.erp_connection_id = ec.id
      WHERE i.erp_invoice_id = $1
    `;
    const result = await db.query(query, [erp_invoice_id.toString()]);
    return result.rows[0];
  }

  /**
   * Get invoice by GIID
   */
  static async findByGIID(giid) {
    const query = `
      SELECT i.*, ec.erp_type
      FROM invoices i
      LEFT JOIN erp_connections ec ON i.erp_connection_id = ec.id
      WHERE i.giid = $1
    `;
    const result = await db.query(query, [giid]);
    return result.rows[0];
  }

  /**
   * Update invoice GIID (after blockchain registration)
   */
  static async updateGIID(id, giid, blockchain_tx_id = null) {
    const query = `
      UPDATE invoices
      SET giid = $2,
          blockchain_tx_id = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, giid, blockchain_tx_id]);
    return result.rows[0];
  }

  /**
   * Update blockchain registration data
   */
  static async updateBlockchainData(id, blockchainData) {
    const {
      giid,
      ipfs_cid,
      document_hash,
      blockchain_status,
      blockchain_tx_hash,
      blockchain_block_number,
      blockchain_timestamp,
    } = blockchainData;

    const query = `
      UPDATE invoices
      SET giid = COALESCE($2, giid),
          ipfs_cid = COALESCE($3, ipfs_cid),
          document_hash = COALESCE($4, document_hash),
          blockchain_status = COALESCE($5, blockchain_status),
          blockchain_tx_hash = COALESCE($6, blockchain_tx_hash),
          blockchain_block_number = COALESCE($7, blockchain_block_number),
          blockchain_timestamp = COALESCE($8, blockchain_timestamp),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      giid,
      ipfs_cid,
      document_hash,
      blockchain_status,
      blockchain_tx_hash,
      blockchain_block_number,
      blockchain_timestamp,
    ]);

    return result.rows[0];
  }

  /**
   * Update blockchain data by ERP invoice ID
   */
  static async updateBlockchainDataByErpId(erp_invoice_id, blockchainData) {
    const {
      giid,
      ipfs_cid,
      document_hash,
      blockchain_status,
      blockchain_tx_hash,
      blockchain_block_number,
      blockchain_timestamp,
    } = blockchainData;

    const query = `
      UPDATE invoices
      SET giid = COALESCE($2, giid),
          ipfs_cid = COALESCE($3, ipfs_cid),
          document_hash = COALESCE($4, document_hash),
          blockchain_status = COALESCE($5, blockchain_status),
          blockchain_tx_hash = COALESCE($6, blockchain_tx_hash),
          blockchain_block_number = COALESCE($7, blockchain_block_number),
          blockchain_timestamp = COALESCE($8, blockchain_timestamp),
          updated_at = NOW()
      WHERE erp_invoice_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      erp_invoice_id.toString(),
      giid,
      ipfs_cid,
      document_hash,
      blockchain_status,
      blockchain_tx_hash,
      blockchain_block_number,
      blockchain_timestamp,
    ]);

    return result.rows[0];
  }

  /**
   * Get invoices ready for blockchain registration
   * (posted invoices without GIID)
   */
  static async findReadyForBlockchain(msme_id, limit = 100) {
    const query = `
      SELECT i.*, ec.erp_type
      FROM invoices i
      LEFT JOIN erp_connections ec ON i.erp_connection_id = ec.id
      WHERE i.msme_id = $1
        AND i.status = 'posted'
        AND i.giid IS NULL
      ORDER BY i.invoice_date DESC
      LIMIT $2
    `;
    const result = await db.query(query, [msme_id, limit]);
    return result.rows;
  }

  /**
   * Get invoice statistics for MSME
   */
  static async getStatistics(msme_id) {
    const query = `
      SELECT
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'posted' THEN 1 END) as posted_invoices,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
        COUNT(CASE WHEN giid IS NOT NULL THEN 1 END) as blockchain_registered,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'posted' THEN amount ELSE 0 END) as posted_amount
      FROM invoices
      WHERE msme_id = $1
    `;
    const result = await db.query(query, [msme_id]);
    return result.rows[0];
  }

  /**
   * Delete invoice
   */
  static async delete(id) {
    const query = 'DELETE FROM invoices WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = InvoiceModel;
