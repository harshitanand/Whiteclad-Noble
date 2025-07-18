const express = require('express');
const Joi = require('joi');
const AuthController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validation.middleware');
const { userSchemas } = require('../utils/validation');

const router = express.Router();

// Webhook endpoint (no auth required)
router.post('/webhook', AuthController.handleWebhook);

router.post(
  '/create-user',
  validateBody(
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      role: Joi.string()
        .valid('super_admin', 'org:admin', 'team_lead', 'agent_creator', 'org:member')
        .default('org:member'),
      organizationId: Joi.string().optional(),
    })
  ),
  AuthController.createClerkUser
);

router.post(
  '/session',
  validateBody(
    Joi.object({
      sessionToken: Joi.string().required(),
    })
  ),
  AuthController.exchangeSession
);

router.post(
  '/generate-signin-token',
  validateBody(
    Joi.object({
      userId: Joi.string().required(),
    })
  ),
  AuthController.generateSignInToken
);

router.post(
  '/create-organization',
  validateBody(
    Joi.object({
      name: Joi.string().required(),
      slug: Joi.string().required(),
      createdBy: Joi.string().required(),
    })
  ),
  AuthController.createTestOrganization
);

// Protected routes
router.use(requireAuth);

router
  .route('/profile')
  .get(AuthController.getProfile)
  .put(validateBody(userSchemas.update), AuthController.updateProfile);

module.exports = router;
