// src/utils/helpers.js - Utility functions (MISSING)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, config.security.bcryptRounds);
}

/**
 * Compare password
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateJWT(payload, expiresIn = '7d') {
  return jwt.sign(payload, config.app.jwtSecret, { expiresIn });
}

/**
 * Verify JWT token
 */
function verifyJWT(token) {
  return jwt.verify(token, config.app.jwtSecret);
}

/**
 * Sanitize object for logging (remove sensitive data)
 */
function sanitizeForLogging(obj) {
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...obj };
  
  function recursiveSanitize(item) {
    if (typeof item === 'object' && item !== null) {
      for (const key in item) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
          item[key] = '[REDACTED]';
        } else if (typeof item[key] === 'object') {
          recursiveSanitize(item[key]);
        }
      }
    }
  }
  
  recursiveSanitize(sanitized);
  return sanitized;
}

/**
 * Convert bytes to human readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    maxDelay = 10000
  } = options;
  
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      if (attempt >= retries) {
        throw error;
      }
      
      const currentDelay = Math.min(delay * Math.pow(backoff, attempt - 1), maxDelay);
      await sleep(currentDelay);
    }
  }
}

/**
 * Parse query parameters for pagination
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  const sort = query.sort || 'createdAt';
  const order = query.order === 'asc' ? 1 : -1;
  
  return {
    page,
    limit,
    skip,
    sort: { [sort]: order }
  };
}

/**
 * Create response object
 */
function createResponse(success, message, data = null, meta = null) {
  const response = { success };
  
  if (message) response.message = message;
  if (data) response.data = data;
  if (meta) response.meta = meta;
  
  return response;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate slug from string
 */
function generateSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

module.exports = {
  generateRandomString,
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  sanitizeForLogging,
  formatBytes,
  sleep,
  retry,
  parsePagination,
  createResponse,
  isValidEmail,
  generateSlug,
  deepMerge
};
