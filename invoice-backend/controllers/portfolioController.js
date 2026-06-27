/**
 * Portfolio Controller
 * Handles portfolio management and analytics for lenders
 */

const db = require('../db');

class PortfolioController {
  /**
   * Get comprehensive portfolio statistics
   * GET /api/lender/portfolio/stats
   */
  static async getPortfolioStats(req, res) {
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

      console.log(`📊 Getting portfolio stats for lender: ${lender.lender_name} (${lenderId})`);

      // 1. Total Financed Amount (APPROVED + FINANCED requests)
      const totalFinancedQuery = `
        SELECT COALESCE(SUM(i.amount), 0) as total
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        WHERE fr.lender_id = $1
        AND fr.status IN ('APPROVED', 'FINANCED')
      `;
      const totalFinancedResult = await db.query(totalFinancedQuery, [lenderId]);
      const totalFinanced = parseFloat(totalFinancedResult.rows[0].total) || 0;

      // 2. Active Invoices Count (APPROVED + FINANCED)
      const activeInvoicesQuery = `
        SELECT COUNT(*) as count
        FROM financing_requests fr
        WHERE fr.lender_id = $1
        AND fr.status IN ('APPROVED', 'FINANCED')
      `;
      const activeInvoicesResult = await db.query(activeInvoicesQuery, [lenderId]);
      const activeInvoices = parseInt(activeInvoicesResult.rows[0].count) || 0;

      // 3. Average Interest Rate (placeholder - can be enhanced with actual rates)
      const avgInterestRate = 12.5; // Default rate, can be made dynamic

      // 4. Expected Returns (calculated based on interest rate)
      const expectedReturns = totalFinanced * (avgInterestRate / 100);

      // 5. Default Rate (REJECTED / TOTAL * 100)
      const defaultRateQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
          COUNT(*) as total
        FROM financing_requests
        WHERE lender_id = $1
      `;
      const defaultRateResult = await db.query(defaultRateQuery, [lenderId]);
      const defaultData = defaultRateResult.rows[0];
      const defaultRate = defaultData.total > 0 ? 
        (parseFloat(defaultData.rejected) / parseFloat(defaultData.total)) * 100 : 0;

      res.json({
        success: true,
        lender_id: lenderId,
        lender_name: lender.lender_name,
        lender_type: lender.lender_type,
        portfolio_stats: {
          total_financed: totalFinanced,
          active_invoices: activeInvoices,
          avg_interest_rate: avgInterestRate,
          expected_returns: expectedReturns,
          default_rate: defaultRate,
          avg_payment_days: 45 // Placeholder - can be calculated from actual payment data
        }
      });
    } catch (error) {
      console.error('Error fetching portfolio stats:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch portfolio statistics',
        details: error.message,
      });
    }
  }

  /**
   * Get sector breakdown for portfolio
   * GET /api/lender/portfolio/sectors
   */
  static async getSectorBreakdown(req, res) {
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

      console.log(`📊 Getting sector breakdown for lender: ${lender.lender_name} (${lenderId})`);

      // Get sector breakdown based on buyer companies
      const sectorQuery = `
        SELECT 
          i.buyer_name as sector,
          COUNT(*) as count,
          SUM(i.amount) as amount,
          ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        WHERE fr.lender_id = $1
        AND fr.status IN ('APPROVED', 'FINANCED')
        GROUP BY i.buyer_name
        ORDER BY amount DESC
        LIMIT 10
      `;
      
      const sectorResult = await db.query(sectorQuery, [lenderId]);

      res.json({
        success: true,
        lender_id: lenderId,
        lender_name: lender.lender_name,
        sectors: sectorResult.rows
      });
    } catch (error) {
      console.error('Error fetching sector breakdown:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch sector breakdown',
        details: error.message,
      });
    }
  }

  /**
   * Get financed invoices for portfolio
   * GET /api/lender/portfolio/invoices
   */
  static async getFinancedInvoices(req, res) {
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

      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const status = req.query.status; // Optional filter

      console.log(`📊 Getting financed invoices for lender: ${lender.lender_name} (${lenderId})`);

      let query = `
        SELECT 
          fr.id as request_id,
          fr.status as financing_status,
          fr.created_at as financed_date,
          fr.updated_at as last_updated,
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.buyer_name,
          i.seller_gstin,
          i.amount,
          i.currency,
          i.giid,
          i.ipfs_hash,
          i.document_hash,
          i.blockchain_status,
          m.company_name as msme_company_name,
          m.email as msme_email,
          m.gstin as msme_gstin
        FROM financing_requests fr
        JOIN invoices i ON fr.invoice_id = i.id
        JOIN msme_users m ON fr.msme_id = m.id
        WHERE fr.lender_id = $1
      `;

      const params = [lenderId];

      if (status) {
        query += ` AND fr.status = $${params.length + 1}`;
        params.push(status);
      } else {
        query += ` AND fr.status IN ('APPROVED', 'FINANCED')`;
      }

      query += ` ORDER BY fr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        lender_id: lenderId,
        lender_name: lender.lender_name,
        count: result.rows.length,
        invoices: result.rows
      });
    } catch (error) {
      console.error('Error fetching financed invoices:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to fetch financed invoices',
        details: error.message,
      });
    }
  }
}

module.exports = PortfolioController;
