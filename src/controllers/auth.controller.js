const UserService = require('../services/user.service');
const AuditLog = require('../models/AuditLog');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS, AUDIT_ACTIONS } = require('../utils/constants');
const { createResponse } = require('../utils/helpers');
const logger = require('../config/logger');

class AuthController {
  /**
   * Handle Clerk webhooks
   */
  static handleWebhook = catchAsync(async (req, res) => {
    const { type, data } = req.body;

    logger.info('Webhook received:', { type, userId: data.id });

    switch (type) {
      case 'user.created':
        await AuthController.handleUserCreated(data);
        break;
      case 'user.updated':
        await AuthController.handleUserUpdated(data);
        break;
      case 'user.deleted':
        await AuthController.handleUserDeleted(data);
        break;
      case 'organization.created':
        await AuthController.handleOrganizationCreated(data);
        break;
      case 'organizationMembership.created':
        await AuthController.handleMembershipCreated(data);
        break;
      case 'organizationMembership.deleted':
        await AuthController.handleMembershipDeleted(data);
        break;
      case 'session.created':
        await AuthController.handleSessionCreated(data);
        break;
      case 'session.ended':
        await AuthController.handleSessionEnded(data);
        break;
      default:
        logger.warn('Unhandled webhook type:', type);
    }

    res.json({ received: true });
  });

  /**
   * Handle user created webhook
   */
  static async handleUserCreated(userData) {
    try {
      await UserService.createUser({
        clerkId: userData.id,
        email: userData.email_addresses[0]?.email_address,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatar: userData.image_url,
      });

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_CREATED,
        userId: userData.id,
        resourceType: 'user',
        resourceId: userData.id,
        details: {
          email: userData.email_addresses[0]?.email_address,
          signUpMethod: userData.external_accounts?.[0]?.provider || 'email',
        },
      });

