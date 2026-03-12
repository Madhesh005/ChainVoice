/**
 * ERP Controller
 * Handles HTTP requests for ERP integration
 */

const ERPFactory = require('../erp/erpFactory');
const ERPConnectionModel = require('../models/erpConnection.model');
const InvoiceModel = require('../models/invoice.model');
const ERPSyncService = require('../services/erpSyncService');
const EncryptionUtil = require('../utils/encryption');

class ERPController {
  /**
   * Connect to ERP system
   * POST /api/erp/connect
   */
  static async connect(req, res) {
    try {
      const { erpType, baseUrl, database, username, password } = req.body;

      // Validate required fields
      if (!erpType || !baseUrl || !database || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: erpType, baseUrl, database, username, password',
        });
      }

      // Get MSME ID from authenticated user
      const msme_id = req.user.id;

      console.log(`\n🔌 Connecting to ${erpType} ERP for MSME: ${msme_id}`);

      // Validate configuration
      ERPFactory.validateConfig(erpType, { baseUrl, database, username, password });

      // Create provider and test connection
      const provider = ERPFactory.createProvider(erpType, {
        baseUrl,
        database,
        username,
        password,
      });

      const testResult = await provider.testConnection();
      if (!testResult.success) {
        return res.status(401).json({
          success: false,
          error: 'ERP authentication failed',
          details: testResult.message,
        });
      }

      console.log(`   ✓ Authentication successful (UID: ${testResult.uid})`);

      // Encrypt password
      const encryptedPassword = EncryptionUtil.encrypt(password);

      // Save connection to database
      const connection = await ERPConnectionModel.create({
        msme_id,
        erp_type: erpType,
        base_url: baseUrl,
        database,
        username,
        encrypted_password: encryptedPassword,
      });

      console.log(`   ✓ Connection saved (ID: ${connection.id})`);

      // Trigger initial sync in background
      console.log(`   🔄 Triggering initial invoice sync...`);
      ERPSyncService.syncInvoices(msme_id, erpType)
        .then((result) => {
          console.log(`   ✅ Initial sync completed: ${result.results[0]?.invoices_synced} invoices`);
        })
        .catch((error) => {
          console.error(`   ❌ Initial sync failed:`, error.message);
        });

