const Organization = require('../models/Organization');
const AuditLog = require('./AuditLog');
const PermissionService = require('./permission.service');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const { NotFoundError, AuthorizationError, ConflictError, PaymentRequiredError } = require('../utils/errors');
const { AUDIT_ACTIONS } = require('../utils/constants');
const config = require('../config');
const logger = require('../config/logger');

class OrganizationService {
  /**
   * Create organization in our database (called from webhook)
   */
  static async createOrganization(organizationData) {
    try {
      const organization = new Organization({
        clerkId: organizationData.id,
        name: organizationData.name,
        slug: organizationData.slug,
        plan: organizationData.public_metadata?.plan || 'free',
        limits: config.plans[organizationData.public_metadata?.plan || 'free']
      });
      
      await organization.save();
      
      logger.info('Organization created in database:', { 
        organizationId: organization.clerkId,
        name: organization.name 
      });
      
      return organization;
    } catch (error) {
      logger.error('Failed to create organization:', error);
      throw error;
    }
  }
  
  /**
   * Get organization by ID with permission check
   */
  static async getOrganization(clerkId, userId, userRole) {
    try {
      const organization = await Organization.findOne({ 
        clerkId, 
        isActive: true, 
        deletedAt: null 
      });
      
      if (!organization) {
        throw new NotFoundError('Organization');
      }
      
      // Check if user has access to this organization
      const membership = await clerkClient.organizations.getOrganizationMembership({
        organizationId: clerkId,
        userId
      });
      
      if (!membership) {
        throw new AuthorizationError('No access to this organization');
      }
      
      return {
        ...organization.toObject(),
        membership,
        permissions: PermissionService.getRolePermissions(userRole)
      };
    } catch (error) {
      logger.error('Failed to get organization:', error);
      throw error;
    }
  }
  
  /**
   * Update organization
   */
  static async updateOrganization(clerkId, updateData, userId, userRole) {
    try {
      // Check permission
      if (!PermissionService.hasPermission(userRole, 'org:update_settings')) {
        throw new AuthorizationError('Insufficient permissions to update organization');
      }
      
      const organization = await Organization.findOne({ 
        clerkId, 
        isActive: true, 
        deletedAt: null 
      });
      
      if (!organization) {
        throw new NotFoundError('Organization');
      }
      
      // Update organization in Clerk
      await clerkClient.organizations.updateOrganization(clerkId, {
        name: updateData.name,
        public_metadata: {
          ...organization.metadata,
          ...updateData.metadata
        }
      });
      
      // Update in our database
      Object.assign(organization, updateData);
      await organization.save();
      
      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.ORG_UPDATED,
        userId,
        organizationId: clerkId,
        resourceType: 'organization',
        resourceId: organization._id.toString(),
        details: updateData
      });
      
      logger.info('Organization updated:', { 
        organizationId: clerkId, 
        userId,
        changes: Object.keys(updateData)
      });
      
      return organization;
    } catch (error) {
      logger.error('Failed to update organization:', error);
      throw error;
    }
  }
  
  /**
   * Invite user to organization
   */
  static async inviteUser(organizationId, inviteData, inviterId, inviterRole) {
    try {
      // Check permission
      if (!PermissionService.hasPermission(inviterRole, 'org:invite')) {
        throw new AuthorizationError('Insufficient permissions to invite users');
      }
      
      // Check if inviter can assign this role
      if (!PermissionService.canAssignRole(inviterRole, inviteData.role)) {
        throw new AuthorizationError('Cannot assign role equal or higher than your own');
      }
      
      const organization = await Organization.findOne({ 
        clerkId: organizationId,
        isActive: true,
        deletedAt: null 
      });
      
      if (!organization) {
        throw new NotFoundError('Organization');
      }
      
      // Check member limits
      const memberLimits = organization.checkLimits('member');
      if (memberLimits.exceeded) {
        throw new PaymentRequiredError('Member limit exceeded for current plan');
      }
      
      // Send invitation via Clerk
      const invitation = await clerkClient.organizations.createOrganizationInvitation({
        organizationId,
        emailAddress: inviteData.email,
        role: inviteData.role,
        redirectUrl: `${config.app.frontendUrl}/accept-invitation`
      });
      
      // Increment member count (pending)
      await organization.incrementUsage('member');
      
      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.ORG_MEMBER_ADDED,
        userId: inviterId,
        organizationId,
        resourceType: 'organization',
        resourceId: organization._id.toString(),
        details: {
          invitedEmail: inviteData.email,
          role: inviteData.role,
          invitationId: invitation.id
        }
      });
      
      logger.info('User invited to organization:', {
        organizationId,
        invitedEmail: inviteData.email,
        role: inviteData.role,
        inviterId
      });
      
      return invitation;
    } catch (error) {
      logger.error('Failed to invite user:', error);
      throw error;
    }
  }
  
  /**
   * Remove member from organization
   */
  static async removeMember(organizationId, userId, removerId, removerRole) {
    try {
      // Check permission
      if (!PermissionService.hasPermission(removerRole, 'org:remove_member')) {
        throw new AuthorizationError('Insufficient permissions to remove members');
      }
      
      // Prevent self-removal
      if (userId === removerId) {
        throw new ConflictError('Cannot remove yourself from organization');
      }
      
      // Remove member via Clerk
      await clerkClient.organizations.deleteOrganizationMembership({
        organizationId,
        userId
      });
      
      // Update member count
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (organization) {
        organization.usage.memberCount = Math.max(0, organization.usage.memberCount - 1);
        await organization.save();
      }
      
      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.ORG_MEMBER_REMOVED,
        userId: removerId,
        organizationId,
        targetUserId: userId,
        resourceType: 'organization',
        resourceId: organization?._id?.toString(),
        details: { removedUserId: userId }
      });
      
      logger.info('Member removed from organization:', {
        organizationId,
        removedUserId: userId,
        removerId
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to remove member:', error);
      throw error;
    }
  }
  
  /**
   * Get organization usage statistics
   */
  static async getUsageStats(organizationId, userRole) {
    try {
      if (!PermissionService.hasPermission(userRole, 'org:analytics')) {
        throw new AuthorizationError('Insufficient permissions to view analytics');
      }
      
      const organization = await Organization.findOne({ 
        clerkId: organizationId,
        isActive: true,
        deletedAt: null 
      });
      
      if (!organization) {
        throw new NotFoundError('Organization');
      }
      
      return {
        current: organization.usage,
        limits: organization.limits,
        plan: organization.plan,
        utilization: {
          agents: organization.limits.maxAgents === -1 ? 0 : 
                   (organization.usage.agentCount / organization.limits.maxAgents) * 100,
          members: organization.limits.maxMembers === -1 ? 0 : 
                   (organization.usage.memberCount / organization.limits.maxMembers) * 100,
          apiCalls: organization.limits.apiCallsPerMonth === -1 ? 0 : 
                    (organization.usage.apiCallsThisMonth / organization.limits.apiCallsPerMonth) * 100
        }
      };
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      throw error;
    }
  }
}

module.exports = OrganizationService;