      logger.info('User created successfully:', userData.id);
    } catch (error) {
      logger.error('Failed to handle user created webhook:', error);
    }
  }

  /**
   * Handle user updated webhook
   */
  static async handleUserUpdated(userData) {
    try {
      await UserService.updateUser(userData.id, {
        email: userData.email_addresses[0]?.email_address,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatar: userData.image_url,
      });

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_UPDATED,
        userId: userData.id,
        resourceType: 'user',
        resourceId: userData.id,
        details: { updatedFields: ['profile'] },
      });

      logger.info('User updated successfully:', userData.id);
    } catch (error) {
      logger.error('Failed to handle user updated webhook:', error);
    }
  }

  /**
   * Handle user deleted webhook
   */
  static async handleUserDeleted(userData) {
    try {
      await UserService.deleteUser(userData.id);

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_DELETED,
        userId: userData.id,
        resourceType: 'user',
        resourceId: userData.id,
        details: { deletedAt: new Date() },
      });

      logger.info('User deleted successfully:', userData.id);
    } catch (error) {
      logger.error('Failed to handle user deleted webhook:', error);
    }
  }

  /**
   * Handle organization created webhook
   */
  static async handleOrganizationCreated(orgData) {
    try {
      const OrganizationService = require('../services/organization.service');
      await OrganizationService.createOrganization(orgData);

      logger.info('Organization created successfully:', orgData.id);
    } catch (error) {
      logger.error('Failed to handle organization created webhook:', error);
    }
  }

  /**
   * Handle membership created webhook
   */
  static async handleMembershipCreated(membershipData) {
    try {
      // Update member count in organization
      const Organization = require('../models/Organization');
      await Organization.findOneAndUpdate(
        { clerkId: membershipData.organization.id },
        { $inc: { 'usage.memberCount': 1 } }
      );

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.ORG_MEMBER_ADDED,
        userId: membershipData.public_user_data.user_id,
        organizationId: membershipData.organization.id,
        resourceType: 'organization',
        details: {
          role: membershipData.role,
          joinedAt: new Date(),
        },
      });

      logger.info('Membership created successfully:', {
        orgId: membershipData.organization.id,
        userId: membershipData.public_user_data.user_id,
      });
    } catch (error) {
      logger.error('Failed to handle membership created webhook:', error);
    }
  }

  /**
   * Handle membership deleted webhook
   */
  static async handleMembershipDeleted(membershipData) {
    try {
      // Update member count in organization
      const Organization = require('../models/Organization');
      await Organization.findOneAndUpdate(
        { clerkId: membershipData.organization.id },
        { $inc: { 'usage.memberCount': -1 } }
      );

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.ORG_MEMBER_REMOVED,
        userId: membershipData.public_user_data.user_id,
        organizationId: membershipData.organization.id,
        resourceType: 'organization',
        details: {
          leftAt: new Date(),
        },
      });

      logger.info('Membership deleted successfully:', {
        orgId: membershipData.organization.id,
        userId: membershipData.public_user_data.user_id,
      });
    } catch (error) {
      logger.error('Failed to handle membership deleted webhook:', error);
    }
  }

  /**
   * Handle session created webhook
   */
  static async handleSessionCreated(sessionData) {
    try {
      await UserService.updateLastLogin(sessionData.user_id);

      logger.info('Session created:', {
        userId: sessionData.user_id,
        sessionId: sessionData.id,
      });
    } catch (error) {
      logger.error('Failed to handle session created webhook:', error);
    }
  }

  /**
   * Handle session ended webhook
   */
  static async handleSessionEnded(sessionData) {
    try {
      logger.info('Session ended:', {
        userId: sessionData.user_id,
        sessionId: sessionData.id,
      });
    } catch (error) {
      logger.error('Failed to handle session ended webhook:', error);
    }
  }

  /**
   * Get current user profile
   */
  static getProfile = catchAsync(async (req, res) => {
    const { userId } = req.auth;

    const user = await UserService.getUserById(userId);

    res.json({
      success: true,
      data: { user },
    });
  });

  /**
   * Update current user profile
   */
  static updateProfile = catchAsync(async (req, res) => {
    const { userId } = req.auth;

    const user = await UserService.updateUser(userId, req.body);

    logger.info('Profile updated:', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  });

  /**
   * Create Clerk user via API (for testing/admin purposes)
   * This creates a user but doesn't return a session token
   * POST /api/v1/auth/create-user
   */
  static createClerkUser = catchAsync(async (req, res) => {
    const { email, password, firstName, lastName, role = 'org:member', organizationId } = req.body;

    try {
      // Create user in Clerk
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        password,
        firstName,
        lastName,
        publicMetadata: {
          role,
          createdViaAPI: true,
        },
      });

      // Create user in our database
      const user = await UserService.createUser({
        clerkId: clerkUser.id,
        email,
        firstName,
        lastName,
        role,
      });

      // Add to organization if specified
      if (organizationId) {
        try {
          await clerkClient.organizations.createOrganizationMembership({
            organizationId,
            userId: clerkUser.id,
            role,
          });
        } catch (orgError) {
          logger.warn('Failed to add user to organization:', orgError);
        }
      }

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_CREATED,
        userId: clerkUser.id,
        resourceType: 'user',
        details: {
          email,
          createdViaAPI: true,
          organizationId,
        },
      });

      logger.info('User created via API:', {
        userId: clerkUser.id,
        email,
        organizationId,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'User created successfully. Use Clerk frontend SDK to sign in.',
        data: {
          user: {
            id: clerkUser.id,
            email,
            firstName,
            lastName,
            role,
          },
          instructions: {
            nextStep: "Use Clerk's frontend SDK to sign in and get a session token",
            signInUrl: process.env.FRONTEND_URL + '/sign-in',
            credentials: { email, password },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to create Clerk user:', error);

      if (error.errors && error.errors[0]?.code === 'form_identifier_exists') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      throw error;
    }
  });

  /**
   * Exchange Clerk session token for user info
   * This is what frontend would call after Clerk authentication
   * POST /api/v1/auth/session
   */
  static exchangeSession = catchAsync(async (req, res) => {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Session token is required',
      });
    }

    try {
      // Verify the session token with Clerk
      const session = await clerkClient.sessions.verifySession(sessionToken, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!session || session.status !== 'active') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid or expired session',
        });
      }

      // Get user details
      const clerkUser = await clerkClient.users.getUser(session.userId);

      // Get or create user in our database
      let user;
      try {
        user = await UserService.getUserById(clerkUser.id);
      } catch (error) {
        // If user doesn't exist in our DB, create them
        user = await UserService.createUser({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        });
      }

      // Get user's organizations
      const memberships = await clerkClient.users.getOrganizationMembershipList({
        userId: clerkUser.id,
      });

      const organizations = memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
        permissions: m.permissions,
      }));

      // Update last login
      await UserService.updateLastLogin(clerkUser.id);

      logger.info('Session exchanged successfully:', {
        userId: clerkUser.id,
        sessionId: session.id,
      });

      res.json({
        success: true,
        message: 'Session validated successfully',
        data: {
          user: {
            id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            role: user.role,
            organizations,
          },
          session: {
            id: session.id,
            status: session.status,
            lastActiveAt: session.lastActiveAt,
            expireAt: session.expireAt,
          },
        },
      });
    } catch (error) {
      logger.error('Session exchange failed:', error);

      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Session validation failed',
      });
    }
  });

  /**
   * Generate a sign-in token for testing (Clerk feature)
   * POST /api/v1/auth/generate-signin-token
   */
  static generateSignInToken = catchAsync(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required',
      });
    }

    try {
      // Generate a sign-in token using Clerk
      const signInToken = await clerkClient.signInTokens.createSignInToken({
        userId,
        expiresInSeconds: 3600, // 1 hour
      });

      const session = await clerkClient.sessions.createSession({
        userId,
        status: 'active',
      });

      // Step 2: Retrieve the session token (JWT)
      const jwt = await clerkClient.sessions.getToken({
        sessionId: session.id,
      });

      logger.info('Sign-in token generated:', { userId, tokenId: signInToken.id });

      res.json({
        success: true,
        message: 'Sign-in token generated successfully',
        data: {
          token: jwt || signInToken.token,
          url: signInToken.url,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          instructions: {
            usage:
              "Use this token with Clerk's signIn.create({ strategy: 'ticket', ticket: token })",
            frontendExample: `
                // In your frontend JavaScript:
                import { useSignIn } from '@clerk/clerk-react';
                
                const { signIn } = useSignIn();
                await signIn.create({
                  strategy: 'ticket',
                  ticket: '${signInToken.token}'
                });
              `,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to generate sign-in token:', error);
      throw error;
    }
  });

  /**
   * Create organization for testing
   * POST /api/v1/auth/create-organization
   */
  static createTestOrganization = catchAsync(async (req, res) => {
    const { name, slug, createdBy } = req.body;

    try {
      // Create organization in Clerk
      const organization = await clerkClient.organizations.createOrganization({
        name,
        slug,
        createdBy,
        publicMetadata: {
          plan: 'free',
          createdViaAPI: true,
        },
      });

      // Create in our database
      const Organization = require('../models/Organization');
      const org = new Organization({
        clerkId: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: 'free',
      });
      await org.save();

      logger.info('Organization created via API:', {
        orgId: organization.id,
        name,
        createdBy,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Organization created successfully',
        data: {
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            createdAt: organization.createdAt,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to create organization:', error);
      throw error;
    }
  });

  /**
   * Get current user from Clerk session (standard protected route)
   * GET /api/v1/auth/me
   */
  static getCurrentUser = catchAsync(async (req, res) => {
    // This relies on ClerkExpressRequireAuth middleware
    const { userId } = req.auth;

    const user = await UserService.getUserProfile(userId);

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: { user },
    });
  });
}

module.exports = AuthController;
