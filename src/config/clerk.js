const { clerkClient } = require('@clerk/clerk-sdk-node');
const config = require('./index');
const logger = require('./logger');

class ClerkConfig {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.webhookSecret = config.clerk.webhookSecret;
    this.publishableKey = config.clerk.publishableKey;
    this.secretKey = config.clerk.secretKey;
  }

  /**
   * Initialize Clerk client
   */
  initialize() {
    try {
      if (this.isInitialized) {
        logger.warn('Clerk client already initialized');
        return this.client;
      }

      // Validate required configuration
      this.validateConfig();

      // Initialize Clerk client with configuration
      this.client = clerkClient;
      this.isInitialized = true;

      logger.info('Clerk client initialized successfully', {
        publishableKey: `${this.publishableKey.substring(0, 20)}...`,
        environment: this.getEnvironment(),
      });

      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Clerk client:', error);
      throw error;
    }
  }

  /**
   * Validate Clerk configuration
   */
  validateConfig() {
    const requiredFields = [
      { key: 'publishableKey', value: this.publishableKey },
      { key: 'secretKey', value: this.secretKey },
      { key: 'webhookSecret', value: this.webhookSecret },
    ];

    const missingFields = requiredFields.filter((field) => !field.value).map((field) => field.key);

    if (missingFields.length > 0) {
      throw new Error(`Missing required Clerk configuration: ${missingFields.join(', ')}`);
    }

    // Validate key formats
    if (!this.publishableKey.startsWith('pk_')) {
      throw new Error('Invalid Clerk publishable key format');
    }

    if (!this.secretKey.startsWith('sk_')) {
      throw new Error('Invalid Clerk secret key format');
    }

    if (!this.webhookSecret.startsWith('whsec_')) {
      throw new Error('Invalid Clerk webhook secret format');
    }
  }

  /**
   * Get Clerk environment (test/live)
   */
  getEnvironment() {
    return this.publishableKey.includes('_test_') ? 'test' : 'live';
  }

  /**
   * Get initialized Clerk client
   */
  getClient() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.client;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, headers) {
    try {
      const { Webhook } = require('svix');
      const webhook = new Webhook(this.webhookSecret);

      return webhook.verify(payload, headers);
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get user by ID with error handling
   */
  async getUser(userId) {
    try {
      const client = this.getClient();
      return await client.users.getUser(userId);
    } catch (error) {
      logger.error(`Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get organization by ID with error handling
   */
  async getOrganization(organizationId) {
    try {
      const client = this.getClient();
      return await client.organizations.getOrganization(organizationId);
    } catch (error) {
      logger.error(`Failed to get organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Get organization membership
   */
  async getOrganizationMembership(organizationId, userId) {
    try {
      const client = this.getClient();
      return await client.organizations.getOrganizationMembership({
        organizationId,
        userId,
      });
    } catch (error) {
      logger.error(`Failed to get membership for user ${userId} in org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * List organization members
   */
  async getOrganizationMembers(organizationId, options = {}) {
    try {
      const client = this.getClient();
      const { limit = 20, offset = 0 } = options;

      return await client.organizations.getOrganizationMembershipList({
        organizationId,
        limit,
        offset,
      });
    } catch (error) {
      logger.error(`Failed to get members for organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Create organization invitation
   */
  async createOrganizationInvitation(organizationId, invitationData) {
    try {
      const client = this.getClient();
      return await client.organizations.createOrganizationInvitation({
        organizationId,
        ...invitationData,
      });
    } catch (error) {
      logger.error(`Failed to create invitation for organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Update organization membership role
   */
  async updateOrganizationMembership(organizationId, userId, role) {
    try {
      const client = this.getClient();
      return await client.organizations.updateOrganizationMembership({
        organizationId,
        userId,
        role,
      });
    } catch (error) {
      logger.error(
        `Failed to update membership for user ${userId} in org ${organizationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Remove user from organization
   */
  async removeOrganizationMember(organizationId, userId) {
    try {
      const client = this.getClient();
      return await client.organizations.deleteOrganizationMembership({
        organizationId,
        userId,
      });
    } catch (error) {
      logger.error(`Failed to remove user ${userId} from organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Ban user
   */
  async banUser(userId) {
    try {
      const client = this.getClient();
      return await client.users.banUser(userId);
    } catch (error) {
      logger.error(`Failed to ban user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unban user
   */
  async unbanUser(userId) {
    try {
      const client = this.getClient();
      return await client.users.unbanUser(userId);
    } catch (error) {
      logger.error(`Failed to unban user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    try {
      const client = this.getClient();
      return await client.sessions.getSessionList({ userId });
    } catch (error) {
      logger.error(`Failed to get sessions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Revoke user session
   */
  async revokeSession(sessionId) {
    try {
      const client = this.getClient();
      return await client.sessions.revokeSession(sessionId);
    } catch (error) {
      logger.error(`Failed to revoke session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Create organization
   */
  async createOrganization(organizationData) {
    try {
      const client = this.getClient();
      return await client.organizations.createOrganization(organizationData);
    } catch (error) {
      logger.error('Failed to create organization:', error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId, updateData) {
    try {
      const client = this.getClient();
      return await client.organizations.updateOrganization(organizationId, updateData);
    } catch (error) {
      logger.error(`Failed to update organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId) {
    try {
      const client = this.getClient();
      return await client.organizations.deleteOrganization(organizationId);
    } catch (error) {
      logger.error(`Failed to delete organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(userId, metadata) {
    try {
      const client = this.getClient();
      return await client.users.updateUser(userId, {
        publicMetadata: metadata.public || {},
        privateMetadata: metadata.private || {},
        unsafeMetadata: metadata.unsafe || {},
      });
    } catch (error) {
      logger.error(`Failed to update metadata for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for Clerk service
   */
  async healthCheck() {
    try {
      const client = this.getClient();
      // Try to list organizations as a health check
      await client.organizations.getOrganizationList({ limit: 1 });
      return {
        status: 'healthy',
        environment: this.getEnvironment(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Clerk health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        environment: this.getEnvironment(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get Clerk configuration info (safe for logging)
   */
  getConfigInfo() {
    return {
      environment: this.getEnvironment(),
      isInitialized: this.isInitialized,
      hasPublishableKey: !!this.publishableKey,
      hasSecretKey: !!this.secretKey,
      hasWebhookSecret: !!this.webhookSecret,
      publishableKeyPrefix: this.publishableKey
        ? `${this.publishableKey.substring(0, 10)}...`
        : null,
    };
  }
}

// Create singleton instance
const clerkConfig = new ClerkConfig();

// Export both the class and instance
module.exports = clerkConfig;
module.exports.ClerkConfig = ClerkConfig;

// Auto-initialize if in production
if (config.isProduction) {
  try {
    clerkConfig.initialize();
  } catch (error) {
    logger.error('Failed to auto-initialize Clerk in production:', error);
  }
}
