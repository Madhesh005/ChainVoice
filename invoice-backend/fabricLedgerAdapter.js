/**
 * Fabric Ledger Adapter
 * 
 * This adapter bridges the backend's LedgerService interface to the independent
 * blockchain/fabricService.js module. It ensures there is only ONE Fabric SDK
 * client in the entire system.
 * 
 * This adapter:
 * - Wraps blockchain/fabricService.js
 * - Translates backend method calls to fabricService methods
 * - Maintains a single Gateway connection
 * - Uses the blockchain module's wallet and connection profile
 * 
 * @module fabricLedgerAdapter
 */

const path = require('path');

// Import the SINGLE SOURCE OF TRUTH for Fabric operations
const FabricService = require(path.join(__dirname, '../blockchain/fabricService'));

/**
 * Fabric Ledger Adapter
 * Implements the LedgerService interface by delegating to FabricService
 */
class FabricLedgerAdapter {
  constructor(config = {}) {
    console.log('🔗 Initializing Fabric Ledger Adapter (delegating to blockchain module)');
    
    // Create instance of the independent blockchain service
    this.fabricService = new FabricService();
    
    // Track initialization state
    this.initialized = false;
    
    // Configuration (mostly ignored, blockchain module uses its own config)
    this.channelName = config.channelName || 'mychannel';
    this.chaincodeName = config.chaincodeName || 'invoicecc';
    this.userId = config.userId || 'appUser';
    
    console.log(`   Channel: ${this.channelName}`);
    console.log(`   Chaincode: ${this.chaincodeName}`);
    console.log(`   User: ${this.userId}`);
    console.log(`   Wallet: blockchain/wallet (independent module)`);
    console.log(`   Connection Profile: blockchain/connection-org1.json`);
  }

  /**
   * Initialize the Fabric connection
   * Delegates to fabricService.connect()
   */
  async init() {
    if (this.initialized) {
      console.log('⚠️  Fabric adapter already initialized');
      return;
    }

    try {
      console.log('🔗 Connecting to Hyperledger Fabric via blockchain module...');
      
      // Connect using the blockchain module (single Gateway connection)
      await this.fabricService.connect(this.userId);
      
      this.initialized = true;
      console.log('✅ Fabric Ledger Adapter initialized successfully');
      console.log('   Using blockchain module\'s Gateway, Wallet, and Connection Profile');
      
    } catch (error) {
      console.error('❌ Failed to initialize Fabric Ledger Adapter:', error.message);
      throw new Error(`Fabric initialization failed: ${error.message}`);
    }
  }

