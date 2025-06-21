const UserService = require('../services/user.service');
const AuditLog = require('../models/AuditLog');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS, AUDIT_ACTIONS } = require('../utils/constants');
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
        avatar: userData.image_url
      });
      
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_CREATED,
        userId: userData.id,
        resourceType: 'user',
        resourceId: userData.id,
        details: {
          email: userData.email_addresses[0]?.email_address,
          signUpMethod: userData.external_accounts?.[0]?.provider || 'email'
        }
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
        avatar: userData.image_url
      });
      
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_UPDATED,
        userId: userData.id,
        resourceType: 'user',
        resourceId: userData.id,
        details: { updatedFields: ['profile'] }
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
        details: { deletedAt: new Date() }
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
          joinedAt: new Date()
        }
      });
      
      logger.info('Membership created successfully:', {
        orgId: membershipData.organization.id,
        userId: membershipData.public_user_data.user_id
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
          leftAt: new Date()
        }
      });
      
      logger.info('Membership deleted successfully:', {
        orgId: membershipData.organization.id,
        userId: membershipData.public_user_data.user_id
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
        sessionId: sessionData.id
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
        sessionId: sessionData.id
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
      data: { user }
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
      data: { user }
    });
  });
}

module.exports = AuthController;
