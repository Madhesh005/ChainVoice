/**
 * Financing Routes
 * API endpoints for financing requests and lender access
 */

const express = require('express');
const router = express.Router();
const FinancingController = require('../controllers/financingController');
const { authenticate, requireMSME, requireLender } = require('../middleware/authMiddleware');

// MSME Routes - Request financing
router.post('/request', authenticate, requireMSME, FinancingController.requestFinancing);
router.get('/lenders', authenticate, requireMSME, FinancingController.getAvailableLenders);

// Lender Routes - View assigned invoices
router.get('/lender/invoices', authenticate, requireLender, FinancingController.getLenderInvoices);
router.get('/lender/invoice/:giid', authenticate, requireLender, FinancingController.getInvoiceByGIID);
router.get('/lender/statistics', authenticate, requireLender, FinancingController.getLenderStatistics);

// Lender Verification Actions
router.post('/lock', authenticate, requireLender, FinancingController.lockInvoice);
router.post('/unlock', authenticate, requireLender, FinancingController.unlockInvoice);
router.post('/finance', authenticate, requireLender, FinancingController.financeInvoice);

module.exports = router;
