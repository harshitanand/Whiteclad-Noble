// src/routes/index.js - Main router with all routes including calls
const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const organizationRoutes = require('./organizations.routes');
const agentRoutes = require('./agents.routes');
const billingRoutes = require('./billing.routes');
const callRoutes = require('./calls.routes');
const { HTTP_STATUS } = require('../utils/constants');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected', // You could add actual health checks here
      redis: 'connected',
      livekit: 'configured'
    }
  });
});

// Detailed health check for monitoring systems
router.get('/health/detailed', async (req, res) => {
  try {
    const database = require('../config/database');
    const redisClient = require('../config/redis');
    
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: database.isHealthy() ? 'healthy' : 'unhealthy',
          connected: database.isHealthy()
        },
        redis: {
          status: redisClient.isHealthy() ? 'healthy' : 'unhealthy',
          connected: redisClient.isHealthy()
        },
        livekit: {
          status: process.env.LIVEKIT_API_KEY ? 'configured' : 'not_configured',
          serverUrl: process.env.LIVEKIT_SERVER_URL || 'not_set'
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    };

    // Overall health based on critical services
    const isCriticalServiceDown = !database.isHealthy() || !redisClient.isHealthy();
    if (isCriticalServiceDown) {
      healthStatus.status = 'DEGRADED';
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(healthStatus);
    }

    res.json(healthStatus);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API version info
router.get('/', (req, res) => {
  res.json({
    name: 'AI Agents Platform API',
    version: '1.0.0',
    description: 'Production-ready AI Agents SaaS Platform with Voice/Video Calling',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      organizations: '/api/v1/organizations',
      agents: '/api/v1/agents',
      billing: '/api/v1/billing',
      calls: '/api/v1/calls'
    },
    features: [
      'Multi-tenant Organization Management',
      'AI Agent Creation & Management',
      'Role-based Access Control',
      'Stripe Billing Integration',
      'LiveKit Voice/Video Calls',
      'Audit Logging',
      'Rate Limiting',
      'Comprehensive Analytics'
    ]
  });
});

// Route handlers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/agents', agentRoutes);
router.use('/billing', billingRoutes);
router.use('/calls', callRoutes); // ← NEW: LiveKit call dispatch routes

// API status endpoint for quick checks
router.get('/status', (req, res) => {
  res.json({
    api: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Ping endpoint for load balancer health checks
router.get('/ping', (req, res) => {
  res.send('pong');
});

module.exports = router;
