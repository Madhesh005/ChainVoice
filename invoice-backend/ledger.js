const pool = require('./db');

// Invoice states
const STATES = {
  AVAILABLE: 'AVAILABLE',
  LOCKED: 'LOCKED',
  FINANCED: 'FINANCED',
  CLOSED: 'CLOSED'
};

async function init() {
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
}

async function registerHash(hash, invoiceNumber) {
  const result = await pool.query(
    `INSERT INTO invoice_ledger (invoice_hash, invoice_number)
     VALUES ($1, $2)
     ON CONFLICT (invoice_hash) DO NOTHING
     RETURNING invoice_hash;`,
    [hash, invoiceNumber]
  );

  return result.rowCount > 0;
}

async function verifyInvoice(hash) {
  const result = await pool.query(
    `SELECT invoice_hash, invoice_number, status, locked_by, lender_id, 
            financed_at, closed_at, created_at
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

async function lockInvoice(hash, lenderId) {
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

    // Update to LOCKED
    const updateResult = await client.query(
      `UPDATE invoice_ledger 
       SET status = $1, 
           locked_by = $2,
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

async function financeInvoice(hash, lenderId) {
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

async function closeInvoice(hash) {
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

async function unlockInvoice(hash, lenderId) {
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

module.exports = { 
  init, 
  registerHash, 
  verifyInvoice,
  lockInvoice,
  financeInvoice,
  closeInvoice,
  unlockInvoice,
  STATES
};