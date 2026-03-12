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
   * Body: { giid: string, lender_id: string }
   */
  static async requestFinancing(req, res) {
    try {
      const { giid, lender_id } = req.body;
      const msme_id = req.user.id;

      // Validate required fields
      if (!giid || !lender_id) {
        return res.status(400).json({
          success: false,
          message: "giid and lender_id are required"
        });
      }

      // Step 1 — Validate invoice
      const invoice = await InvoiceModel.findByGIID(giid);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      // Step 2 — Verify MSME ownership
      if (invoice.msme_id !== msme_id) {
        return res.status(403).json({
          success: false,
          message: "Invoice does not belong to this MSME"
        });
      }

      // Check if invoice is registered on blockchain
      if (!invoice.giid) {
        return res.status(400).json({
          success: false,
          message: 'Invoice must be registered on blockchain before requesting financing',
        });
      }

      // Check if request already exists for this invoice-lender pair
      const existingRequest = await FinancingRequestModel.getByGIIDAndLender(giid, lender_id);
      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: 'Financing request already exists for this invoice and lender',
        });
      }

      // Step 3 — Create financing request in financing_requests table
      await db.query(`
        INSERT INTO financing_requests(invoice_giid, invoice_id, lender_id, msme_id)
        VALUES ($1, $2, $3, $4)
      `, [giid, invoice.id, lender_id, msme_id]);

      // Step 4 — Make the invoice visible to the selected lender
      // Create entry in lender_invoice_access table
      const LenderInvoiceAccessModel = require('../models/lenderInvoiceAccess.model');
      await LenderInvoiceAccessModel.grantAccess({
        invoice_giid: invoice.giid,
        invoice_id: invoice.id,
        lender_ids: [lender_id],
        msme_id: msme_id,
      });

      // Log activity
      try {
        const lenderNames = {
          'HDFC_BANK': 'HDFC Bank',
          'AXIS_BANK': 'Axis Bank',
          'BAJAJ_FINSERV': 'Bajaj Finserv',
          'SHRIRAM_FINANCE': 'Shriram Finance',
          'MUTHOOT_FINANCE': 'Muthoot Finance',
        };
        const lenderName = lenderNames[lender_id] || lender_id;

        await ActivityModel.logActivity({
          msme_id: msme_id,
          activity_type: 'financing_requested',
          activity_title: 'Financing Request Sent',
          activity_description: `Financing request sent to ${lenderName} for invoice ${invoice.invoice_number}`,
          related_invoice_id: invoice.id,
          related_invoice_number: invoice.invoice_number,
          metadata: {
            lender_id: lender_id,
            lender_name: lenderName,
            amount: invoice.total_amount || invoice.amount,
            currency: invoice.currency || 'INR',
          },
        });
      } catch (activityError) {
        console.warn('⚠️  Warning: Failed to log activity:', activityError.message);
      }

      console.log(`✅ Financing request created for invoice ${invoice.invoice_number}`);
      console.log(`   GIID: ${giid}`);
      console.log(`   Lender: ${lender_id}`);
      console.log(`   Invoice made visible to lender in dashboard`);

      res.json({
        success: true,
        message: "Financing request sent to lender"
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
      // Predefined list of lenders
      const lenders = [
        { id: 'HDFC_BANK', name: 'HDFC Bank', type: 'Bank' },
        { id: 'AXIS_BANK', name: 'Axis Bank', type: 'Bank' },
        { id: 'BAJAJ_FINSERV', name: 'Bajaj Finserv', type: 'NBFC' },
        { id: 'SHRIRAM_FINANCE', name: 'Shriram Finance', type: 'NBFC' },
        { id: 'MUTHOOT_FINANCE', name: 'Muthoot Finance', type: 'NBFC' },
      ];

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
      // Map the logged-in lender to their lender identifier
      const lenderIdentifier = mapEmailToLenderIdentifier(req.user.email);
      
      if (!lenderIdentifier) {
        console.error(`❌ No lender identifier found for email: ${req.user.email}`);
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_MAPPED',
          message: 'Lender email not mapped to any lender identifier',
        });
      }

      console.log(`🔍 Fetching invoices for lender: ${lenderIdentifier} (${req.user.email})`);

      // Query financing requests for this specific lender
      const result = await db.query(`
        SELECT 
          fr.id as request_id,
          fr.status as request_status,
          fr.created_at as request_date,
          fr.lender_id,
          i.id as invoice_id,
          i.invoice_number,
          i.buyer_name,
          i.seller_gstin as seller_name,
          i.amount,
          i.giid,
          i.ipfs_cid,
          i.document_hash,
          i.blockchain_status
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        WHERE fr.lender_id = $1
        ORDER BY fr.created_at DESC
      `, [lenderIdentifier]);

      console.log(`✅ Found ${result.rows.length} financing requests for ${lenderIdentifier}`);

      res.json({
        success: true,
        count: result.rows.length,
        lender_identifier: lenderIdentifier,
        lender_name: getLenderName(lenderIdentifier),
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
      
      // Map the logged-in lender to their lender identifier
      const lenderIdentifier = mapEmailToLenderIdentifier(req.user.email);
      
      if (!lenderIdentifier) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_MAPPED',
          message: 'Lender email not mapped to any lender identifier',
        });
      }

      console.log(`🔍 Fetching invoice details for GIID: ${giid} by lender: ${lenderIdentifier}`);

      // Check if this lender has access to this invoice
      const accessCheck = await db.query(`
        SELECT fr.id
        FROM financing_requests fr
        WHERE fr.invoice_giid = $1 AND fr.lender_id = $2
      `, [giid, lenderIdentifier]);

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
          i.seller_gstin as seller_name,
          i.buyer_gstin,
          i.seller_gstin,
          i.amount,
          i.currency,
          i.invoice_date as issue_date,
          i.invoice_date + INTERVAL '30 days' as due_date,
          i.giid,
          i.ipfs_cid,
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
      `, [giid, lenderIdentifier]);

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
        WHERE fr.msme_id = $1
      `, [invoice.msme_id]);

      const history = historyResult.rows[0];
      const totalInvoices = parseInt(history.total_invoices) || 0;
      const verified = parseInt(history.verified) || 0;
      const rejected = parseInt(history.rejected) || 0;
      const successRate = totalInvoices > 0 ? ((verified / totalInvoices) * 100).toFixed(1) : '0.0';

      console.log(`✅ Found invoice: ${invoice.invoice_number} for lender: ${lenderIdentifier}`);

      res.json({
        success: true,
        invoice: {
          giid: invoice.giid,
          invoice_number: invoice.invoice_number,
          buyer_name: invoice.buyer_name,
          seller_name: invoice.seller_name,
          seller_gstin: invoice.seller_gstin,
          amount: parseFloat(invoice.amount),
          currency: invoice.currency || 'INR',
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          ipfs_cid: invoice.ipfs_cid,
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
      // Map the logged-in lender to their lender identifier
      const lenderIdentifier = mapEmailToLenderIdentifier(req.user.email);
      
      if (!lenderIdentifier) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_MAPPED',
          message: 'Lender email not mapped to any lender identifier',
        });
      }

      // Get statistics from financing_requests table
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN fr.status = 'PENDING' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN fr.status = 'APPROVED' THEN 1 END) as approved_requests,
          COALESCE(SUM(i.amount), 0) as total_amount
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        WHERE fr.lender_id = $1
      `, [lenderIdentifier]);

      const stats = result.rows[0];

      res.json({
        success: true,
        lender_identifier: lenderIdentifier,
        lender_name: getLenderName(lenderIdentifier),
        statistics: {
          total_requests: parseInt(stats.total_requests) || 0,
          pending_requests: parseInt(stats.pending_requests) || 0,
          approved_requests: parseInt(stats.approved_requests) || 0,
          total_amount: parseFloat(stats.total_amount) || 0,
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
      
      // PROBLEM 1 FIX: Extract lender identifier from authenticated user
      const lenderIdentifier = mapEmailToLenderIdentifier(req.user.email);
      
      if (!lenderIdentifier) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_MAPPED',
          message: 'Lender email not mapped to any lender identifier',
        });
      }

      console.log(`🔒 Locking invoice ${giid} by lender: ${lenderIdentifier}`);

      // PROBLEM 1 FIX: Verify the financing request belongs to this lender
      const financingRequest = await db.query(`
        SELECT * FROM financing_requests
        WHERE invoice_giid = $1 AND lender_id = $2 AND status = 'PENDING'
      `, [giid, lenderIdentifier]);

      if (financingRequest.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'REQUEST_NOT_FOUND',
          message: 'Financing request not found or not authorized for this lender',
        });
      }

      // PROBLEM 3 FIX: Lock invoice on Fabric ledger
      console.log(`📋 Calling ledger service to lock invoice...`);
      const ledgerResult = await ledgerService.lockInvoice(giid, lenderIdentifier);

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
      `, [giid, lenderIdentifier]);

      // PROBLEM 2 FIX: Log activity with new format
      try {
        await ActivityModel.logActivity(lenderIdentifier, giid, 'LOCKED', 'Invoice locked for financing');
        console.log(`✅ Activity logged for invoice lock by ${lenderIdentifier}`);
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
          const lenderName = getLenderName(lenderIdentifier);
          const message = `${lenderName} approved and verified invoice ${invoice_number}`;
          
          await NotificationController.createNotification(
            msme_id, 
            giid, 
            invoice_number, 
            lenderIdentifier, 
            'APPROVED', 
            message
          );
          console.log(`📬 Notification created for MSME ${msme_id}: APPROVED by ${lenderIdentifier}`);
        }
      } catch (notificationError) {
        console.warn('⚠️  Warning: Failed to create notification:', notificationError.message);
      }

      console.log(`✅ Invoice ${giid} approved and locked by ${lenderIdentifier}`);
      console.log(`📋 Ledger status: ${ledgerResult.invoice.status}, locked by: ${ledgerResult.invoice.locked_by}`);

      res.json({
        success: true,
        message: 'Invoice approved and locked successfully',
        data: {
          giid: giid,
          lender_id: lenderIdentifier,
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
      
      // PROBLEM 1 FIX: Extract lender identifier from authenticated user
      const lenderIdentifier = mapEmailToLenderIdentifier(req.user.email);
      
      if (!lenderIdentifier) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_MAPPED',
          message: 'Lender email not mapped to any lender identifier',
        });
      }

      console.log(`🔓 Rejecting invoice ${giid} by lender: ${lenderIdentifier}`);

      // PROBLEM 1 FIX: Verify the financing request belongs to this lender
      // Allow unlock for both PENDING and APPROVED requests
      const financingRequest = await db.query(`
        SELECT * FROM financing_requests
        WHERE invoice_giid = $1 AND lender_id = $2 AND status IN ('PENDING', 'APPROVED')
      `, [giid, lenderIdentifier]);

      if (financingRequest.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'REQUEST_NOT_FOUND',
          message: 'Financing request not found or not authorized for this lender',
        });
      }

      // PROBLEM 3 FIX: Unlock invoice on Fabric ledger
      console.log(`📋 Calling ledger service to unlock invoice...`);
      const ledgerResult = await ledgerService.unlockInvoice(giid, lenderIdentifier);

      if (!ledgerResult.success) {
        console.error(`❌ Ledger unlock failed:`, ledgerResult.error);
        return res.status(400).json({
          success: false,
          error: 'LEDGER_UNLOCK_FAILED',
          message: `Failed to unlock invoice on blockchain: ${ledgerResult.error}`,
          details: ledgerResult.error,
        });
      }

      // Update financing request status to REJECTED
      // Allow update for both PENDING and APPROVED requests
      const result = await db.query(`
        UPDATE financing_requests
        SET status = 'REJECTED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2 AND status IN ('PENDING', 'APPROVED')
        RETURNING *
      `, [giid, lenderIdentifier]);

      // PROBLEM 2 FIX: Log activity with new format
      try {
        await ActivityModel.logActivity(lenderIdentifier, giid, 'REJECTED', 'Invoice rejected by lender');
        console.log(`✅ Activity logged for invoice rejection by ${lenderIdentifier}`);
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
          const lenderName = getLenderName(lenderIdentifier);
          
          // Determine action type and message based on original status
          const originalStatus = financingRequest.rows[0].status;
          let actionType, message;
          
          if (originalStatus === 'PENDING') {
            actionType = 'REJECTED';
            message = `${lenderName} rejected invoice ${invoice_number}`;
          } else {
            actionType = 'DECLINED';
            message = `${lenderName} declined invoice ${invoice_number}. Invoice is available for other lenders.`;
          }
          
          await NotificationController.createNotification(
            msme_id, 
            giid, 
            invoice_number, 
            lenderIdentifier, 
            actionType, 
            message
          );
          console.log(`📬 Notification created for MSME ${msme_id}: ${actionType} by ${lenderIdentifier}`);
        }
      } catch (notificationError) {
        console.warn('⚠️  Warning: Failed to create notification:', notificationError.message);
      }

      console.log(`✅ Invoice ${giid} rejected by ${lenderIdentifier}`);
      console.log(`📋 Ledger status: ${ledgerResult.invoice.status}, locked by: ${ledgerResult.invoice.locked_by}`);

      res.json({
        success: true,
        message: 'Invoice rejected successfully',
        data: {
          giid: giid,
          lender_id: lenderIdentifier,
          status: 'REJECTED',
          blockchain_status: ledgerResult.invoice.status,
          locked_by: ledgerResult.invoice.locked_by,
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
      
      // Extract lender identifier from authenticated user
      const lenderIdentifier = mapEmailToLenderIdentifier(req.user.email);
      
      if (!lenderIdentifier) {
        return res.status(403).json({
          success: false,
          error: 'LENDER_NOT_MAPPED',
          message: 'Lender email not mapped to any lender identifier',
        });
      }

      console.log(`💰 Financing invoice ${giid} by lender: ${lenderIdentifier}`);

      // Verify the financing request belongs to this lender and is approved
      const financingRequest = await db.query(`
        SELECT * FROM financing_requests
        WHERE invoice_giid = $1 AND lender_id = $2 AND status = 'APPROVED'
      `, [giid, lenderIdentifier]);

      if (financingRequest.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'REQUEST_NOT_FOUND',
          message: 'Approved financing request not found or not authorized for this lender',
        });
      }

      // Finance invoice on Fabric ledger
      console.log(`📋 Calling ledger service to finance invoice...`);
      const ledgerResult = await ledgerService.financeInvoice(giid, lenderIdentifier);

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
      `, [giid, lenderIdentifier]);

      // Log activity with new format
      try {
        await ActivityModel.logActivity(lenderIdentifier, giid, 'FINANCED', 'Invoice financed successfully');
        console.log(`✅ Activity logged for invoice financing by ${lenderIdentifier}`);
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
          const lenderName = getLenderName(lenderIdentifier);
          const message = `${lenderName} financed invoice ${invoice_number}`;
          
          await NotificationController.createNotification(
            msme_id, 
            giid, 
            invoice_number, 
            lenderIdentifier, 
            'FINANCED', 
            message
          );
          console.log(`📬 Notification created for MSME ${msme_id}: FINANCED by ${lenderIdentifier}`);
        }
      } catch (notificationError) {
        console.warn('⚠️  Warning: Failed to create notification:', notificationError.message);
      }

      console.log(`✅ Invoice ${giid} financed by ${lenderIdentifier}`);
      console.log(`📋 Ledger status: ${ledgerResult.invoice.status}, lender ID: ${ledgerResult.invoice.lender_id}`);

      res.json({
        success: true,
        message: 'Invoice financed successfully',
        data: {
          giid: giid,
          lender_id: lenderIdentifier,
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
