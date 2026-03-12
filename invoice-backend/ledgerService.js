/**
 * Ledger Service Interface
 * 
 * This abstraction layer allows switching between different ledger implementations:
 * - PostgreSQL (current)
 * - Hyperledger Fabric (future)
 * 
 * All business logic should use this service, not direct database access.
 */

const { buildCanonicalInvoice } = require('./canonicalize');
const { generateHash } = require('./hashService');

// Invoice states
const STATES = {
  AVAILABLE: 'AVAILABLE',
  LOCKED: 'LOCKED',
  FINANCED: 'FINANCED',
  CLOSED: 'CLOSED'
};

class LedgerService {
  constructor(implementation) {
    this.implementation = implementation;
  }

  /**
   * Initialize the ledger
   */
  async init() {
    return await this.implementation.init();
  }

  /**
   * Generate canonical invoice and hash from raw invoice data
   * @param {Object} invoiceData - Raw invoice data with header and lines
   * @returns {Object} { canonical, hash }
   */
  generateInvoiceHash(invoiceData) {
    const canonical = buildCanonicalInvoice(invoiceData);
    const hash = generateHash(canonical);
    return { canonical, hash };
  }

  /**
   * Register a new invoice in the ledger
   * @param {string} hash - Invoice hash (SHA-256)
   * @param {string} invoiceNumber - Human-readable invoice number
   * @param {string} documentHash - SHA-256 hash of PDF document
   * @param {string} ipfsCID - IPFS Content Identifier
   * @param {string} bindingHash - Cryptographic binding of GIID and document hash
   * @returns {boolean} true if registered, false if duplicate
   */
  async registerInvoice(hash, invoiceNumber, documentHash = null, ipfsCID = null, bindingHash = null) {
    return await this.implementation.registerInvoice(hash, invoiceNumber, documentHash, ipfsCID, bindingHash);
  }

  /**
   * Register invoice from raw data (convenience method)
   * @param {Object} invoiceData - Raw invoice data
   * @returns {Object} { registered, hash, canonical }
   */
  async registerInvoiceFromData(invoiceData) {
    const { canonical, hash } = this.generateInvoiceHash(invoiceData);
    const registered = await this.registerInvoice(hash, invoiceData.header.name);
    return { registered, hash, canonical };
  }

  /**
   * Verify invoice status
   * @param {string} hash - Invoice hash
   * @returns {Object} Invoice details or { found: false }
   */
  async verifyInvoice(hash) {
    return await this.implementation.verifyInvoice(hash);
  }

  /**
   * Lock invoice for a specific lender (atomic operation)
   * @param {string} hash - Invoice hash
   * @param {string} lenderId - Lender identifier
   * @returns {Object} { success, invoice?, error? }
   */
  async lockInvoice(hash, lenderId) {
    return await this.implementation.lockInvoice(hash, lenderId);
  }

  /**
   * Finance a locked invoice
   * @param {string} hash - Invoice hash
   * @param {string} lenderId - Lender identifier (must match who locked it)
   * @returns {Object} { success, invoice?, error? }
   */
  async financeInvoice(hash, lenderId) {
    return await this.implementation.financeInvoice(hash, lenderId);
  }

  /**
   * Close a financed invoice (buyer paid)
   * @param {string} hash - Invoice hash
   * @returns {Object} { success, invoice?, error? }
   */
  async closeInvoice(hash) {
    return await this.implementation.closeInvoice(hash);
  }

  /**
   * Unlock a locked invoice (cancel lock)
   * @param {string} hash - Invoice hash
   * @param {string} lenderId - Lender identifier (must match who locked it)
   * @returns {Object} { success, invoice?, error? }
   */
  async unlockInvoice(hash, lenderId) {
    return await this.implementation.unlockInvoice(hash, lenderId);
  }

  /**
   * Get invoice history/audit trail
   * @param {string} hash - Invoice hash
   * @returns {Array} History of state changes
   */
  async getInvoiceHistory(hash) {
    if (this.implementation.getInvoiceHistory) {
      return await this.implementation.getInvoiceHistory(hash);
    }
    // Fallback for implementations without history
    return [];
  }

  /**
   * Query invoices by status
   * @param {string} status - Invoice status (AVAILABLE, LOCKED, FINANCED, CLOSED)
   * @returns {Array} List of invoices
   */
  async queryInvoicesByStatus(status) {
    if (this.implementation.queryInvoicesByStatus) {
      return await this.implementation.queryInvoicesByStatus(status);
    }
    throw new Error('Query by status not implemented');
  }

  /**
   * Query invoices by lender
   * @param {string} lenderId - Lender identifier
   * @returns {Array} List of invoices
   */
  async queryInvoicesByLender(lenderId) {
    if (this.implementation.queryInvoicesByLender) {
      return await this.implementation.queryInvoicesByLender(lenderId);
    }
    throw new Error('Query by lender not implemented');
  }

  /**
   * Get ledger statistics
   * @returns {Object} Statistics about the ledger
   */
  async getStatistics() {
    if (this.implementation.getStatistics) {
      return await this.implementation.getStatistics();
    }
    return {
      total: 0,
      available: 0,
      locked: 0,
      financed: 0,
      closed: 0
    };
  }
}

// Export the service class and states
module.exports = { LedgerService, STATES };
