const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validation.middleware');
const { userSchemas } = require('../utils/validation');
const router = express.Router();

// Webhook endpoint (no auth required)
router.post('/webhook', AuthController.handleWebhook);

// Protected routes
router.use(requireAuth);

router
  .route('/profile')
  .get(AuthController.getProfile)
  .put(
    validateBody(userSchemas.update),
    AuthController.updateProfile
  );

module.exports = router;

// src/routes/index.js - Main router
const express = require('express');
const authRoutes = require('./auth.routes');
const organizationRoutes = require('./organizations.routes');
const agentRoutes = require('./agents.routes');
const billingRoutes = require('./billing.routes');
const { HTTP_STATUS } = require('../utils/constants');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API version info
router.get('/', (req, res) => {
  res.json({
    name: 'AI Agents Platform API',
    version: '1.0.0',
    description: 'Production-ready AI Agents SaaS Platform',
    documentation: '/api-docs'
  });
});

// Route handlers
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/agents', agentRoutes);
router.use('/billing', billingRoutes);

module.exports = router;
