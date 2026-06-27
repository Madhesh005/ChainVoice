/**
 * Blockchain Configuration Module
 * 
 * Centralized configuration management for Hyperledger Fabric connection.
 * Supports Windows, WSL, and Linux environments.
 * 
 * @module config
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

/**
 * Normalizes path for cross-platform compatibility
 * @param {string} inputPath - The path to normalize
 * @returns {string} Normalized absolute path
 */
function normalizePath(inputPath) {
  if (!inputPath) return null;
  
  // Handle WSL paths (/mnt/d/...)
  if (inputPath.startsWith('/mnt/')) {
    return inputPath;
  }
  
  // Handle Windows paths (D:\... or D:/...)
  if (/^[A-Za-z]:/.test(inputPath)) {
    return path.resolve(inputPath);
  }
  
  // Handle relative paths
  if (!path.isAbsolute(inputPath)) {
    return path.resolve(__dirname, inputPath);
  }
  
  return path.resolve(inputPath);
}

/**
 * Validates that a required configuration value exists
 * @param {string} key - Configuration key name
 * @param {*} value - Configuration value
 * @throws {Error} If value is missing
 */
function validateRequired(key, value) {
  if (!value) {
    throw new Error(`Missing required configuration: ${key}`);
  }
}

/**
 * Validates that a file exists at the given path
 * @param {string} filePath - Path to validate
 * @param {string} description - Description for error message
 * @returns {boolean} True if file exists
 */
function validateFilePath(filePath, description) {
  if (!filePath) {
    console.warn(`⚠️  ${description} path not configured`);
    return false;
  }
  
  const normalized = normalizePath(filePath);
  if (!fs.existsSync(normalized)) {
    console.warn(`⚠️  ${description} not found at: ${normalized}`);
    return false;
  }
  
  return true;
}

// Load and validate configuration
const config = {
  // Network Paths
  fabricNetworkPath: normalizePath(process.env.FABRIC_NETWORK_PATH),
  connectionProfilePath: normalizePath(process.env.CONNECTION_PROFILE_PATH || './connection-org1.json'),
  
  // Channel and Chaincode
  channelName: process.env.CHANNEL_NAME || 'mychannel',
  chaincodeName: process.env.CHAINCODE_NAME || 'invoicecc',
  
  // Organization
  orgName: process.env.ORG_NAME || 'Org1',
  orgMspId: process.env.ORG_MSP_ID || 'Org1MSP',
  
  // Certificate Authority
  caURL: process.env.CA_URL || 'https://localhost:7054',
  caName: process.env.CA_NAME || 'ca-org1',
  
  // Admin Credentials
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'adminpw',
  
  // Application User
  appUser: process.env.APP_USER || 'appUser',
  
  // Wallet
  walletPath: normalizePath(process.env.WALLET_PATH || './wallet'),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  debug: process.env.DEBUG === 'true',
  
  // Timeouts (in milliseconds)
  connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '30') * 1000,
  transactionTimeout: parseInt(process.env.TRANSACTION_TIMEOUT || '60') * 1000,
};

/**
 * Validates the entire configuration
 * @throws {Error} If critical configuration is missing
 */
function validateConfig() {
  // Validate required fields
  validateRequired('CHANNEL_NAME', config.channelName);
  validateRequired('CHAINCODE_NAME', config.chaincodeName);
  validateRequired('ORG_MSP_ID', config.orgMspId);
  validateRequired('CA_URL', config.caURL);
  
  // Validate connection profile
  if (!validateFilePath(config.connectionProfilePath, 'Connection profile')) {
    throw new Error('Connection profile is required but not found');
  }
  
  return true;
}

/**
 * Gets the TLS CA certificate path for a peer
 * @param {string} peerName - Name of the peer
 * @returns {string} Path to the TLS CA certificate
 */
function getPeerTLSCertPath(peerName = 'peer0.org1.example.com') {
  if (!config.fabricNetworkPath) {
    throw new Error('FABRIC_NETWORK_PATH is not configured');
  }
  
  const orgDomain = peerName.split('.').slice(1).join('.');
  return path.join(
    config.fabricNetworkPath,
    'organizations',
    'peerOrganizations',
    orgDomain,
    'peers',
    peerName,
    'tls',
    'ca.crt'
  );
}

/**
 * Gets the CA TLS certificate path
 * @returns {string} Path to the CA TLS certificate
 */
function getCATLSCertPath() {
  if (!config.fabricNetworkPath) {
    throw new Error('FABRIC_NETWORK_PATH is not configured');
  }
  
  return path.join(
    config.fabricNetworkPath,
    'organizations',
    'peerOrganizations',
    'org1.example.com',
    'ca',
    'ca.org1.example.com-cert.pem'
  );
}

/**
 * Prints the current configuration (sanitized)
 */
function printConfig() {
  console.log('\n📋 Blockchain Configuration:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Channel Name:        ${config.channelName}`);
  console.log(`Chaincode Name:      ${config.chaincodeName}`);
  console.log(`Organization:        ${config.orgName} (${config.orgMspId})`);
  console.log(`CA URL:              ${config.caURL}`);
  console.log(`App User:            ${config.appUser}`);
  console.log(`Wallet Path:         ${config.walletPath}`);
  console.log(`Connection Profile:  ${config.connectionProfilePath}`);
  if (config.fabricNetworkPath) {
    console.log(`Fabric Network:      ${config.fabricNetworkPath}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

module.exports = {
  ...config,
  validateConfig,
  getPeerTLSCertPath,
  getCATLSCertPath,
  printConfig,
  normalizePath,
};
