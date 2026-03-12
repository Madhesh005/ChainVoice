/**
 * MSME Controller
 * Handles MSME-specific dashboard and data endpoints
 */

const InvoiceModel = require('../models/invoice.model');
const userModels = require('../models/userModels');

class MSMEController {
  /**
   * Get MSME dashboard data
   * GET /api/msme/dashboard
   */
  static async getDashboard(req, res) {
    try {
      const msmeId = req.user.id;

      // Get MSME user details
      const msmeUser = await userModels.findMSMEById(msmeId);

      if (!msmeUser) {
        return res.status(404).json({
          success: false,
          error: 'MSME user not found',
        });
      }

      // Get invoice statistics
      const stats = await InvoiceModel.getStatistics(msmeId);

      // Get recent posted invoices only (last 5)
      const recentInvoices = await InvoiceModel.findByMSME(msmeId, { 
        status: 'posted',
        limit: 5 
      });

      // Get recent activities
      const ActivityModel = require('../models/activity.model');
      let recentActivities = [];
      try {
        recentActivities = await ActivityModel.getRecentActivities(msmeId, 5);
      } catch (activityError) {
        console.warn('Warning: Failed to fetch activities:', activityError.message);
        // Continue without activities
      }

      // Calculate additional metrics
      const totalInvoices = parseInt(stats.total_invoices) || 0;
      const postedInvoices = parseInt(stats.posted_invoices) || 0;
      const blockchainRegistered = parseInt(stats.blockchain_registered) || 0;
      const totalAmount = parseFloat(stats.total_amount) || 0;
      const postedAmount = parseFloat(stats.posted_amount) || 0;

      res.json({
        success: true,
        data: {
          company_name: msmeUser.company_name,
          contact_person: msmeUser.contact_person,
          email: msmeUser.email,
          gstin: msmeUser.gstin,
          total_invoices: totalInvoices,
          posted_invoices: postedInvoices,
          draft_invoices: totalInvoices - postedInvoices,
          blockchain_registered: blockchainRegistered,
          total_amount: totalAmount,
          posted_amount: postedAmount,
          recent_invoices: recentInvoices.map((inv) => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            buyer_name: inv.buyer_name,
            amount: inv.amount,
            currency: inv.currency,
            status: inv.status,
            invoice_date: inv.invoice_date,
            giid: inv.giid,
            erp_type: inv.erp_type,
          })),
          recent_activities: recentActivities.map((activity) => ({
            id: activity.id,
            type: activity.activity_type,
            title: activity.activity_title,
            description: activity.activity_description,
            invoice_number: activity.related_invoice_number,
            metadata: activity.metadata,
            created_at: activity.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching MSME dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error.message,
      });
    }
  }

  /**
   * Get MSME profile
   * GET /api/msme/profile
   */
  static async getProfile(req, res) {
    try {
      const msmeId = req.user.id;

      const msmeUser = await userModels.findMSMEById(msmeId);

      if (!msmeUser) {
        return res.status(404).json({
          success: false,
          error: 'MSME user not found',
        });
      }

      res.json({
        success: true,
        profile: {
          id: msmeUser.id,
          company_name: msmeUser.company_name,
          contact_person: msmeUser.contact_person,
          email: msmeUser.email,
          phone: msmeUser.phone,
          gstin: msmeUser.gstin,
          created_at: msmeUser.created_at,
        },
      });
    } catch (error) {
      console.error('Error fetching MSME profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
        details: error.message,
      });
    }
  }
}

module.exports = MSMEController;
