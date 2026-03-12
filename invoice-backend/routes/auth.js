/**
 * Authentication Routes
 * Handles registration and login for MSME, Lender, and Regulator users
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { formatSuccess, formatError } = require('../utils/responseFormatter');
const { validateBody } = require('../middleware/validator');

/**
 * Helper to get client IP and User Agent
 */
function getClientInfo(req) {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ipAddress, userAgent };
}

// ============================================
// MSME Routes
// ============================================

/**
 * POST /api/auth/msme/register
 * Register new MSME user
 */
router.post('/msme/register',
  validateBody(['email', 'password', 'companyName', 'gstin', 'contactPerson', 'phone']),
  async (req, res, next) => {
    try {
      const { ipAddress, userAgent } = getClientInfo(req);
      const user = await authService.registerMSME(req.body, ipAddress, userAgent);

      res.status(201).json(formatSuccess({
        message: 'MSME account created successfully',
        user: {
          id: user.id,
          email: user.email,
          companyName: user.company_name,
          gstin: user.gstin,
          contactPerson: user.contact_person,
          phone: user.phone,
          isVerified: user.is_verified,
          createdAt: user.created_at
        }
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/msme/login
 * Login MSME user
 */
router.post('/msme/login',
  validateBody(['email', 'password']),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { ipAddress, userAgent } = getClientInfo(req);

      const result = await authService.loginMSME(email, password, ipAddress, userAgent);

      res.json(formatSuccess({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          companyName: result.user.company_name,
          gstin: result.user.gstin,
          contactPerson: result.user.contact_person,
          phone: result.user.phone,
          isVerified: result.user.is_verified,
          userType: 'MSME'
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Lender/NBFC Routes
// ============================================

/**
 * POST /api/auth/lender/register
 * Register new Lender/NBFC user
 */
router.post('/lender/register',
  validateBody(['email', 'password', 'lenderName', 'lenderType', 'licenseNumber', 'contactPerson', 'phone']),
  async (req, res, next) => {
    try {
      const { ipAddress, userAgent } = getClientInfo(req);
      const user = await authService.registerLender(req.body, ipAddress, userAgent);

      res.status(201).json(formatSuccess({
        message: 'Lender account created successfully',
        user: {
          id: user.id,
          email: user.email,
          lenderName: user.lender_name,
          lenderType: user.lender_type,
          licenseNumber: user.license_number,
          contactPerson: user.contact_person,
          phone: user.phone,
          isVerified: user.is_verified,
          createdAt: user.created_at
        }
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/lender/login
 * Login Lender/NBFC user
 */
router.post('/lender/login',
  validateBody(['email', 'password']),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { ipAddress, userAgent } = getClientInfo(req);

      const result = await authService.loginLender(email, password, ipAddress, userAgent);

      res.json(formatSuccess({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          lenderName: result.user.lender_name,
          lenderType: result.user.lender_type,
          licenseNumber: result.user.license_number,
          contactPerson: result.user.contact_person,
          phone: result.user.phone,
          isVerified: result.user.is_verified,
          userType: 'LENDER'
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Regulator (Admin) Routes
// ============================================

/**
 * POST /api/auth/regulator/login
 * Login Regulator (Admin) user
 * Note: Registration is not allowed - admin account is pre-created
 */
router.post('/regulator/login',
  validateBody(['email', 'password']),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { ipAddress, userAgent } = getClientInfo(req);

      const result = await authService.loginRegulator(email, password, ipAddress, userAgent);

      res.json(formatSuccess({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.full_name,
          role: result.user.role,
          userType: 'REGULATOR'
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Common Routes
// ============================================

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout',
  validateBody(['refreshToken']),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const { ipAddress, userAgent } = getClientInfo(req);

      // Decode token to get user info
      const decoded = authService.verifyToken(refreshToken);
      
      if (decoded) {
        await authService.logout(refreshToken, decoded.id, decoded.userType, ipAddress, userAgent);
      }

      res.json(formatSuccess({
        message: 'Logout successful'
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  validateBody(['refreshToken']),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);

      res.json(formatSuccess({
        accessToken: result.accessToken
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/verify
 * Verify if access token is valid
 */
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(
        formatError('AUTHENTICATION_ERROR', 'Access token required')
      );
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json(
        formatError('AUTHENTICATION_ERROR', 'Invalid or expired token')
      );
    }

    res.json(formatSuccess({
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType,
        role: decoded.role
      }
    }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
