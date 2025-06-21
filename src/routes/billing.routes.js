const express = require('express');
const BillingController = require('../controllers/billing.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const { validateBody, validateQuery } = require('../middleware/validation.middleware');
const Joi = require('joi');
const router = express.Router();

// Webhook endpoint (no auth required)
router.post('/webhook', express.raw({ type: 'application/json' }), BillingController.handleWebhook);

// Protected routes
router.use(requireAuth);
router.use(requireOrganization);

// Subscription management
router.post('/subscription', 
  validateBody(Joi.object({
    priceId: Joi.string().required(),
    paymentMethodId: Joi.string().required()
  })),
  BillingController.createSubscription
);

router.put('/subscription',
  validateBody(Joi.object({
    priceId: Joi.string().required()
  })),
  BillingController.updateSubscription
);

router.delete('/subscription',
  validateBody(Joi.object({
    cancelAtPeriodEnd: Joi.boolean().default(true)
  })),
  BillingController.cancelSubscription
);

// Billing portal
router.get('/portal',
  validateQuery(Joi.object({
    returnUrl: Joi.string().uri().required()
  })),
  BillingController.getBillingPortal
);

module.exports = router;
