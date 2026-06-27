/**
 * Fabric Service Module
 * 
 * Reusable service layer for Hyperledger Fabric operations.
 * This module is framework-agnostic and can be used by any application.
 * 
 * @module fabricService
 */

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const config = require('./config');

class FabricService {
  constructor() {
    this.gateway = null;
    this.wallet = null;
    this.network = null;
    this.contract = null;
    this.connected = false;
    this.userName = config.appUser;
  }

  /**
   * Reads the connection profile
   * @private
   * @returns {Object} Connection profile JSON
   */
  _readConnectionProfile() {
    const ccpPath = config.connectionProfilePath;
    
    if (!fs.existsSync(ccpPath)) {
      throw new Error(`Connection profile not found at: ${ccpPath}`);
    }
    
    return JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
  }

  /**
   * Connects to the Fabric network
   * @param {string} username - Optional username (defaults to config.appUser)
   * @returns {Promise<void>}
   */
  async connect(username = null) {
    try {
      if (this.connected) {
        console.log('⚠️  Already connected to Fabric network');
        return;
      }

      this.userName = username || config.appUser;

      // Load wallet
      this.wallet = await Wallets.newFileSystemWallet(config.walletPath);
      const identity = await this.wallet.get(this.userName);
      
      if (!identity) {
        throw new Error(
          `Identity '${this.userName}' not found. ` +
          'Please run registerUser.js first.'
        );
      }

      // Load connection profile
      const ccp = this._readConnectionProfile();

      // Connect gateway
      this.gateway = new Gateway();
      await this.gateway.connect(ccp, {
        wallet: this.wallet,
        identity: this.userName,
        discovery: {
          enabled: true,
          asLocalhost: true
        },
        eventHandlerOptions: {
          commitTimeout: config.transactionTimeout,
          endorseTimeout: config.connectionTimeout,
        }
      });

      // Get network and contract
      this.network = await this.gateway.getNetwork(config.channelName);
      this.contract = this.network.getContract(config.chaincodeName);
      
      this.connected = true;
      
      if (config.debug) {
        console.log(`✅ Connected to Fabric as '${this.userName}'`);
      }
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Fabric: ${error.message}`);
    }
  }

  /**
   * Disconnects from the Fabric network
   */
  disconnect() {
    if (this.gateway) {
      this.gateway.disconnect();
      this.gateway = null;
      this.network = null;
      this.contract = null;
      this.connected = false;
      
      if (config.debug) {
        console.log('✅ Disconnected from Fabric');
      }
    }
  }

  /**
   * Ensures connection before executing operations
   * @private
   */
  _ensureConnected() {
    if (!this.connected || !this.contract) {
      throw new Error('Not connected to Fabric. Call connect() first.');
    }
  }

  /**
   * Registers a new invoice on the blockchain
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} number - Invoice number
   * @param {string} documentHash - SHA-256 hash of invoice PDF
   * @param {string} bindingHash - Cryptographic binding hash
   * @param {string} ipfsCID - IPFS content identifier
   * @returns {Promise<Object>} Transaction result
   */
  async registerInvoice(hash, number, documentHash, bindingHash, ipfsCID) {
    this._ensureConnected();

    try {
      await this.contract.submitTransaction(
        'RegisterInvoice',
        hash,
        number,
        documentHash,
        bindingHash,
        ipfsCID
      );

      return {
        success: true,
        message: 'Invoice registered successfully',
        giid: hash,
        number: number,
        status: 'AVAILABLE'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to register invoice'
      };
    }
  }

  /**
   * Verifies/queries an invoice from the blockchain
   * @param {string} hash - Invoice hash (GIID)
   * @returns {Promise<Object>} Invoice data or error
   */
  async verifyInvoice(hash) {
    this._ensureConnected();

    try {
      const result = await this.contract.evaluateTransaction('QueryInvoice', hash);
      const invoice = JSON.parse(result.toString());

      return {
        success: true,
        invoice: invoice,
        blockchain_status: invoice.status
      };
    } catch (error) {
      if (error.message.includes('does not exist')) {
        return {
          success: false,
          error: 'INVOICE_NOT_FOUND',
          message: `Invoice with hash ${hash} not found on blockchain`
        };
      }

      return {
        success: false,
        error: error.message,
        message: 'Failed to verify invoice'
      };
    }
  }

  /**
   * Locks an invoice for a specific lender
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} lenderID - Lender identifier
   * @returns {Promise<Object>} Transaction result
   */
  async lockInvoice(hash, lenderID) {
    this._ensureConnected();

    try {
      await this.contract.submitTransaction('LockInvoice', hash, lenderID);

      // Query updated state
      const result = await this.contract.evaluateTransaction('QueryInvoice', hash);
      const invoice = JSON.parse(result.toString());

      return {
        success: true,
        message: 'Invoice locked successfully',
        invoice: invoice
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to lock invoice'
      };
    }
  }

  /**
   * Finances a locked invoice
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} lenderID - Lender identifier
   * @returns {Promise<Object>} Transaction result
   */
  async financeInvoice(hash, lenderID) {
    this._ensureConnected();

    try {
      await this.contract.submitTransaction('FinanceInvoice', hash, lenderID);

      // Query updated state
      const result = await this.contract.evaluateTransaction('QueryInvoice', hash);
      const invoice = JSON.parse(result.toString());

      return {
        success: true,
        message: 'Invoice financed successfully',
        invoice: invoice
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to finance invoice'
      };
    }
  }

  /**
   * Unlocks a locked invoice
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} lenderID - Lender identifier
   * @returns {Promise<Object>} Transaction result
   */
  async unlockInvoice(hash, lenderID) {
    this._ensureConnected();

    try {
      await this.contract.submitTransaction('UnlockInvoice', hash, lenderID);

      // Query updated state
      const result = await this.contract.evaluateTransaction('QueryInvoice', hash);
      const invoice = JSON.parse(result.toString());

      return {
        success: true,
        message: 'Invoice unlocked successfully',
        invoice: invoice
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to unlock invoice'
      };
    }
  }

  /**
   * Closes a financed invoice
   * @param {string} hash - Invoice hash (GIID)
   * @returns {Promise<Object>} Transaction result
   */
  async closeInvoice(hash) {
    this._ensureConnected();

    try {
      await this.contract.submitTransaction('CloseInvoice', hash);

      // Query updated state
      const result = await this.contract.evaluateTransaction('QueryInvoice', hash);
      const invoice = JSON.parse(result.toString());

      return {
        success: true,
        message: 'Invoice closed successfully',
        invoice: invoice
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to close invoice'
      };
    }
  }

  /**
   * Gets all invoices from the blockchain
   * @returns {Promise<Object>} Array of invoices or error
   */
  async getAllInvoices() {
    this._ensureConnected();

    try {
      const result = await this.contract.evaluateTransaction('GetAllInvoices');
      const invoices = JSON.parse(result.toString());

      return {
        success: true,
        invoices: invoices,
        count: invoices.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get invoices'
      };
    }
  }

  /**
   * Gets invoices by status
   * @param {string} status - Invoice status (AVAILABLE, LOCKED, FINANCED, CLOSED)
   * @returns {Promise<Object>} Array of invoices or error
   */
  async getInvoicesByStatus(status) {
    this._ensureConnected();

    try {
      const result = await this.contract.evaluateTransaction('QueryInvoicesByStatus', status);
      const invoices = JSON.parse(result.toString());

      return {
        success: true,
        invoices: invoices,
        count: invoices.length,
        status: status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to query invoices by status'
      };
    }
  }

  /**
   * Gets invoices for a specific lender
   * @param {string} lenderID - Lender identifier
   * @returns {Promise<Object>} Array of invoices or error
   */
  async getInvoicesByLender(lenderID) {
    this._ensureConnected();

    try {
      const result = await this.contract.evaluateTransaction('QueryInvoicesByLender', lenderID);
      const invoices = JSON.parse(result.toString());

      return {
        success: true,
        invoices: invoices,
        count: invoices.length,
        lenderId: lenderID
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to query invoices by lender'
      };
    }
  }

  /**
   * Gets invoice history
   * @param {string} hash - Invoice hash (GIID)
   * @returns {Promise<Object>} Invoice history or error
   */
  async getInvoiceHistory(hash) {
    this._ensureConnected();

    try {
      const result = await this.contract.evaluateTransaction('GetInvoiceHistory', hash);
      const history = JSON.parse(result.toString());

      return {
        success: true,
        history: history,
        count: history.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get invoice history'
      };
    }
  }

  /**
   * Gets blockchain statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    this._ensureConnected();

    try {
      const allResult = await this.contract.evaluateTransaction('GetAllInvoices');
      const allInvoices = JSON.parse(allResult.toString());

      const stats = {
        total: allInvoices.length,
        available: allInvoices.filter(i => i.status === 'AVAILABLE').length,
        locked: allInvoices.filter(i => i.status === 'LOCKED').length,
        financed: allInvoices.filter(i => i.status === 'FINANCED').length,
        closed: allInvoices.filter(i => i.status === 'CLOSED').length,
      };

      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get statistics'
      };
    }
  }

  /**
   * Checks if an invoice exists
   * @param {string} hash - Invoice hash (GIID)
   * @returns {Promise<boolean>} True if exists
   */
  async invoiceExists(hash) {
    this._ensureConnected();

    try {
      const result = await this.contract.evaluateTransaction('InvoiceExists', hash);
      return result.toString() === 'true';
    } catch (error) {
      return false;
    }
  }
}

module.exports = FabricService;
