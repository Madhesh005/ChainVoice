/**
 * Authentication Controller
 * Handles HTTP requests for authentication
 */

const authService = require('../services/authService');

class AuthController {
  /**
   * Register MSME user
   * POST /api/auth/msme/register
   */
  async registerMSME(req, res) {
    try {
      const user = await authService.registerMSME(req.body);

      res.status(201).json({
        success: true,
        message: 'MSME account created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'REGISTRATION_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Login MSME user
   * POST /api/auth/msme/login
   */
  async loginMSME(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginMSME(email, password);

      res.json({
        success: true,
        token: result.token,
        user: {
          id: result.user.id,
          company_name: result.user.company_name,
          email: result.user.email
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }
  }

  /**
   * Register Lender user
   * POST /api/auth/lender/register
   */
  async registerLender(req, res) {
    try {
      const user = await authService.registerLender(req.body);

      res.status(201).json({
        success: true,
        message: 'Lender registered successfully',
        data: {
          id: user.id,
          institution_name: user.institution_name,
          contact_person: user.contact_person,
          email: user.email,
          phone: user.phone,
          license_number: user.license_number,
          created_at: user.created_at
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'REGISTRATION_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Login Lender user
   * POST /api/auth/lender/login
   */
  async loginLender(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginLender(email, password);

      res.json({
        success: true,
        token: result.token,
        user: {
          id: result.user.id,
          institution_name: result.user.institution_name,
          email: result.user.email,
          role: 'lender'
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'AUTH_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Login Admin (Regulator)
   * POST /api/auth/admin/login
   */
  async loginAdmin(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginAdmin(email, password);

      res.json({
        success: true,
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: 'admin'
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'AUTH_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Verify token
   * GET /api/auth/verify
   */
  async verifyToken(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'AUTH_REQUIRED',
          message: 'Access token required'
        });
      }

      const decoded = authService.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'AUTH_FAILED',
          message: 'Invalid or expired token'
        });
      }

      // Get user details
      const user = await authService.getUserById(decoded.userId, decoded.role);

      res.json({
        success: true,
        valid: true,
        user: {
          id: decoded.userId,
          role: decoded.role,
          ...user
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'AUTH_FAILED',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();
