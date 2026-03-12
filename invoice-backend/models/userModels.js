/**
 * User Models
 * Database operations for user management
 */

const db = require('../db');

class UserModels {
  /**
   * Create MSME user
   */
  async createMSMEUser(userData) {
    const { company_name, contact_person, email, phone, gstin, password_hash } = userData;
    
    const result = await db.query(
      `INSERT INTO msme_users (company_name, contact_person, email, phone, gstin, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_name, contact_person, email, phone, gstin, created_at`,
      [company_name, contact_person, email, phone, gstin, password_hash]
    );
    
    return result.rows[0];
  }

  /**
   * Find MSME user by email
   */
  async findMSMEByEmail(email) {
    const result = await db.query(
      'SELECT * FROM msme_users WHERE email = $1',
      [email]
    );
    
    return result.rows[0];
  }

  /**
   * Find MSME user by ID
   */
  async findMSMEById(id) {
    const result = await db.query(
      'SELECT id, company_name, contact_person, email, phone, gstin, created_at FROM msme_users WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  }

  /**
   * Create Lender user
   */
  async createLenderUser(userData) {
    const { institution_name, contact_person, email, phone, license_number, password_hash } = userData;
    
    const result = await db.query(
      `INSERT INTO lender_users (institution_name, contact_person, email, phone, license_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, institution_name, contact_person, email, phone, license_number, created_at`,
      [institution_name, contact_person, email, phone, license_number, password_hash]
    );
    
    return result.rows[0];
  }

  /**
   * Find Lender user by email
   */
  async findLenderByEmail(email) {
    const result = await db.query(
      'SELECT * FROM lender_users WHERE email = $1',
      [email]
    );
    
    return result.rows[0];
  }

  /**
   * Find Lender user by ID
   */
  async findLenderById(id) {
    const result = await db.query(
      'SELECT id, institution_name, contact_person, email, phone, license_number, created_at FROM lender_users WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  }

  /**
   * Create or update Regulator admin
   */
  async createRegulatorAdmin(email, password_hash) {
    const result = await db.query(
      `INSERT INTO regulator_admin (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) 
       DO UPDATE SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, created_at`,
      [email, password_hash]
    );
    
    return result.rows[0];
  }

  /**
   * Find Regulator admin by email
   */
  async findRegulatorByEmail(email) {
    const result = await db.query(
      'SELECT * FROM regulator_admin WHERE email = $1',
      [email]
    );
    
    return result.rows[0];
  }

  /**
   * Find Regulator admin by ID
   */
  async findRegulatorById(id) {
    const result = await db.query(
      'SELECT id, email, created_at FROM regulator_admin WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  }
}

module.exports = new UserModels();
