/**
 * MSME Routes
 * Defines API endpoints for MSME-specific functionality
 */

const express = require('express');
const router = express.Router();
const MSMEController = require('../controllers/msmeController');
const { authenticate, requireMSME } = require('../middleware/authMiddleware');

// Apply authentication to all MSME routes
router.use(authenticate);
router.use(requireMSME);

// MSME Dashboard and Profile
router.get('/dashboard', MSMEController.getDashboard);
router.get('/profile', MSMEController.getProfile);

module.exports = router;
