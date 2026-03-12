/**
 * Authentication Routes
 * Defines API endpoints for authentication
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// MSME Routes
router.post('/msme/register', authController.registerMSME.bind(authController));
router.post('/msme/login', authController.loginMSME.bind(authController));

// Lender Routes
router.post('/lender/register', authController.registerLender.bind(authController));
router.post('/lender/login', authController.loginLender.bind(authController));

// Admin Routes
router.post('/admin/login', authController.loginAdmin.bind(authController));

// Token Verification
router.get('/verify', authController.verifyToken.bind(authController));

module.exports = router;
