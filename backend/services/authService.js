/**
 * Authentication Service
 * 
 * Handles user registration, login, and authentication for:
 * - MSME users
 * - Lender/NBFC users
 * - Regulator/Admin users
 * 
 * Uses bcrypt for password hashing and JWT for token generation
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

class AuthService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(user, userType) {
    const payload = {
      id: user.id,
      email: user.email,
      userType: userType,
      role: user.role || userType
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user, userType) {
    const payload = {
      id: user.id,
      userType: userType,
      type: 'refresh'
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Create user session
   */
  async createSession(userId, userType, token, refreshToken, ipAddress, userAgent) {
    const tokenHash = await bcrypt.hash(token, 5); // Light hash for session
    const refreshTokenHash = refreshToken ? await bcrypt.hash(refreshToken, 5) : null;
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const result = await db.query(
      `INSERT INTO user_sessions 
       (user_id, user_type, token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, userType, tokenHash, refreshTokenHash, ipAddress, userAgent, expiresAt]
    );

    return result.rows[0].id;
  }

  /**
   * Delete user session (logout)
   */
  async deleteSession(userId, userType) {
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND user_type = $2',
      [userId, userType]
    );
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions() {
    await db.query('DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP');
  }

  // =====================================================
  // MSME User Methods
  // =====================================================

  /**
   * Register MSME user
   */
  async registerMSME(userData) {
    const {
      email,
      password,
      companyName,
      gstin,
      contactPerson,
      phone,
      address,
      city,
      state,
      pincode
    } = userData;

    // Check if email already exists
    const existing = await db.query(
      'SELECT id FROM msme_users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Insert user
    const result = await db.query(
      `INSERT INTO msme_users 
       (email, password_hash, company_name, gstin, contact_person, phone, address, city, state, pincode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email, company_name, gstin, is_verified, created_at`,
      [email, passwordHash, companyName, gstin, contactPerson, phone, address, city, state, pincode]
    );

    return result.rows[0];
  }

  /**
   * Login MSME user
   */
  async loginMSME(email, password, ipAddress, userAgent) {
    // Get user
    const result = await db.query(
      'SELECT * FROM msme_users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await this.comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.query(
      'UPDATE msme_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const token = this.generateToken(user, 'MSME');
    const refreshToken = this.generateRefreshToken(user, 'MSME');

    // Create session
    await this.createSession(user.id, 'MSME', token, refreshToken, ipAddress, userAgent);

    // Return user data (without password hash)
    delete user.password_hash;
    return {
      user,
      token,
      refreshToken
    };
  }

  // =====================================================
  // Lender User Methods
  // =====================================================

  /**
   * Register Lender user
   */
  async registerLender(userData) {
    const {
      email,
      password,
      lenderName,
      lenderType,
      licenseNumber,
      contactPerson,
      phone,
      address,
      city,
      state,
      pincode
    } = userData;

    // Validate lender type
    if (!['BANK', 'NBFC', 'FINTECH'].includes(lenderType)) {
      throw new Error('Invalid lender type. Must be BANK, NBFC, or FINTECH');
    }

    // Check if email already exists
    const existing = await db.query(
      'SELECT id FROM lender_users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Insert user
    const result = await db.query(
      `INSERT INTO lender_users 
       (email, password_hash, lender_name, lender_type, license_number, contact_person, phone, address, city, state, pincode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, email, lender_name, lender_type, is_verified, created_at`,
      [email, passwordHash, lenderName, lenderType, licenseNumber, contactPerson, phone, address, city, state, pincode]
    );

    return result.rows[0];
  }

  /**
   * Login Lender user
   */
  async loginLender(email, password, ipAddress, userAgent) {
    // Get user
    const result = await db.query(
      'SELECT * FROM lender_users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await this.comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.query(
      'UPDATE lender_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const token = this.generateToken(user, 'LENDER');
    const refreshToken = this.generateRefreshToken(user, 'LENDER');

    // Create session
    await this.createSession(user.id, 'LENDER', token, refreshToken, ipAddress, userAgent);

    // Return user data (without password hash)
    delete user.password_hash;
    return {
      user,
      token,
      refreshToken
    };
  }

  // =====================================================
  // Regulator/Admin Methods
  // =====================================================

  /**
   * Login Regulator/Admin user
   */
  async loginRegulator(email, password, ipAddress, userAgent) {
    // Get user
    const result = await db.query(
      'SELECT * FROM regulator_users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await this.comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.query(
      'UPDATE regulator_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const token = this.generateToken(user, 'REGULATOR');
    const refreshToken = this.generateRefreshToken(user, 'REGULATOR');

    // Create session
    await this.createSession(user.id, 'REGULATOR', token, refreshToken, ipAddress, userAgent);

    // Return user data (without password hash)
    delete user.password_hash;
    return {
      user,
      token,
      refreshToken
    };
  }

  // =====================================================
  // Common Methods
  // =====================================================

  /**
   * Logout user
   */
  async logout(userId, userType) {
    await this.deleteSession(userId, userType);
  }

  /**
   * Get user by ID and type
   */
  async getUserById(userId, userType) {
    let table;
    switch (userType) {
      case 'MSME':
        table = 'msme_users';
        break;
      case 'LENDER':
        table = 'lender_users';
        break;
      case 'REGULATOR':
        table = 'regulator_users';
        break;
      default:
        throw new Error('Invalid user type');
    }

    const result = await db.query(
      `SELECT * FROM ${table} WHERE id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    delete user.password_hash;
    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId, userType, oldPassword, newPassword) {
    let table;
    switch (userType) {
      case 'MSME':
        table = 'msme_users';
        break;
      case 'LENDER':
        table = 'lender_users';
        break;
      case 'REGULATOR':
        table = 'regulator_users';
        break;
      default:
        throw new Error('Invalid user type');
    }

    // Get current password hash
    const result = await db.query(
      `SELECT password_hash FROM ${table} WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await this.comparePassword(oldPassword, result.rows[0].password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    await db.query(
      `UPDATE ${table} SET password_hash = $1 WHERE id = $2`,
      [newPasswordHash, userId]
    );
  }
}

module.exports = new AuthService();
