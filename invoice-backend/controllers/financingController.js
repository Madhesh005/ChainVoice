/**
 * Financing Controller
 * Handles financing requests and lender mapping
 */

const InvoiceModel = require('../models/invoice.model');
const FinancingRequestModel = require('../models/financingRequest.model');
const ActivityModel = require('../models/activity.model');
const NotificationController = require('./notificationController');
const { mapEmailToLenderIdentifier, getLenderName } = require('../utils/lenderMapping');
const { ledgerService } = require('../services');
const db = require('../db');

class FinancingController {
  /**
   * Request financing for an invoice
   * POST /api/financing/request
   * Body: { invoice_id: string (UUID), lender_id: string (UUID) }
   * OR: { giid: string, lender_id: string (UUID) }
   */
  static async requestFinancing(req, res) {
    try {
      const { invoice_id, giid, lender_id } = req.body;
      const msme_id = req.user.id;

      console.log(`\n🔍 Request Financing Debug:`);
      console.log(`   MSME ID: ${msme_id}`);
      console.log(`   Invoice ID: ${invoice_id}`);
      console.log(`   GIID: ${giid}`);
      console.log(`   Lender ID: ${lender_id}`);

      // Validate required fields
      if ((!invoice_id && !giid) || !lender_id) {
        return res.status(400).json({
          success: false,
          message: "invoice_id (or giid) and lender_id are required"
        });
      }

      // Step 1 — Validate invoice (try by invoice_id first, then by GIID)
      let invoice = null;
      if (invoice_id) {
        invoice = await InvoiceModel.findById(invoice_id);
      } else if (giid) {
        invoice = await InvoiceModel.findByGIID(giid);
      }

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      console.log(`   Found Invoice:`);
      console.log(`     ID: ${invoice.id}`);
      console.log(`     Number: ${invoice.invoice_number}`);
      console.log(`     MSME ID: ${invoice.msme_id}`);
      console.log(`     GIID: ${invoice.giid || 'null'}`);

      // Step 2 — Verify MSME ownership (convert both to strings for comparison)
      const invoiceMsmeId = invoice.msme_id ? invoice.msme_id.toString() : null;
      const requestMsmeId = msme_id ? msme_id.toString() : null;
      
      if (invoiceMsmeId !== requestMsmeId) {
        console.log(`   ❌ Ownership mismatch:`);
        console.log(`      Invoice MSME ID: ${invoiceMsmeId}`);
        console.log(`      Request MSME ID: ${requestMsmeId}`);
        
        return res.status(403).json({
          success: false,
          message: "Invoice does not belong to this MSME"
        });
      }

      console.log(`   ✅ Ownership verified`);

      // Use the GIID from the invoice if not provided in request
      const finalGIID = giid || invoice.giid;

      // Check if invoice is registered on blockchain
      if (!finalGIID) {
        return res.status(400).json({
          success: false,
          message: 'Invoice must be registered on blockchain before requesting financing',
        });
      }

      console.log(`   Final GIID: ${finalGIID}`);

      // Get lender details
      const lenderResult = await db.query(`
        SELECT id, lender_name, lender_type, email
        FROM lender_users
        WHERE id = $1
      `, [lender_id]);

      if (lenderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Lender not found',
        });
      }

      const lender = lenderResult.rows[0];
      console.log(`   Lender: ${lender.lender_name} (${lender_id})`);

      // Check if request already exists for this invoice-lender pair
      const existingRequest = await db.query(`
        SELECT id FROM financing_requests
        WHERE invoice_giid = $1 AND lender_id = $2
      `, [finalGIID, lender_id]);

      if (existingRequest.rows.length > 0) {
        console.log(`   ⚠️  Financing request already exists`);
        return res.status(400).json({
          success: false,
          message: `Financing request already exists for this invoice and ${lender.lender_name}`,
        });
      }

      // Step 3 — Create financing request in financing_requests table
      console.log(`   Creating financing request...`);
      await db.query(`
        INSERT INTO financing_requests(invoice_giid, invoice_id, lender_id, msme_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'PENDING', NOW(), NOW())
      `, [finalGIID, invoice.id, lender_id, msme_id]);

      console.log(`✅ Financing request created for invoice ${invoice.invoice_number}`);
      console.log(`   GIID: ${finalGIID}`);
      console.log(`   Lender: ${lender.lender_name} (${lender_id})`);
      console.log(`   Status: PENDING`);

