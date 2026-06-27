/**
 * Portfolio Routes
 * Defines API endpoints for lender portfolio management
 */

const express = require('express');
const router = express.Router();
const PortfolioController = require('../controllers/portfolioController');
const { authenticate, requireLender } = require('../middleware/authMiddleware');

// Apply authentication to all portfolio routes
router.use(authenticate);
router.use(requireLender);

// Portfolio Statistics
router.get('/stats', PortfolioController.getPortfolioStats);

// Sector Breakdown
router.get('/sectors', PortfolioController.getSectorBreakdown);

// Financed Invoices
router.get('/invoices', PortfolioController.getFinancedInvoices);

module.exports = router;