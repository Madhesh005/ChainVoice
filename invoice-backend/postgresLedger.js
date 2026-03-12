/**
 * PostgreSQL Ledger Implementation
 * 
 * Implements the ledger interface using PostgreSQL database.
 * Uses atomic transactions with FOR UPDATE to ensure consistency.
 */

const pool = require('./db');

// Invoice states
const STATES = {
  AVAILABLE: 'AVAILABLE',
  LOCKED: 'LOCKED',
  FINANCED: 'FINANCED',
  CLOSED: 'CLOSED'
};

class PostgresLedger {
  /**
   * Initialize the ledger (create table if not exists)
   */
  async init() {
    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_ledger (
        id SERIAL PRIMARY KEY,
        invoice_hash TEXT UNIQUE NOT NULL,
        invoice_number TEXT NOT NULL,
        status TEXT DEFAULT 'AVAILABLE',
        locked_by TEXT,
        lender_id TEXT,
        financed_at TIMESTAMP,
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add document columns if they don't exist (for existing tables)
    try {
      // Check if columns exist
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invoice_ledger' 
        AND column_name IN ('document_hash', 'ipfs_cid', 'binding_hash');
      `;
      
      const existingColumns = await pool.query(checkQuery);
      const hasDocumentHash = existingColumns.rows.some(r => r.column_name === 'document_hash');
      const hasIpfsCid = existingColumns.rows.some(r => r.column_name === 'ipfs_cid');
      const hasBindingHash = existingColumns.rows.some(r => r.column_name === 'binding_hash');

      // Add missing columns
      if (!hasDocumentHash) {
        await pool.query(`ALTER TABLE invoice_ledger ADD COLUMN document_hash TEXT;`);
        console.log('✓ Added column: document_hash');
      }

      if (!hasIpfsCid) {
        await pool.query(`ALTER TABLE invoice_ledger ADD COLUMN ipfs_cid TEXT;`);
        console.log('✓ Added column: ipfs_cid');
      }

      if (!hasBindingHash) {
        await pool.query(`ALTER TABLE invoice_ledger ADD COLUMN binding_hash VARCHAR(64);`);
        console.log('✓ Added column: binding_hash');
      }

    } catch (err) {
      // Columns might already exist or other error
      console.log('Note: Document columns check completed');
    }
  }

  /**
   * Register a new invoice
   */
  async registerInvoice(hash, invoiceNumber, documentHash = null, ipfsCID = null, bindingHash = null) {
    console.log(`\n📝 PostgresLedger.registerInvoice() called:`);
    console.log(`   hash: ${hash ? hash.substring(0, 32) + '...' : 'NULL'}`);
    console.log(`   invoiceNumber: ${invoiceNumber}`);
    console.log(`   documentHash: ${documentHash ? documentHash.substring(0, 32) + '...' : 'NULL'}`);
    console.log(`   ipfsCID: ${ipfsCID || 'NULL'}`);
    console.log(`   bindingHash: ${bindingHash ? bindingHash.substring(0, 32) + '...' : 'NULL'}`);

    const result = await pool.query(
      `INSERT INTO invoice_ledger (invoice_hash, invoice_number, document_hash, ipfs_cid, binding_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (invoice_hash) DO NOTHING
       RETURNING invoice_hash;`,
      [hash, invoiceNumber, documentHash, ipfsCID, bindingHash]
    );

    const success = result.rowCount > 0;
    console.log(`   ➜ Insert result: ${success ? 'SUCCESS' : 'DUPLICATE (conflict)'}`);
    
    return success;
  }

  /**
   * Verify invoice status
   */
  async verifyInvoice(hash) {
    const result = await pool.query(
      `SELECT invoice_hash, invoice_number, status, locked_by, lender_id, 
              document_hash, ipfs_cid, binding_hash, financed_at, closed_at, created_at
       FROM invoice_ledger 
       WHERE invoice_hash = $1;`,
      [hash]
    );

    if (result.rows.length === 0) {
      return { found: false };
    }

    return {
      found: true,
      ...result.rows[0]
    };
  }

  /**
   * Lock invoice (atomic operation)
   */
  async lockInvoice(hash, lenderId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Lock the row for update (atomic operation)
      const selectResult = await client.query(
        `SELECT invoice_hash, status, locked_by 
         FROM invoice_ledger 
         WHERE invoice_hash = $1 
         FOR UPDATE;`,
        [hash]
      );

      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Invoice not found'
        };
      }

      const invoice = selectResult.rows[0];

      if (invoice.status !== STATES.AVAILABLE) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `Invoice is ${invoice.status}, cannot lock`,
          current_status: invoice.status,
          locked_by: invoice.locked_by
        };
      }

      // Update to LOCKED with both locked_by and lender_id
      const updateResult = await client.query(
        `UPDATE invoice_ledger 
         SET status = $1, 
             locked_by = $2,
             lender_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE invoice_hash = $3
         RETURNING *;`,
        [STATES.LOCKED, lenderId, hash]
      );

      await client.query('COMMIT');

      return {
        success: true,
        invoice: updateResult.rows[0]
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Finance invoice
   */
  async financeInvoice(hash, lenderId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Lock the row for update
      const selectResult = await client.query(
        `SELECT invoice_hash, status, locked_by 
         FROM invoice_ledger 
         WHERE invoice_hash = $1 
         FOR UPDATE;`,
        [hash]
      );

      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Invoice not found'
        };
      }

      const invoice = selectResult.rows[0];

      if (invoice.status !== STATES.LOCKED) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `Invoice must be LOCKED to finance, current status: ${invoice.status}`
        };
      }

      if (invoice.locked_by !== lenderId) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `Invoice locked by ${invoice.locked_by}, cannot be financed by ${lenderId}`
        };
      }

      // Update to FINANCED
      const updateResult = await client.query(
        `UPDATE invoice_ledger 
         SET status = $1,
             lender_id = $2,
             financed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE invoice_hash = $3
         RETURNING *;`,
        [STATES.FINANCED, lenderId, hash]
      );

      await client.query('COMMIT');

      return {
        success: true,
        invoice: updateResult.rows[0]
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Close invoice
   */
  async closeInvoice(hash) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Lock the row for update
      const selectResult = await client.query(
        `SELECT invoice_hash, status 
         FROM invoice_ledger 
         WHERE invoice_hash = $1 
         FOR UPDATE;`,
        [hash]
      );

      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Invoice not found'
        };
      }

      const invoice = selectResult.rows[0];

      if (invoice.status !== STATES.FINANCED) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `Invoice must be FINANCED to close, current status: ${invoice.status}`
        };
      }

      // Update to CLOSED
      const updateResult = await client.query(
        `UPDATE invoice_ledger 
         SET status = $1,
             closed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE invoice_hash = $2
         RETURNING *;`,
        [STATES.CLOSED, hash]
      );

      await client.query('COMMIT');

      return {
        success: true,
        invoice: updateResult.rows[0]
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Unlock invoice
   */
  async unlockInvoice(hash, lenderId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const selectResult = await client.query(
        `SELECT invoice_hash, status, locked_by 
         FROM invoice_ledger 
         WHERE invoice_hash = $1 
         FOR UPDATE;`,
        [hash]
      );

      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Invoice not found'
        };
      }

      const invoice = selectResult.rows[0];

      if (invoice.status !== STATES.LOCKED) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `Invoice is ${invoice.status}, cannot unlock`
        };
      }

      if (invoice.locked_by !== lenderId) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `Invoice locked by ${invoice.locked_by}, cannot be unlocked by ${lenderId}`
        };
      }

      // Update back to AVAILABLE
      const updateResult = await client.query(
        `UPDATE invoice_ledger 
         SET status = $1,
             locked_by = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE invoice_hash = $2
         RETURNING *;`,
        [STATES.AVAILABLE, hash]
      );

      await client.query('COMMIT');

      return {
        success: true,
        invoice: updateResult.rows[0]
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Query invoices by status
   */
  async queryInvoicesByStatus(status) {
    const result = await pool.query(
      `SELECT invoice_hash, invoice_number, status, locked_by, lender_id,
              document_hash, ipfs_cid, binding_hash, financed_at, closed_at, created_at
       FROM invoice_ledger
       WHERE status = $1
       ORDER BY created_at DESC;`,
      [status]
    );

    return result.rows;
  }

  /**
   * Query invoices by lender
   */
  async queryInvoicesByLender(lenderId) {
    const result = await pool.query(
      `SELECT invoice_hash, invoice_number, status, locked_by, lender_id,
              document_hash, ipfs_cid, binding_hash, financed_at, closed_at, created_at
       FROM invoice_ledger
       WHERE lender_id = $1 OR locked_by = $1
       ORDER BY created_at DESC;`,
      [lenderId]
    );

    return result.rows;
  }

  /**
   * Get ledger statistics
   */
  async getStatistics() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available,
        COUNT(*) FILTER (WHERE status = 'LOCKED') as locked,
        COUNT(*) FILTER (WHERE status = 'FINANCED') as financed,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as closed
      FROM invoice_ledger;
    `);

    return result.rows[0];
  }

  /**
   * Get invoice history (PostgreSQL doesn't track history by default)
   * This would require audit table or triggers
   */
  async getInvoiceHistory(hash) {
    // For now, return current state only
    const invoice = await this.verifyInvoice(hash);
    if (!invoice.found) {
      return [];
    }

    const history = [];
    
    if (invoice.created_at) {
      history.push({
        timestamp: invoice.created_at,
        status: 'AVAILABLE',
        action: 'REGISTERED'
      });
    }

    if (invoice.locked_by) {
      history.push({
        timestamp: invoice.updated_at,
        status: 'LOCKED',
        action: 'LOCKED',
        lender: invoice.locked_by
      });
    }

    if (invoice.financed_at) {
      history.push({
        timestamp: invoice.financed_at,
        status: 'FINANCED',
        action: 'FINANCED',
        lender: invoice.lender_id
      });
    }

    if (invoice.closed_at) {
      history.push({
        timestamp: invoice.closed_at,
        status: 'CLOSED',
        action: 'CLOSED'
      });
    }

    return history;
  }
}

module.exports = PostgresLedger;
