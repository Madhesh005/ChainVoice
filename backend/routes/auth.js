/**
 * Authentication Routes
 * 
 * Handles registration and login for:
 * - MSME users
 * - Lender/NBFC users
 * - Regulator/Admin users
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { formatSuccess, formatError } = require('../utils/responseFormatter');
const { validateBody } = require('../middleware/validator');

// =====================================================
// MSME Routes
// =====================================================

/**
 * POST /api/auth/msme/register
 * Register new MSME user
 */
router.post('/msme/r