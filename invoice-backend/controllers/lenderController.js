/**
 * Lender Controller
 * Handles lender dashboard and invoice management
 */

const LenderInvoiceAccessModel = require('../models/lenderInvoiceAccess.model');
const ActivityModel = require('../models/activity.model');
const { mapEmailToLenderIdentifier, getLenderName } = require('../utils/lenderMapping');
const db = require('../db');

class LenderController {
  /**
   * Get lender dashboard statistics
   * GET /api/lender/dashboard/stats
   */
  static async getDashboardStats(req, res) {
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

      console.log(`📊 Getting dashboard stats for lender: ${lenderIdentifier} (${req.user.email})`);

      // 1. Pending Verification Count (financing requests with status = PENDING)
      const pendingQuery = `
        SELECT COUNT(*) as count
        FROM financing_requests fr
        WHERE fr.lender_id = $1
        AND fr.status = 'PENDING'
      `;
      const pendingResult = await db.query(pendingQuery, [lenderIdentifier]);
      const pendingVerification = parseInt(pendingResult.rows[0].count) || 0;

      // 2. Active Financing Value (financing requests for this lender)
      const activeQuery = `
        SELECT COALESCE(SUM(i.amount), 0) as total
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        WHERE fr.lender_id = $1
      `;
      const activeResult = await db.query(activeQuery, [lenderIdentifier]);
      const activeFinancing = parseFloat(activeResult.rows[0].total) || 0;

      // 3. Portfolio Size (total financing requests for this lender)
      const portfolioQuery = `
        SELECT COUNT(*) as count
        FROM financing_requests fr
        WHERE fr.lender_id = $1
      `;
      const portfolioResult = await db.query(portfolioQuery, [lenderIdentifier]);
      const portfolioSize = parseInt(portfolioResult.rows[0].count) || 0;

      // 4. Default Rate (placeholder - can be enhanced later)
      const defaultRate = 0; // For now, set to 0 as we don't track defaults yet

      // 5. Total Financing Requests for this lender
      const totalQuery = `
        SELECT COUNT(*) as count
        FROM financing_requests
        WHERE lender_id = $1
      `;
      const totalResult = await db.query(totalQuery, [lenderIdentifier]);
      const totalInvoices = parseInt(totalResult.rows[0].count) || 0;

      res.json({
        success: true,
        lender_identifier: lenderIdentifier,
        lender_name: getLenderName(lenderIdentifier),
        statistics: {
          pending_verification: pendingVerification,
          active_financing: activeFinancing,
          portfolio_size: portfolioSize,
          default_rate: parseFloat(defaultRate.toFixed(2)),
          total_invoices: totalInvoices,
        },
      });
    } catch (error) {
      console.error('Error fetching lender dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch dashboard statistics',
        details: error.message,
      });
    }
  }

  /**
   * Get pending verification invoices
   * GET /api/lender/invoices/pending
   */
  static async getPendingInvoices(req, res) {
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

      const limit = parseInt(req.query.limit) || 10;

      console.log(`📋 Getting pending invoices for lender: ${lenderIdentifier} (${req.user.email})`);

      const query = `
        SELECT 
          fr.id as request_id,
          fr.status as request_status,
          fr.created_at as request_date,
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.buyer_name,
          i.seller_gstin as seller_name,
          i.buyer_gstin,
          i.seller_gstin,
          i.amount,
          i.amount as gst_amount,
          i.amount as total_amount,
          i.currency,
          i.status as erp_status,
          i.giid,
          i.ipfs_cid as ipfs_hash,
          i.document_hash,
          i.blockchain_status,
          i.created_at,
          m.company_name as msme_company_name,
          m.email as msme_email,
          m.gstin as msme_gstin,
          m.contact_person as msme_contact_person,
          m.phone as msme_phone
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        JOIN msme_users m ON fr.msme_id = m.id
        WHERE fr.lender_id = $1
        AND fr.status = 'PENDING'
        ORDER BY fr.created_at DESC
        LIMIT $2
      `;

      const result = await db.query(query, [lenderIdentifier, limit]);

      console.log(`✅ Found ${result.rows.length} pending invoices for ${lenderIdentifier}`);

      res.json({
        success: true,
        count: result.rows.length,
        lender_identifier: lenderIdentifier,
        lender_name: getLenderName(lenderIdentifier),
        invoices: result.rows,
      });
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch pending invoices',
        details: error.message,
      });
    }
  }

  /**
   * Get recent lender activity (PROBLEM 2 FIX)
   * GET /api/lender/activity
   */
  static async getRecentActivity(req, res) {
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

      const limit = parseInt(req.query.limit) || 10;

      console.log(`📋 Getting recent activity for lender: ${lenderIdentifier} (${req.user.email})`);

      // PROBLEM 2 FIX: Get activities scoped to this lender only
      const activities = await ActivityModel.getLenderActivities(lenderIdentifier, limit);

      console.log(`✅ Found ${activities.length} activities for ${lenderIdentifier}`);

      res.json({
        success: true,
        count: activities.length,
        lender_identifier: lenderIdentifier,
        lender_name: getLenderName(lenderIdentifier),
        activities: activities,
      });
    } catch (error) {
      console.error('Error fetching lender activity:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch recent activity',
        details: error.message,
      });
    }
  }

  /**
   * Get all invoices for lender (with filters)
   * GET /api/lender/invoices
   */
  static async getAllInvoices(req, res) {
    try {
      const lenderIdentifier = req.query.lender_identifier || req.user.lender_identifier || 'HDFC_BANK';
      const status = req.query.status; // Optional filter
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      let query = `
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.buyer_name,
          i.seller_name,
          i.amount,
          i.currency,
          i.status as erp_status,
          i.giid,
          i.ipfs_hash,
          i.document_hash,
          i.blockchain_status,
          i.created_at,
          i.updated_at,
          lia.created_at as shared_at,
          m.company_name as msme_company_name,
          m.email as msme_email,
          m.gstin as msme_gstin
        FROM invoices i
        JOIN lender_invoice_access lia ON i.giid = lia.invoice_giid
        JOIN msme_users m ON lia.msme_id = m.id
        WHERE lia.lender_id = $1
      `;

      const params = [lenderIdentifier];

      if (status) {
        query += ` AND i.blockchain_status = $${params.length + 1}`;
        params.push(status);
      }

      query += ` ORDER BY lia.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        count: result.rows.length,
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
}

module.exports = LenderController;
