const Stripe = require('stripe');
const Organization = require('../models/Organization');
const AuditLog = require('../models/AuditLog');
const { NotFoundError, PaymentRequiredError } = require('../utils/errors');
const { AUDIT_ACTIONS, SUBSCRIPTION_PLANS } = require('../utils/constants');
const config = require('../config');
const logger = require('../config/logger');

class BillingService {
  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey);
  }

  /**
   * Create Stripe customer
   */
  async createCustomer(organizationId, email, name) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          organizationId
        }
      });

      // Update organization with customer ID
      await Organization.findOneAndUpdate(
        { clerkId: organizationId },
        { 'subscription.stripeCustomerId': customer.id }
      );

      logger.info('Stripe customer created:', {
        customerId: customer.id,
        organizationId
      });

      return customer;
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(organizationId, priceId, paymentMethodId) {
    try {
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (!organization) {
        throw new NotFoundError('Organization');
      }

      let customerId = organization.subscription?.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await this.createCustomer(
          organizationId,
          `billing@${organization.slug}.com`,
          organization.name
        );
        customerId = customer.id;
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      // Set as default payment method
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organizationId
        }
      });

      // Update organization subscription
      const planName = this.getPlanNameFromPrice(priceId);
      await this.updateOrganizationSubscription(organizationId, subscription, planName);

      logger.info('Subscription created:', {
        subscriptionId: subscription.id,
        organizationId,
        plan: planName
      });

      return {
        subscription,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      };
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(organizationId, newPriceId) {
    try {
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (!organization?.subscription?.stripeSubscriptionId) {
        throw new NotFoundError('Subscription');
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        organization.subscription.stripeSubscriptionId
      );

      // Update subscription item
      await this.stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'create_prorations'
      });

      // Update organization
      const planName = this.getPlanNameFromPrice(newPriceId);
      await this.updateOrganizationPlan(organizationId, planName);

      logger.info('Subscription updated:', {
        subscriptionId: subscription.id,
        organizationId,
        newPlan: planName
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to update subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId, cancelAtPeriodEnd = true) {
    try {
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (!organization?.subscription?.stripeSubscriptionId) {
        throw new NotFoundError('Subscription');
      }

      let subscription;
      if (cancelAtPeriodEnd) {
        subscription = await this.stripe.subscriptions.update(
          organization.subscription.stripeSubscriptionId,
          { cancel_at_period_end: true }
        );
      } else {
        subscription = await this.stripe.subscriptions.cancel(
          organization.subscription.stripeSubscriptionId
        );
      }

      // Update organization
      await Organization.findOneAndUpdate(
        { clerkId: organizationId },
        { 
          'subscription.cancelAtPeriodEnd': cancelAtPeriodEnd,
          ...(subscription.status === 'canceled' && { plan: SUBSCRIPTION_PLANS.FREE })
        }
      );

      logger.info('Subscription cancelled:', {
        subscriptionId: subscription.id,
        organizationId,
        cancelAtPeriodEnd
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(event) {
    try {
      logger.info('Processing Stripe webhook:', { type: event.type });

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          logger.warn('Unhandled webhook event:', event.type);
      }
    } catch (error) {
      logger.error('Webhook handling failed:', error);
      throw error;
    }
  }

  async handleSubscriptionUpdate(subscription) {
    const organizationId = subscription.metadata.organizationId;
    if (!organizationId) return;

    const planName = this.getPlanNameFromPrice(subscription.items.data[0].price.id);
    await this.updateOrganizationSubscription(organizationId, subscription, planName);
  }

  async handleSubscriptionDeleted(subscription) {
    const organizationId = subscription.metadata.organizationId;
    if (!organizationId) return;

    await this.updateOrganizationPlan(organizationId, SUBSCRIPTION_PLANS.FREE);
  }

  async handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;
    const organization = await Organization.findOne({ 
      'subscription.stripeCustomerId': customerId 
    });

    if (organization) {
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
        userId: null,
        organizationId: organization.clerkId,
        resourceType: 'subscription',
        details: {
          event: 'payment_succeeded',
          amount: invoice.amount_paid,
          currency: invoice.currency
        }
      });
    }
  }

  async handlePaymentFailed(invoice) {
    const customerId = invoice.customer;
    const organization = await Organization.findOne({ 
      'subscription.stripeCustomerId': customerId 
    });

    if (organization) {
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
        userId: null,
        organizationId: organization.clerkId,
        resourceType: 'subscription',
        details: {
          event: 'payment_failed',
          amount: invoice.amount_due,
          currency: invoice.currency
        }
      });
    }
  }

  async updateOrganizationSubscription(organizationId, subscription, planName) {
    await Organization.findOneAndUpdate(
      { clerkId: organizationId },
      {
        plan: planName,
        'subscription.stripeSubscriptionId': subscription.id,
        'subscription.status': subscription.status,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
        'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
        limits: config.plans[planName]
      }
    );
  }

  async updateOrganizationPlan(organizationId, planName) {
    await Organization.findOneAndUpdate(
      { clerkId: organizationId },
      {
        plan: planName,
        limits: config.plans[planName]
      }
    );
  }

  getPlanNameFromPrice(priceId) {
    const priceMapping = {
      [config.stripe.plans.free]: SUBSCRIPTION_PLANS.FREE,
      [config.stripe.plans.pro]: SUBSCRIPTION_PLANS.PRO,
      [config.stripe.plans.enterprise]: SUBSCRIPTION_PLANS.ENTERPRISE
    };
    return priceMapping[priceId] || SUBSCRIPTION_PLANS.FREE;
  }

  /**
   * Get billing dashboard URL
   */
  async getBillingPortalUrl(organizationId, returnUrl) {
    try {
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (!organization?.subscription?.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: organization.subscription.stripeCustomerId,
        return_url: returnUrl
      });

      return session.url;
    } catch (error) {
      logger.error('Failed to create billing portal session:', error);
      throw error;
    }
  }
}

module.exports = new BillingService();