  /**
   * Register a new invoice on the blockchain
   * 
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} invoiceNumber - Invoice number
   * @param {string} documentHash - SHA-256 of PDF document
   * @param {string} ipfsCID - IPFS Content Identifier
   * @param {string} bindingHash - Cryptographic binding hash
   * @returns {boolean} true if registered, false if already exists
   */
  async registerInvoice(hash, invoiceNumber, documentHash = null, ipfsCID = null, bindingHash = null) {
    try {
      console.log(`\n📝 FabricLedgerAdapter.registerInvoice() called:`);
      console.log(`   hash (GIID): ${hash ? hash.substring(0, 32) + '...' : 'NULL'}`);
      console.log(`   invoiceNumber: ${invoiceNumber}`);
      console.log(`   documentHash: ${documentHash ? documentHash.substring(0, 32) + '...' : 'NULL'}`);
      console.log(`   ipfsCID: ${ipfsCID || 'NULL'}`);
      console.log(`   bindingHash: ${bindingHash ? bindingHash.substring(0, 32) + '...' : 'NULL'}`);

      // Validate required Layer-3 fields
      if (!documentHash) {
        throw new Error('documentHash is required for Layer-3 integrity');
      }
      if (!bindingHash) {
        throw new Error('bindingHash is required for Layer-3 cryptographic binding');
      }
      if (!ipfsCID) {
        throw new Error('ipfsCID is required for Layer-3 content storage');
      }

      // Delegate to fabricService
      const result = await this.fabricService.registerInvoice(
        hash,
        invoiceNumber,
        documentHash,
        bindingHash,
        ipfsCID
      );

      if (result.success) {
        console.log(`✅ Invoice registered on blockchain: ${hash.substring(0, 32)}...`);
        return true; // Backend expects boolean
      } else {
        // Check if it's a duplicate error
        if (result.error && result.error.includes('already exists')) {
          console.log(`⚠️  Invoice already exists on blockchain: ${hash.substring(0, 32)}...`);
          return false; // Duplicate
        }
        throw new Error(result.message || result.error || 'Registration failed');
      }
      
    } catch (error) {
      console.error(`❌ Failed to register invoice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify invoice on the blockchain
   * 
   * @param {string} hash - Invoice hash (GIID)
   * @returns {Object} Invoice details or { found: false }
   */
  async verifyInvoice(hash) {
    try {
      console.log(`🔍 Verifying invoice: ${hash.substring(0, 32)}...`);
      
      const result = await this.fabricService.verifyInvoice(hash);
      
      if (!result.success) {
        console.log(`❌ Invoice not found: ${hash.substring(0, 32)}...`);
        return { found: false };
      }

      const invoice = result.invoice;
      
      // Transform to backend expected format
      return {
        found: true,
        invoice_hash: invoice.hash,
        invoice_number: invoice.number,
        status: invoice.status,
        locked_by: invoice.lockedBy || null,
        lender_id: invoice.lenderID || null,
        document_hash: invoice.documentHash,
        binding_hash: invoice.bindingHash,
        ipfs_cid: invoice.ipfsCid,
        financed_at: invoice.financedAt || null,
        closed_at: invoice.closedAt || null,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt
      };
      
    } catch (error) {
      console.error(`❌ Failed to verify invoice: ${error.message}`);
      return { found: false, error: error.message };
    }
  }

  /**
   * Lock invoice for a specific lender
   * 
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} lenderId - Lender identifier
   * @returns {Object} { success, invoice?, error? }
   */
  async lockInvoice(hash, lenderId) {
    try {
      console.log(`🔒 Locking invoice: ${hash.substring(0, 32)}... for lender: ${lenderId}`);
      
      const result = await this.fabricService.lockInvoice(hash, lenderId);
      
      if (!result.success) {
        return {
          success: false,
          error: result.message || result.error,
          current_status: result.invoice?.status,
          locked_by: result.invoice?.lockedBy
        };
      }

      const invoice = result.invoice;
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.hash,
          invoice_number: invoice.number,
          status: invoice.status,
          locked_by: invoice.lockedBy,
          lender_id: invoice.lenderID,
          updated_at: invoice.updatedAt
        }
      };
      
    } catch (error) {
      console.error(`❌ Failed to lock invoice: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Finance a locked invoice
   * 
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} lenderId - Lender identifier
   * @returns {Object} { success, invoice?, error? }
   */
  async financeInvoice(hash, lenderId) {
    try {
      console.log(`💰 Financing invoice: ${hash.substring(0, 32)}... by lender: ${lenderId}`);
      
      const result = await this.fabricService.financeInvoice(hash, lenderId);
      
      if (!result.success) {
        return {
          success: false,
          error: result.message || result.error
        };
      }

      const invoice = result.invoice;
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.hash,
          invoice_number: invoice.number,
          status: invoice.status,
          lender_id: invoice.lenderID,
          financed_at: invoice.financedAt,
          updated_at: invoice.updatedAt
        }
      };
      
    } catch (error) {
      console.error(`❌ Failed to finance invoice: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close a financed invoice
   * 
   * @param {string} hash - Invoice hash (GIID)
   * @returns {Object} { success, invoice?, error? }
   */
  async closeInvoice(hash) {
    try {
      console.log(`✅ Closing invoice: ${hash.substring(0, 32)}...`);
      
      const result = await this.fabricService.closeInvoice(hash);
      
      if (!result.success) {
        return {
          success: false,
          error: result.message || result.error
        };
      }

      const invoice = result.invoice;
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.hash,
          invoice_number: invoice.number,
          status: invoice.status,
          closed_at: invoice.closedAt,
          updated_at: invoice.updatedAt
        }
      };
      
    } catch (error) {
      console.error(`❌ Failed to close invoice: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unlock a locked invoice
   * 
   * @param {string} hash - Invoice hash (GIID)
   * @param {string} lenderId - Lender identifier
   * @returns {Object} { success, invoice?, error? }
   */
  async unlockInvoice(hash, lenderId) {
    try {
      console.log(`🔓 Unlocking invoice: ${hash.substring(0, 32)}... for lender: ${lenderId}`);
      
      const result = await this.fabricService.unlockInvoice(hash, lenderId);
      
      if (!result.success) {
        return {
          success: false,
          error: result.message || result.error
        };
      }

      const invoice = result.invoice;
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.hash,
          invoice_number: invoice.number,
          status: invoice.status,
          locked_by: invoice.lockedBy,
          updated_at: invoice.updatedAt
        }
      };
      
    } catch (error) {
      console.error(`❌ Failed to unlock invoice: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get invoice history
   * 
   * @param {string} hash - Invoice hash (GIID)
   * @returns {Array} History entries
   */
  async getInvoiceHistory(hash) {
    try {
      const result = await this.fabricService.getInvoiceHistory(hash);
      
      if (!result.success) {
        return [];
      }

      return result.history || [];
      
    } catch (error) {
      console.error(`❌ Failed to get invoice history: ${error.message}`);
      return [];
    }
  }

  /**
   * Query invoices by status
   * 
   * @param {string} status - Invoice status
   * @returns {Array} List of invoices
   */
  async queryInvoicesByStatus(status) {
    try {
      const result = await this.fabricService.getInvoicesByStatus(status);
      
      if (!result.success) {
        return [];
      }

      return result.invoices || [];
      
    } catch (error) {
      console.error(`❌ Failed to query invoices by status: ${error.message}`);
      return [];
    }
  }

  /**
   * Query invoices by lender
   * 
   * @param {string} lenderId - Lender identifier
   * @returns {Array} List of invoices
   */
  async queryInvoicesByLender(lenderId) {
    try {
      const result = await this.fabricService.getInvoicesByLender(lenderId);
      
      if (!result.success) {
        return [];
      }

      return result.invoices || [];
      
    } catch (error) {
      console.error(`❌ Failed to query invoices by lender: ${error.message}`);
      return [];
    }
  }

  /**
   * Get ledger statistics
   * 
   * @returns {Object} Statistics
   */
  async getStatistics() {
    try {
      const result = await this.fabricService.getStatistics();
      
      if (!result.success) {
        return {
          total: 0,
          available: 0,
          locked: 0,
          financed: 0,
          closed: 0
        };
      }

      return result.statistics;
      
    } catch (error) {
      console.error(`❌ Failed to get statistics: ${error.message}`);
      return {
        total: 0,
        available: 0,
        locked: 0,
        financed: 0,
        closed: 0
      };
    }
  }

  /**
   * Disconnect from Fabric (cleanup)
   */
  async disconnect() {
    if (this.fabricService && this.initialized) {
      console.log('🔌 Disconnecting Fabric Ledger Adapter...');
      this.fabricService.disconnect();
      this.initialized = false;
    }
  }
}

module.exports = FabricLedgerAdapter;
