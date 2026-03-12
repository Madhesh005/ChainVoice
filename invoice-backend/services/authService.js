/**
 * Authentication Service
 * Handles user registration and login logic
 */

const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../utils/passwordUtil');
const userModels = require('../models/userModels');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(userId, role) {
    return jwt.sign(
      { userId, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Register MSME user
   */
  async registerMSME(userData) {
    const { company_name, contact_person, email, phone, gstin, password } = userData;

    // Validate required fields
    if (!company_name || !contact_person || !email || !phone || !gstin || !password) {
      throw new Error('All fields are required');
    }

    // Check if email already exists
    const existingUser = await userModels.findMSMEByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await userModels.createMSMEUser({
      company_name,
      contact_person,
      email,
      phone,
      gstin,
      password_hash
    });

    return user;
  }

  /**
   * Login MSME user
   */
  async loginMSME(email, password) {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user
    const user = await userModels.findMSMEByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user.id, 'msme');

    // Remove password hash from response
    delete user.password_hash;

    return { user, token };
  }

  /**
   * Register Lender user
   */
  async registerLender(userData) {
    const { institution_name, contact_person, email, phone, license_number, password } = userData;

    // Validate required fields
    if (!institution_name || !contact_person || !email || !phone || !license_number || !password) {
      throw new Error('All fields are required');
    }

    // Check if email already exists
    const existingUser = await userModels.findLenderByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await userModels.createLenderUser({
      institution_name,
      contact_person,
      email,
      phone,
      license_number,
      password_hash
    });

    return user;
  }

  /**
   * Login Lender user
   */
  async loginLender(email, password) {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user
    const user = await userModels.findLenderByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user.id, 'lender');

    // Remove password hash from response
    delete user.password_hash;

    return { user, token };
  }

  /**
   * Login Regulator (Admin)
   */
  async loginAdmin(email, password) {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find admin
    const admin = await userModels.findRegulatorByEmail(email);
    if (!admin) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isValidPassword = await comparePassword(password, admin.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(admin.id, 'admin');

    // Remove password hash from response
    delete admin.password_hash;

    return { user: admin, token };
  }

  /**
   * Get user by ID and role
   */
  async getUserById(userId, role) {
    if (role === 'msme') {
      return await userModels.findMSMEById(userId);
    } else if (role === 'lender') {
      return await userModels.findLenderById(userId);
    } else if (role === 'admin') {
      return await userModels.findRegulatorById(userId);
    }
    return null;
  }
}

module.exports = new AuthService();
