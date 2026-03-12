/**
 * Hyperledger Fabric Ledger Implementation
 * 
 * Implements the ledger interface using Hyperledger Fabric with Go chaincode.
 * Connects to Fabric network and submits transactions to the chaincode.
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class FabricLedger {
  constructor(config = {}) {
    this.channelName = config.channelName || 'mychannel';
    this.chaincodeName = config.chaincodeName || 'invoicecc';
    this.walletPath = config.walletPath || path.join(__dirname, 'wallet');
    this.connectionProfilePath = config.connectionProfile || path.join(__dirname, 'connection-org1-fixed.json');
    this.userId = config.userId || 'appUser';
    this.orgMSP = config.orgMSP || 'Org1MSP';
    
    this.gateway = null;
    this.contract = null;
    this.network = null;
  }

  /**
   * Initialize connection to Fabric network
   */
  async init() {
    try {
      console.log('Connecting to Hyperledger Fabric network...');

      // Load connection profile
      const ccpPath = path.resolve(this.connectionProfilePath);
      if (!fs.existsSync(ccpPath)) {
        throw new Error(`Connection profile not found at ${ccpPath}`);
      }
      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

      // Create wallet
      const wallet = await Wallets.newFileSystemWallet(this.walletPath);

      // Check if user exists in wallet
      const identity = await wallet.get(this.userId);
      if (!identity) {
        throw new Error(`Identity ${this.userId} not found in wallet. Please enroll user first.`);
      }

      // Connect to gateway
      this.gateway = new Gateway();
      await this.gateway.connect(ccp, {
        wallet,
        identity: this.userId,
        discovery: { enabled: true, asLocalhost: true }  // Enable discovery for proper peer selection
      });

      // Get network and contract
      this.network = await this.gateway.getNetwork(this.channelName);
      this.contract = this.network.getContract(this.chaincodeName);

      console.log(`✓ Connected to Fabric network (${this.channelName}/${this.chaincodeName})`);
    } catch (error) {
      console.error('Failed to connect to Fabric network:', error.message);
      throw error;
    }
  }

  /**
   * Register a new invoice with Layer-3 cryptographic binding
   * @param {string} hash - GIID (Global Invoice ID)
   * @param {string} invoiceNumber - Human-readable invoice number
   * @param {string} documentHash - SHA-256 hash of PDF document
   * @param {string} ipfsCID - IPFS Content Identifier
   * @param {string} bindingHash - Cryptographic binding SHA256(GIID + documentHash)
   */
  async registerInvoice(hash, invoiceNumber, documentHash = null, ipfsCID = null, bindingHash = null) {
    try {
      console.log(`\n📝 FabricLedger.registerInvoice() called:`);
      console.log(`   hash: ${hash ? hash.substring(0, 32) + '...' : 'NULL'}`);
      console.log(`   invoiceNumber: ${invoiceNumber}`);
      console.log(`   documentHash: ${documentHash ? documentHash.substring(0, 32) + '...' : 'NULL'}`);
      console.log(`   ipfsCID: ${ipfsCID || 'NULL'}`);
      console.log(`   bindingHash: ${bindingHash ? bindingHash.substring(0, 32) + '...' : 'NULL'}`);

      // Fabric chaincode requires all Layer-3 parameters
      if (!documentHash || !ipfsCID || !bindingHash) {
        throw new Error('Layer-3 parameters (documentHash, ipfsCID, bindingHash) are required for Fabric registration');
      }

      await this.contract.submitTransaction(
        'RegisterInvoice', 
        hash, 
        invoiceNumber, 
        documentHash, 
        bindingHash, 
        ipfsCID
      );
      
      console.log(`   ➜ Fabric transaction submitted successfully`);
      return true;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`   ➜ Invoice already exists in Fabric (duplicate)`);
        return false; // Duplicate
      }
      console.error('   ❌ Error registering invoice in Fabric:', error.message);
      throw error;
    }
  }

  /**
   * Verify invoice status with Layer-3 data
   */
  async verifyInvoice(hash) {
    try {
      const result = await this.contract.evaluateTransaction('QueryInvoice', hash);
      const invoice = JSON.parse(result.toString());
      
      return {
        found: true,
        invoice_hash: invoice.hash,
        invoice_number: invoice.number,
        document_hash: invoice.documentHash || null,
        binding_hash: invoice.bindingHash || null,
        ipfs_cid: invoice.ipfsCid || null,
        status: invoice.status,
        locked_by: invoice.lockedBy || null,
        lender_id: invoice.lenderId || null,
        financed_at: invoice.financedAt || null,
        closed_at: invoice.closedAt || null,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt
      };
    } catch (error) {
      // Handle both old SDK error format and expected chaincode errors
      if (error.message.includes('does not exist') || 
          error.message.includes('Query failed. Errors: []')) {
        return { found: false };
      }
      console.error('Error verifying invoice:', error.message);
      throw error;
    }
  }

  /**
   * Lock invoice (atomic operation via Fabric consensus)
   */
  async lockInvoice(hash, lenderId) {
    try {
      await this.contract.submitTransaction('LockInvoice', hash, lenderId);
      
      // Get updated invoice
      const invoice = await this.verifyInvoice(hash);
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.invoice_hash,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          locked_by: invoice.locked_by,
          updated_at: invoice.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        current_status: error.message.includes('is ') ? error.message.split('is ')[1].split(',')[0] : undefined
      };
    }
  }

  /**
   * Finance invoice
   */
  async financeInvoice(hash, lenderId) {
    try {
      await this.contract.submitTransaction('FinanceInvoice', hash, lenderId);
      
      // Get updated invoice
      const invoice = await this.verifyInvoice(hash);
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.invoice_hash,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          lender_id: invoice.lender_id,
          financed_at: invoice.financed_at,
          updated_at: invoice.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close invoice
   */
  async closeInvoice(hash) {
    try {
      await this.contract.submitTransaction('CloseInvoice', hash);
      
      // Get updated invoice
      const invoice = await this.verifyInvoice(hash);
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.invoice_hash,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          closed_at: invoice.closed_at,
          updated_at: invoice.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unlock invoice
   */
  async unlockInvoice(hash, lenderId) {
    try {
      await this.contract.submitTransaction('UnlockInvoice', hash, lenderId);
      
      // Get updated invoice
      const invoice = await this.verifyInvoice(hash);
      
      return {
        success: true,
        invoice: {
          invoice_hash: invoice.invoice_hash,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          locked_by: invoice.locked_by,
          updated_at: invoice.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query invoices by status
   */
  async queryInvoicesByStatus(status) {
    try {
      const result = await this.contract.evaluateTransaction('QueryInvoicesByStatus', status);
      const invoices = JSON.parse(result.toString());
      
      return invoices.map(inv => ({
        invoice_hash: inv.hash,
        invoice_number: inv.number,
        status: inv.status,
        locked_by: inv.lockedBy || null,
        lender_id: inv.lenderId || null,
        financed_at: inv.financedAt || null,
        closed_at: inv.closedAt || null,
        created_at: inv.createdAt
      }));
    } catch (error) {
      console.error('Error querying by status:', error.message);
      return [];
    }
  }

  /**
   * Query invoices by lender
   */
  async queryInvoicesByLender(lenderId) {
    try {
      const result = await this.contract.evaluateTransaction('QueryInvoicesByLender', lenderId);
      const invoices = JSON.parse(result.toString());
      
      return invoices.map(inv => ({
        invoice_hash: inv.hash,
        invoice_number: inv.number,
        status: inv.status,
        locked_by: inv.lockedBy || null,
        lender_id: inv.lenderId || null,
        financed_at: inv.financedAt || null,
        closed_at: inv.closedAt || null,
        created_at: inv.createdAt
      }));
    } catch (error) {
      console.error('Error querying by lender:', error.message);
      return [];
    }
  }

  /**
   * Get ledger statistics
   */
  async getStatistics() {
    try {
      const result = await this.contract.evaluateTransaction('GetAllInvoices');
      const invoices = JSON.parse(result.toString());
      
      const stats = {
        total: invoices.length,
        available: invoices.filter(i => i.status === 'AVAILABLE').length,
        locked: invoices.filter(i => i.status === 'LOCKED').length,
        financed: invoices.filter(i => i.status === 'FINANCED').length,
        closed: invoices.filter(i => i.status === 'CLOSED').length
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error.message);
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
   * Get invoice history (Fabric's built-in history tracking)
   */
  async getInvoiceHistory(hash) {
    try {
      const result = await this.contract.evaluateTransaction('GetInvoiceHistory', hash);
      const history = JSON.parse(result.toString());
      
      return history.map(record => ({
        txId: record.txId,
        timestamp: record.timestamp,
        isDelete: record.isDelete,
        value: record.value,
        status: record.value ? record.value.status : null,
        action: this._determineAction(record)
      }));
    } catch (error) {
      console.error('Error getting history:', error.message);
      return [];
    }
  }

  /**
   * Determine action from history record
   */
  _determineAction(record) {
    if (record.isDelete) return 'DELETED';
    if (!record.value) return 'UNKNOWN';
    
    const status = record.value.status;
    if (status === 'AVAILABLE' && !record.value.lockedBy) return 'REGISTERED';
    if (status === 'LOCKED') return 'LOCKED';
    if (status === 'FINANCED') return 'FINANCED';
    if (status === 'CLOSED') return 'CLOSED';
    if (status === 'AVAILABLE' && record.value.updatedAt !== record.value.createdAt) return 'UNLOCKED';
    
    return 'UPDATED';
  }

  /**
   * Disconnect from Fabric network
   */
  async disconnect() {
    if (this.gateway) {
      await this.gateway.disconnect();
      console.log('Disconnected from Fabric network');
    }
  }

  /**
   * Listen to chaincode events
   */
  async listenToEvents(callback) {
    try {
      const listener = async (event) => {
        if (event.eventName) {
          const payload = JSON.parse(event.payload.toString());
          callback(event.eventName, payload);
        }
      };

      await this.contract.addContractListener(listener);
      console.log('✓ Listening to chaincode events');
    } catch (error) {
      console.error('Error setting up event listener:', error.message);
    }
  }
}

module.exports = FabricLedger;
