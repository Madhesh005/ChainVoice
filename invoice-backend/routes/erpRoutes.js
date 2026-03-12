/**
 * ERP Routes
 * Defines API endpoints for ERP integration
 */

const express = require('express');
const router = express.Router();
const ERPController = require('../controllers/erpController');
const { authenticate, requireMSME } = require('../middleware/authMiddleware');

// Apply authentication to all ERP routes
router.use(authenticate);
router.use(requireMSME);

// ERP Connection Management
router.post('/connect', ERPController.connect);
router.get('/connections', ERPController.getConnections);
router.delete('/connections/:id', ERPController.disconnect);

// Invoice Synchronization
router.post('/sync', ERPController.syncInvoices);
router.get('/sync-status', ERPController.getSyncStatus);

// Invoice Management
router.get('/invoices', ERPController.getInvoices);
router.get('/invoices/:id', ERPController.getInvoiceById);
router.get('/invoices/:id/details', ERPController.getInvoiceDetails); // New endpoint for database ID
router.get('/invoices/:id/pdf', ERPController.downloadInvoicePDF);
router.get('/statistics', ERPController.getStatistics);

// ERP Information
router.get('/supported', ERPController.getSupportedERPs);

module.exports = router;
