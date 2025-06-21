const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');
const { RateLimitError } = require('../utils/errors');
const config = require('../config');

// Create Redis store for rate limiting
const store = new RedisStore({
  sendCommand: (...args) => redisClient.getClient().call(...args)
});

// Default rate limiter
const defaultLimiter = rateLimit({
  store,
  windowMs: config.security.rateLimiting.windowMs,
  max: config.security.rateLimiting.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.security.rateLimiting.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new RateLimitError('Rate limit exceeded');
  }
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    throw new RateLimitError('Authentication rate limit exceeded');
  }
});

// API rate limiter based on user/organization
const apiLimiter = rateLimit({
  store,
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.auth?.userId || req.ip;
  },
  handler: (req, res) => {
    throw new RateLimitError('API rate limit exceeded');
  }
});

// Chat/AI endpoint limiter
const aiLimiter = rateLimit({
  store,
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute
  keyGenerator: (req) => {
    return req.auth?.orgId || req.ip;
  },
  handler: (req, res) => {
    throw new RateLimitError('AI API rate limit exceeded');
  }
});

module.exports = {
  defaultLimiter,
  authLimiter,
  apiLimiter,
  aiLimiter
};

