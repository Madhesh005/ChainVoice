/**
 * Authentication Middleware
 * Protects routes and verifies JWT tokens
 */

const authService = require('../services/authService');

/**
 * Authenticate JWT token and extract user info
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Access token required'
    });
  }

  const decoded = authService.verifyToken(token);

  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: 'AUTH_FAILED',
      message: 'Invalid or expired token'
    });
  }

  try {
    // Get full user details including email
    const UserModels = require('../models/userModels');
    let userDetails = null;

    if (decoded.role === 'msme') {
      userDetails = await UserModels.findMSMEById(decoded.userId);
    } else if (decoded.role === 'lender') {
      userDetails = await UserModels.findLenderById(decoded.userId);
    } else if (decoded.role === 'admin') {
      userDetails = await UserModels.findRegulatorById(decoded.userId);
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      email: userDetails ? userDetails.email : null,
      details: userDetails
    };

    next();
  } catch (error) {
    console.error('Error fetching user details:', error);
    return res.status(500).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Failed to authenticate user'
    });
  }
}

/**
 * Require specific role
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: `Access restricted to ${allowedRoles.join(', ')} users`
      });
    }

    next();
  };
}

/**
 * Require MSME role
 */
function requireMSME(req, res, next) {
  return requireRole('msme')(req, res, next);
}

/**
 * Require Lender role
 */
function requireLender(req, res, next) {
  return requireRole('lender')(req, res, next);
}

/**
 * Require Admin role
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Verify resource ownership for MSME
 * Ensures MSME can only access their own data
 */
function verifyMSMEOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  // Admin can access all resources
  if (req.user.role === 'admin') {
    return next();
  }

  // For MSME users, ensure they're accessing their own data
  if (req.user.role === 'msme') {
    // The msmeId will be set from req.user.id in the controller
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'PERMISSION_DENIED',
    message: 'Access denied'
  });
}

module.exports = {
  authenticate,
  requireRole,
  requireMSME,
  requireLender,
  requireAdmin,
  verifyMSMEOwnership
};