      // Return success response (don't wait for sync)
      res.json({
        success: true,
        message: 'ERP connection established successfully',
        connection: {
          id: connection.id,
          erp_type: connection.erp_type,
          base_url: connection.base_url,
          database: connection.database,
          username: connection.username,
          created_at: connection.created_at,
        },
        sync_status: 'Initial sync started in background',
      });
    } catch (error) {
      console.error('❌ ERP connection failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to connect to ERP',
        details: error.message,
      });
    }
  }

  /**
   * Get ERP connections for MSME
   * GET /api/erp/connections
   */
  static async getConnections(req, res) {
    try {
      // Get MSME ID from authenticated user
      const msmeId = req.user.id;

      const connections = await ERPConnectionModel.findByMSME(msmeId);

      // Remove sensitive data
      const sanitizedConnections = connections.map((conn) => ({
        id: conn.id,
        erp_type: conn.erp_type,
        base_url: conn.base_url,
        database: conn.database,
        username: conn.username,
        is_active: conn.is_active,
        created_at: conn.created_at,
        last_sync_at: conn.last_sync_at,
        sync_status: conn.sync_status,
        last_error: conn.last_error,
      }));

      res.json({
        success: true,
        connections: sanitizedConnections,
      });
    } catch (error) {
      console.error('Error fetching ERP connections:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ERP connections',
        details: error.message,
      });
    }
  }

  /**
   * Sync invoices from ERP
   * POST /api/erp/sync
   */
  static async syncInvoices(req, res) {
    try {
      const { erpType } = req.body;
      // Get MSME ID from authenticated user
      const msme_id = req.user.id;

      console.log(`\n🔄 Manual sync requested for MSME: ${msme_id}`);

      const result = await ERPSyncService.syncInvoices(msme_id, erpType);

      res.json({
        success: true,
        message: 'Invoice sync completed',
        ...result,
      });
    } catch (error) {
      console.error('❌ Sync failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync invoices',
        details: error.message,
      });
    }
  }

  /**
   * Get invoices from PostgreSQL
   * GET /api/erp/invoices
   */
  static async getInvoices(req, res) {
    try {
      // Get MSME ID from authenticated user
      const msmeId = req.user.id;
      const { status, from_date, to_date, erp_type, limit } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      if (erp_type) filters.erp_type = erp_type;
      if (limit) filters.limit = parseInt(limit);

      const invoices = await InvoiceModel.findByMSME(msmeId, filters);

      // Remove raw_data from response to reduce payload size
      const sanitizedInvoices = invoices.map((inv) => {
        const { raw_data, ...rest } = inv;
        return rest;
      });

      res.json({
        success: true,
        count: sanitizedInvoices.length,
        invoices: sanitizedInvoices,
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoices',
        details: error.message,
      });
    }
  }

  /**
   * Get single invoice by ID
   * GET /api/erp/invoices/:id
   */
  static async getInvoiceById(req, res) {
    try {
      const { id } = req.params; // This is the ERP invoice ID, not the database ID
      const msmeId = req.user.id;

      // Use findByErpInvoiceId instead of findById
      const invoice = await InvoiceModel.findByErpInvoiceId(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      // Verify ownership - convert both to strings for comparison to handle UUID vs string mismatch
      if (invoice.msme_id.toString() !== msmeId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You do not have permission to access this invoice',
        });
      }

      res.json({
        success: true,
        data: {
          invoice,
        },
      });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoice',
        details: error.message,
      });
    }
  }

  /**
   * Get invoice details with blockchain status (resilient to blockchain failures)
   * GET /api/erp/invoices/:id/details
   */
  static async getInvoiceDetails(req, res) {
    try {
      const { id } = req.params; // This is the database ID
      const msmeId = req.user.id;

      console.log('🔍 getInvoiceDetails called with database ID:', { id, msmeId });

      // Fetch invoice from database first (primary source of truth)
      const invoice = await InvoiceModel.findById(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      // Verify ownership
      if (invoice.msme_id.toString() !== msmeId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You do not have permission to access this invoice',
        });
      }

      // Prepare response with database data
      const response = {
        success: true,
        data: {
          invoice,
          blockchain: {
            status: 'NOT_REGISTERED',
            verified: false,
            error: null
          }
        }
      };

      // Try to fetch blockchain data if GIID exists (optional, non-blocking)
      if (invoice.giid) {
        try {
          console.log('🔗 Attempting blockchain lookup for GIID:', invoice.giid);
          
          // Import ledger service
          const { ledgerService } = require('../services');
          
          // Try to verify invoice on blockchain
          const blockchainInvoice = await ledgerService.verifyInvoice(invoice.giid);
          
          if (blockchainInvoice && blockchainInvoice.found) {
            response.data.blockchain = {
              status: blockchainInvoice.status || 'AVAILABLE',
              verified: true,
              locked_by: blockchainInvoice.locked_by,
              lender_id: blockchainInvoice.lender_id,
              financed_at: blockchainInvoice.financed_at,
              closed_at: blockchainInvoice.closed_at,
              created_at: blockchainInvoice.created_at,
              updated_at: blockchainInvoice.updated_at,
              error: null
            };
            console.log('✅ Blockchain lookup successful:', response.data.blockchain.status);
          } else {
            response.data.blockchain = {
              status: 'NOT_FOUND_ON_BLOCKCHAIN',
              verified: false,
              error: 'Invoice not found on blockchain (may need re-registration)'
            };
            console.log('⚠️ Invoice not found on blockchain');
          }
        } catch (blockchainError) {
          console.warn('⚠️ Blockchain lookup failed (non-critical):', blockchainError.message);
          response.data.blockchain = {
            status: 'BLOCKCHAIN_ERROR',
            verified: false,
            error: blockchainError.message
          };
        }
      }

      res.json(response);
    } catch (error) {
      console.error('❌ Error fetching invoice details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoice details',
        details: error.message,
      });
    }
  }

  /**
   * Get invoice statistics
   * GET /api/erp/statistics
   */
  static async getStatistics(req, res) {
    try {
      // Get MSME ID from authenticated user
      const msmeId = req.user.id;

      const stats = await InvoiceModel.getStatistics(msmeId);

      res.json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        details: error.message,
      });
    }
  }

  /**
   * Get sync status
   * GET /api/erp/sync-status
   */
  static async getSyncStatus(req, res) {
    try {
      // Get MSME ID from authenticated user
      const msmeId = req.user.id;

      const status = await ERPSyncService.getSyncStatus(msmeId);

      res.json({
        success: true,
        sync_status: status,
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sync status',
        details: error.message,
      });
    }
  }

  /**
   * Download invoice PDF
   * GET /api/erp/invoices/:id/pdf
   */
  static async downloadInvoicePDF(req, res) {
    try {
      const { id } = req.params;
      const msmeId = req.user.id;

      // Get invoice details
      const invoice = await InvoiceModel.findById(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      // Verify ownership
      if (invoice.msme_id !== msmeId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You do not have permission to access this invoice',
        });
      }

      // Get ERP connection
      const erpConnection = await ERPConnectionModel.findByMSME(msmeId);
      if (!erpConnection) {
        return res.status(404).json({
          success: false,
          error: 'ERP connection not found',
        });
      }

      // Decrypt credentials
      const decryptedPassword = EncryptionUtil.decrypt(erpConnection.password);

      // Create ERP provider
      const provider = ERPFactory.createProvider(erpConnection.erp_type, {
        baseUrl: erpConnection.base_url,
        database: erpConnection.database,
        username: erpConnection.username,
        password: decryptedPassword,
      });

      // Download PDF from ERP
      const erpInvoiceId = invoice.erp_invoice_id || invoice.id;
      const pdfBuffer = await provider.downloadInvoicePDF(erpInvoiceId);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.invoice_number}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error downloading invoice PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download invoice PDF',
        details: error.message,
      });
    }
  }

  /**
   * Get supported ERP types
   * GET /api/erp/supported
   */
  static async getSupportedERPs(req, res) {
    try {
      const erps = ERPFactory.getSupportedERPs();

      res.json({
        success: true,
        erps,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supported ERPs',
      });
    }
  }

  /**
   * Disconnect ERP
   * DELETE /api/erp/connections/:id
   */
  static async disconnect(req, res) {
    try {
      const { id } = req.params;

      const connection = await ERPConnectionModel.deactivate(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found',
        });
      }

      res.json({
        success: true,
        message: 'ERP connection deactivated',
      });
    } catch (error) {
      console.error('Error disconnecting ERP:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect ERP',
        details: error.message,
      });
    }
  }
}

module.exports = ERPController;
