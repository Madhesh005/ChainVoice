/**
 * Lender Routes
 * API endpoints for lender dashboard and operations
 */

const express = require('express');
const router = express.Router();
const LenderController = require('../controllers/lenderController');
const { authenticate, requireLender } = require('../middleware/authMiddleware');

// Apply authentication to all lender routes
router.use(authenticate);
router.use(requireLender);

// Dashboard
router.get('/dashboard/stats', LenderController.getDashboardStats);
router.get('/activity', LenderController.getRecentActivity);

// Invoices
router.get('/invoices', LenderController.getAllInvoices);
router.get('/invoices/pending', LenderController.getPendingInvoices);

module.exports = router;
