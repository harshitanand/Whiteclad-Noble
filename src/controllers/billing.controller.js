const BillingService = require('../services/billing.service');
const { catchAsync } = require('../middleware/error.middleware.js');
const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class BillingController {
  /**
   * Create subscription
   */
  static createSubscription = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { priceId, paymentMethodId } = req.body;

    const result = await BillingService.createSubscription(orgId, priceId, paymentMethodId);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Subscription created successfully',
      data: result,
    });
  });

  /**
   * Update subscription
   */
  static updateSubscription = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { priceId } = req.body;

    const subscription = await BillingService.updateSubscription(orgId, priceId);

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: { subscription },
    });
  });

  /**
   * Cancel subscription
   */
  static cancelSubscription = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { cancelAtPeriodEnd = true } = req.body;

    const subscription = await BillingService.cancelSubscription(orgId, cancelAtPeriodEnd);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: { subscription },
    });
  });

  /**
   * Get billing portal URL
   */
  static getBillingPortal = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { returnUrl } = req.query;

    const url = await BillingService.getBillingPortalUrl(orgId, returnUrl);

    res.json({
      success: true,
      data: { url },
    });
  });

  /**
   * Handle Stripe webhooks
   */
  static handleWebhook = catchAsync(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const { stripe } = require('../config');

    let event;
    try {
      event = require('stripe').webhooks.constructEvent(req.body, signature, stripe.webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await BillingService.handleWebhook(event);

    res.json({ received: true });
  });
}

module.exports = BillingController;