      // Log activity
      try {
        await ActivityModel.logActivity({
          msme_id: msme_id,
          activity_type: 'financing_requested',
          activity_title: 'Financing Request Sent',
          activity_description: `Financing request sent to ${lender.lender_name} for invoice ${invoice.invoice_number}`,
          related_invoice_id: invoice.id,
          related_invoice_number: invoice.invoice_number,
          metadata: {
            lender_id: lender_id,
            lender_name: lender.lender_name,
            amount: invoice.total_amount || invoice.amount,
            currency: invoice.currency || 'INR',
          },
        });
      } catch (activityError) {
        console.warn('⚠️  Warning: Failed to log activity:', activityError.message);
      }

      res.json({
        success: true,
        message: `Financing request sent to ${lender.lender_name} successfully!`,
        data: {
          lender_name: lender.lender_name,
          invoice_number: invoice.invoice_number,
          amount: invoice.total_amount || invoice.amount
        }
      });
    } catch (error) {
      console.error('Error requesting financing:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to request financing',
      });
    }
  }

  /**
   * Get available lenders
   * GET /api/financing/lenders
   */
  static async getAvailableLenders(req, res) {
    try {
      // Query actual lenders from database with UUIDs
      const result = await db.query(`
        SELECT id, lender_name, lender_type
        FROM lender_users
        WHERE is_active = true AND is_verified = true
        ORDER BY lender_name
      `);

      // Map to frontend format
      const lenders = result.rows.map(row => ({
        id: row.id, // UUID from database
        name: row.lender_name,
        type: row.lender_type
      }));

      console.log(`✅ Found ${lenders.length} active lenders`);

      res.json({
        success: true,
        data: {
          lenders,
        },
      });
    } catch (error) {
      console.error('Error fetching lenders:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch available lenders',
      });
    }
  }

  /**
   * Get invoices accessible to a lender
   * GET /api/financing/lender/invoices
   */
  static async getLenderInvoices(req, res) {
    try {
      // Use the authenticated lender's UUID directly
      const lenderId = req.user.id; // UUID from authentication
      const lenderEmail = req.user.email;

      console.log(`🔍 Fetching invoices for lender UUID: ${lenderId} (${lenderEmail})`);

      // Get lender details
      const lenderResult = await db.query(`
        SELECT lender_name, lender_type
        FROM lender_users
        WHERE id = $1
      `, [lenderId]);

      if (lenderResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_FOUND',
          message: 'Lender not found in database',
        });
      }

      const lender = lenderResult.rows[0];

      // Query financing requests for this specific lender using UUID
      const result = await db.query(`
        SELECT 
          fr.id as request_id,
          fr.status as request_status,
          fr.created_at as request_date,
          fr.lender_id,
          i.id as invoice_id,
          i.invoice_number,
          i.buyer_name,
          i.seller_gstin,
          i.amount,
          i.giid,
          i.ipfs_hash,
          i.document_hash,
          i.blockchain_status,
          m.company_name as msme_company_name
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        JOIN msme_users m ON fr.msme_id = m.id
        WHERE fr.lender_id = $1
        ORDER BY fr.created_at DESC
      `, [lenderId]);

      console.log(`✅ Found ${result.rows.length} financing requests for ${lender.lender_name}`);

      res.json({
        success: true,
        count: result.rows.length,
        lender_id: lenderId,
        lender_name: lender.lender_name,
        lender_type: lender.lender_type,
        invoices: result.rows,
      });
    } catch (error) {
      console.error('Error fetching lender invoices:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch invoices',
        details: error.message,
      });
    }
  }

  /**
   * Get invoice details by GIID for lender verification
   * GET /api/lender/invoice/:giid
   */
  static async getInvoiceByGIID(req, res) {
    try {
      const { giid } = req.params;
      
      // Use the authenticated lender's UUID directly
      const lenderId = req.user.id;
      
      console.log(`🔍 Fetching invoice details for GIID: ${giid} by lender UUID: ${lenderId}`);

      // Check if this lender has access to this invoice
      const accessCheck = await db.query(`
        SELECT fr.id
        FROM financing_requests fr
        WHERE fr.invoice_giid = $1 AND fr.lender_id = $2
      `, [giid, lenderId]);

      if (accessCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'INVOICE_NOT_ACCESSIBLE',
          message: 'Invoice not found or not accessible to this lender',
        });
      }

      // Get complete invoice details
      const result = await db.query(`
        SELECT 
          i.id,
          i.invoice_number,
          i.buyer_name,
          i.buyer_gstin,
          i.seller_gstin,
          i.amount,
          i.currency,
          i.invoice_date as issue_date,
          i.invoice_date + INTERVAL '30 days' as due_date,
          i.giid,
          i.ipfs_hash,
          i.document_hash,
          i.blockchain_tx_hash,
          i.blockchain_timestamp,
          i.blockchain_status,
          i.created_at,
          fr.status as request_status,
          fr.created_at as request_date,
          m.company_name as msme_company_name,
          m.email as msme_email,
          m.gstin as msme_gstin,
          m.contact_person as msme_contact_person
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        JOIN msme_users m ON fr.msme_id = m.id
        WHERE fr.invoice_giid = $1 AND fr.lender_id = $2
      `, [giid, lenderId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      const invoice = result.rows[0];

      // Get seller history (MSME statistics)
      const historyResult = await db.query(`
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN fr.status = 'APPROVED' THEN 1 END) as verified,
          COUNT(CASE WHEN fr.status = 'REJECTED' THEN 1 END) as rejected
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        WHERE i.msme_id = (SELECT msme_id FROM invoices WHERE giid = $1)
      `, [giid]);

      const history = historyResult.rows[0];
      const totalInvoices = parseInt(history.total_invoices) || 0;
      const verified = parseInt(history.verified) || 0;
      const rejected = parseInt(history.rejected) || 0;
      const successRate = totalInvoices > 0 ? ((verified / totalInvoices) * 100).toFixed(1) : '0.0';

      console.log(`✅ Found invoice: ${invoice.invoice_number} for lender UUID: ${lenderId}`);

      res.json({
        success: true,
        invoice: {
          giid: invoice.giid,
          invoice_number: invoice.invoice_number,
          buyer_name: invoice.buyer_name,
          seller_gstin: invoice.seller_gstin,
          amount: parseFloat(invoice.amount),
          currency: invoice.currency || 'INR',
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          ipfs_hash: invoice.ipfs_hash,
          document_hash: invoice.document_hash,
          blockchain_tx_hash: invoice.blockchain_tx_hash,
          blockchain_timestamp: invoice.blockchain_timestamp,
          blockchain_status: invoice.blockchain_status,
          request_status: invoice.request_status,
          request_date: invoice.request_date,
          msme_company_name: invoice.msme_company_name,
          msme_contact_person: invoice.msme_contact_person,
        },
        seller_history: {
          total_invoices: totalInvoices,
          verified: verified,
          rejected: rejected,
          success_rate: parseFloat(successRate),
        },
      });
    } catch (error) {
      console.error('Error fetching invoice by GIID:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch invoice details',
        details: error.message,
      });
    }
  }
  static async getLenderStatistics(req, res) {
    try {
      // Use the authenticated lender's UUID directly
      const lenderId = req.user.id;
      
      // Get lender details
      const lenderResult = await db.query(`
        SELECT lender_name, lender_type
        FROM lender_users
        WHERE id = $1
      `, [lenderId]);

      if (lenderResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_FOUND',
          message: 'Lender not found in database',
        });
      }

      const lender = lenderResult.rows[0];

      // Get statistics from financing_requests table
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN fr.status = 'PENDING' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN fr.status = 'APPROVED' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN fr.status = 'FINANCED' THEN 1 END) as financed_requests,
          COALESCE(SUM(CASE WHEN fr.status = 'APPROVED' THEN i.amount ELSE 0 END), 0) as active_financing_amount,
          COALESCE(SUM(CASE WHEN fr.status IN ('APPROVED', 'FINANCED') THEN 1 ELSE 0 END), 0) as portfolio_count
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        WHERE fr.lender_id = $1
      `, [lenderId]);

      const stats = result.rows[0];
      
      // Calculate default rate (for now, set to 0 since we don't have default tracking)
      const totalFinanced = parseInt(stats.financed_requests) || 0;
      const defaultRate = 0; // TODO: Implement default tracking

      res.json({
        success: true,
        lender_id: lenderId,
        lender_name: lender.lender_name,
        lender_type: lender.lender_type,
        statistics: {
          pending_verification: parseInt(stats.pending_requests) || 0,
          active_financing: parseFloat(stats.active_financing_amount) || 0,
          portfolio_size: parseInt(stats.portfolio_count) || 0,
          default_rate: defaultRate,
          total_requests: parseInt(stats.total_requests) || 0,
          approved_requests: parseInt(stats.approved_requests) || 0,
          financed_requests: totalFinanced,
        },
      });
    } catch (error) {
      console.error('Error fetching lender statistics:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch statistics',
        details: error.message,
      });
    }
  }

  /**
   * Approve and lock invoice (Lender verification)
   * POST /api/financing/lock
   */
  static async lockInvoice(req, res) {
    try {
      const { giid } = req.body; // Only get giid from body
      
      // Use the authenticated lender's UUID directly
      const lenderId = req.user.id;
      const lenderEmail = req.user.email;

      // Get lender details
      const lenderResult = await db.query(`
        SELECT lender_name, lender_type
        FROM lender_users
        WHERE id = $1
      `, [lenderId]);

      if (lenderResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_FOUND',
          message: 'Lender not found in database',
        });
      }

      const lender = lenderResult.rows[0];

      console.log(`🔒 Locking invoice ${giid} by lender: ${lender.lender_name} (${lenderId})`);

      // Verify the financing request belongs to this lender
      const financingRequest = await db.query(`
        SELECT * FROM financing_requests
        WHERE invoice_giid = $1 AND lender_id = $2 AND status = 'PENDING'
      `, [giid, lenderId]);

      if (financingRequest.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'REQUEST_NOT_FOUND',
          message: 'Financing request not found or not authorized for this lender',
        });
      }

      // Lock invoice on Fabric ledger
      console.log(`📋 Calling ledger service to lock invoice...`);
      const ledgerResult = await ledgerService.lockInvoice(giid, lenderId);

      if (!ledgerResult.success) {
        console.error(`❌ Ledger lock failed:`, ledgerResult.error);
        return res.status(400).json({
          success: false,
          error: 'LEDGER_LOCK_FAILED',
          message: `Failed to lock invoice on blockchain: ${ledgerResult.error}`,
          details: ledgerResult.error,
        });
      }

      // Update financing request status to APPROVED
      const result = await db.query(`
        UPDATE financing_requests
        SET status = 'APPROVED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2 AND status = 'PENDING'
        RETURNING *
      `, [giid, lenderId]);

      // Log activity
      try {
        await ActivityModel.logActivity(lenderId, giid, 'LOCKED', 'Invoice locked for financing');
        console.log(`✅ Activity logged for invoice lock by ${lender.lender_name}`);
      } catch (activityError) {
        console.warn('⚠️  Warning: Failed to log activity:', activityError.message);
      }

      // Create notification for MSME
      try {
        // Get MSME ID and invoice number
        const invoiceResult = await db.query(`
          SELECT msme_id, invoice_number
          FROM invoices
          WHERE giid = $1
        `, [giid]);

        if (invoiceResult.rows.length > 0) {
          const { msme_id, invoice_number } = invoiceResult.rows[0];
          const message = `${lender.lender_name} approved and verified invoice ${invoice_number}`;
          
          await NotificationController.createNotification(
            msme_id, 
            giid, 
            invoice_number, 
            lenderId, 
            'APPROVED', 
            message
          );
          console.log(`📬 Notification created for MSME ${msme_id}: APPROVED by ${lender.lender_name}`);
        }
      } catch (notificationError) {
        console.warn('⚠️  Warning: Failed to create notification:', notificationError.message);
      }

      console.log(`✅ Invoice ${giid} approved and locked by ${lender.lender_name}`);
      console.log(`📋 Ledger status: ${ledgerResult.invoice.status}, locked by: ${ledgerResult.invoice.locked_by}`);

      res.json({
        success: true,
        message: 'Invoice approved and locked successfully',
        data: {
          giid: giid,
          lender_id: lenderId,
          lender_name: lender.lender_name,
          status: 'APPROVED',
          blockchain_status: ledgerResult.invoice.status,
          locked_by: ledgerResult.invoice.locked_by,
          updated_at: result.rows[0].updated_at,
        },
      });
    } catch (error) {
      console.error('Error locking invoice:', error);
      res.status(500).json({
        success: false,
        error: 'LOCK_FAILED',
        message: 'Failed to lock invoice',
        details: error.message,
      });
    }
  }

  /**
   * Reject and unlock invoice (Lender verification)
   * POST /api/financing/unlock
   */
  static async unlockInvoice(req, res) {
    try {
      const { giid } = req.body; // Only get giid from body
      
      // Use the authenticated lender's UUID directly
      const lenderId = req.user.id;
      const lenderEmail = req.user.email;

      // Get lender details
      const lenderResult = await db.query(`
        SELECT lender_name, lender_type
        FROM lender_users
        WHERE id = $1
      `, [lenderId]);

      if (lenderResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_FOUND',
          message: 'Lender not found in database',
        });
      }

      const lender = lenderResult.rows[0];

      console.log(`🔓 Rejecting invoice ${giid} by lender: ${lender.lender_name} (${lenderId})`);

      // Verify the financing request belongs to this lender
      // Allow unlock for both PENDING and APPROVED requests
      const financingRequest = await db.query(`
        SELECT * FROM financing_requests
        WHERE invoice_giid = $1 AND lender_id = $2 AND status IN ('PENDING', 'APPROVED')
      `, [giid, lenderId]);

      if (financingRequest.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'REQUEST_NOT_FOUND',
          message: 'Financing request not found or not authorized for this lender',
        });
      }

      // Try to unlock invoice on Fabric ledger, but don't fail if blockchain is down
      console.log(`📋 Attempting to unlock invoice on blockchain...`);
      let blockchainUnlocked = false;
      let blockchainStatus = 'UNKNOWN';
      
      try {
        const ledgerResult = await ledgerService.unlockInvoice(giid, lenderId);
        
        if (ledgerResult.success) {
          blockchainUnlocked = true;
          blockchainStatus = ledgerResult.invoice.status;
          console.log(`✅ Blockchain unlock successful: ${blockchainStatus}`);
        } else {
          console.warn(`⚠️ Blockchain unlock failed, proceeding with database-only rejection:`, ledgerResult.error);
        }
      } catch (ledgerError) {
        console.warn(`⚠️ Blockchain network unavailable, proceeding with database-only rejection:`, ledgerError.message);
      }

      // Update financing request status to REJECTED
      // Allow update for both PENDING and APPROVED requests
      const result = await db.query(`
        UPDATE financing_requests
        SET status = 'REJECTED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2 AND status IN ('PENDING', 'APPROVED')
        RETURNING *
      `, [giid, lenderId]);

      // Log activity
      try {
        await ActivityModel.logActivity(lenderId, giid, 'REJECTED', 'Invoice rejected by lender');
        console.log(`✅ Activity logged for invoice rejection by ${lender.lender_name}`);
      } catch (activityError) {
        console.warn('⚠️  Warning: Failed to log activity:', activityError.message);
      }

      // Create notification for MSME
      try {
        // Get MSME ID and invoice number
        const invoiceResult = await db.query(`
          SELECT msme_id, invoice_number
          FROM invoices
          WHERE giid = $1
        `, [giid]);

        if (invoiceResult.rows.length > 0) {
          const { msme_id, invoice_number } = invoiceResult.rows[0];
          
          // Determine action type and message based on original status
          const originalStatus = financingRequest.rows[0].status;
          let actionType, message;
          
          if (originalStatus === 'PENDING') {
            actionType = 'REJECTED';
            message = `${lender.lender_name} rejected invoice ${invoice_number}`;
          } else {
            actionType = 'DECLINED';
            message = `${lender.lender_name} declined invoice ${invoice_number}. Invoice is available for other lenders.`;
          }
          
          await NotificationController.createNotification(
            msme_id, 
            giid, 
            invoice_number, 
            lenderId, 
            actionType, 
            message
          );
          console.log(`📬 Notification created for MSME ${msme_id}: ${actionType} by ${lender.lender_name}`);
        }
      } catch (notificationError) {
        console.warn('⚠️  Warning: Failed to create notification:', notificationError.message);
      }

      console.log(`✅ Invoice ${giid} rejected by ${lender.lender_name}`);
      if (blockchainUnlocked) {
        console.log(`📋 Blockchain status: ${blockchainStatus}`);
      } else {
        console.log(`📋 Blockchain status: Not updated (network unavailable)`);
      }

      res.json({
        success: true,
        message: 'Invoice rejected successfully',
        data: {
          giid: giid,
          lender_id: lenderId,
          lender_name: lender.lender_name,
          status: 'REJECTED',
          blockchain_status: blockchainStatus,
          blockchain_updated: blockchainUnlocked,
          updated_at: result.rows[0].updated_at,
        },
      });
    } catch (error) {
      console.error('Error rejecting invoice:', error);
      res.status(500).json({
        success: false,
        error: 'UNLOCK_FAILED',
        message: 'Failed to reject invoice',
        details: error.message,
      });
    }
  }

  /**
   * Finance invoice (Complete the financing process)
   * POST /api/financing/finance
   */
  static async financeInvoice(req, res) {
    try {
      const { giid } = req.body;
      
      // Use the authenticated lender's UUID directly
      const lenderId = req.user.id;
      const lenderEmail = req.user.email;

      // Get lender details
      const lenderResult = await db.query(`
        SELECT lender_name, lender_type
        FROM lender_users
        WHERE id = $1
      `, [lenderId]);

      if (lenderResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_FOUND',
          message: 'Lender not found in database',
        });
      }

      const lender = lenderResult.rows[0];

      console.log(`💰 Financing invoice ${giid} by lender: ${lender.lender_name} (${lenderId})`);

      // Verify the financing request belongs to this lender and is approved
      const financingRequest = await db.query(`
        SELECT * FROM financing_requests
        WHERE invoice_giid = $1 AND lender_id = $2 AND status = 'APPROVED'
      `, [giid, lenderId]);

      if (financingRequest.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'REQUEST_NOT_FOUND',
          message: 'Approved financing request not found or not authorized for this lender',
        });
      }

      // Finance invoice on Fabric ledger
      console.log(`📋 Calling ledger service to finance invoice...`);
      const ledgerResult = await ledgerService.financeInvoice(giid, lenderId);

      if (!ledgerResult.success) {
        console.error(`❌ Ledger finance failed:`, ledgerResult.error);
        return res.status(400).json({
          success: false,
          error: 'LEDGER_FINANCE_FAILED',
          message: `Failed to finance invoice on blockchain: ${ledgerResult.error}`,
          details: ledgerResult.error,
        });
      }

      // Update financing request status to FINANCED
      const result = await db.query(`
        UPDATE financing_requests
        SET status = 'FINANCED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2 AND status = 'APPROVED'
        RETURNING *
      `, [giid, lenderId]);

      // Log activity
      try {
        await ActivityModel.logActivity(lenderId, giid, 'FINANCED', 'Invoice financed successfully');
        console.log(`✅ Activity logged for invoice financing by ${lender.lender_name}`);
      } catch (activityError) {
        console.warn('⚠️  Warning: Failed to log activity:', activityError.message);
      }

      // Create notification for MSME
      try {
        // Get MSME ID and invoice number
        const invoiceResult = await db.query(`
          SELECT msme_id, invoice_number
          FROM invoices
          WHERE giid = $1
        `, [giid]);

        if (invoiceResult.rows.length > 0) {
          const { msme_id, invoice_number } = invoiceResult.rows[0];
          const message = `${lender.lender_name} financed invoice ${invoice_number}`;
          
          await NotificationController.createNotification(
            msme_id, 
            giid, 
            invoice_number, 
            lenderId, 
            'FINANCED', 
            message
          );
          console.log(`📬 Notification created for MSME ${msme_id}: FINANCED by ${lender.lender_name}`);
        }
      } catch (notificationError) {
        console.warn('⚠️  Warning: Failed to create notification:', notificationError.message);
      }

      console.log(`✅ Invoice ${giid} financed by ${lender.lender_name}`);
      console.log(`📋 Ledger status: ${ledgerResult.invoice.status}, lender ID: ${ledgerResult.invoice.lender_id}`);

      res.json({
        success: true,
        message: 'Invoice financed successfully',
        data: {
          giid: giid,
          lender_id: lenderId,
          lender_name: lender.lender_name,
          status: 'FINANCED',
          blockchain_status: ledgerResult.invoice.status,
          lender_id_on_ledger: ledgerResult.invoice.lender_id,
          financed_at: ledgerResult.invoice.financed_at,
          updated_at: result.rows[0].updated_at,
        },
      });
    } catch (error) {
      console.error('Error financing invoice:', error);
      res.status(500).json({
        success: false,
        error: 'FINANCE_FAILED',
        message: 'Failed to finance invoice',
        details: error.message,
      });
    }
  }
}

module.exports = FinancingController;
