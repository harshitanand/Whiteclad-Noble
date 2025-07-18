/* eslint-disable no-underscore-dangle */
const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { AUDIT_ACTIONS } = require('../utils/constants');
const logger = require('../config/logger');

class UserService {
  /**
   * Create user (called from webhook)
   */
  static async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findByClerkId(userData.clerkId);
      if (existingUser) {
        logger.warn('User already exists:', userData.clerkId);
        return existingUser;
      }

      const user = new User({
        clerkId: userData.clerkId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        avatar: userData.avatar,
      });

      await user.save();

      logger.info('User created successfully:', {
        userId: user.clerkId,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID
   */
  static async getUserById(clerkId) {
    try {
      const user = await User.findByClerkId(clerkId);

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async updateUser(clerkId, updateData) {
    try {
      const user = await User.findByClerkId(clerkId);

      if (!user) {
        throw new NotFoundError('User');
      }

      Object.assign(user, updateData);
      await user.save();

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_UPDATED,
        userId: clerkId,
        resourceType: 'user',
        resourceId: user._id.toString(),
        details: updateData,
      });

      logger.info('User updated:', { userId: clerkId });
      return user;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  static async deleteUser(clerkId) {
    try {
      const user = await User.findByClerkId(clerkId);

      if (!user) {
        throw new NotFoundError('User');
      }

      await user.softDelete();

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_DELETED,
        userId: clerkId,
        resourceType: 'user',
        resourceId: user._id.toString(),
        details: { deletedAt: new Date() },
      });

      logger.info('User deleted:', { userId: clerkId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Update last login
   */
  static async updateLastLogin(clerkId) {
    try {
      const user = await User.findByClerkId(clerkId);
      if (user) {
        await user.updateLastLogin();
      }
    } catch (error) {
      logger.error('Failed to update last login:', error);
    }
  }

  /**
   * Get user profile with organizations
   */
  static async getUserProfile(clerkId) {
    try {
      const user = await this.getUserById(clerkId);

      // Get user's organizations from Clerk
      const memberships = await clerkClient.users.getOrganizationMembershipList({
        userId: clerkId,
      });

      return {
        ...user.toObject(),
        organizations: memberships.data.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
          joinedAt: m.createdAt,
        })),
      };
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      throw error;
    }
  }

  // ======================================================================
  // ADDITIONAL METHODS FOR USER CONTROLLER
  // ======================================================================

  /**
   * Get users with filtering (admin/team lead)
   */
  static async getUsers(query, organizationId, userRole) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sort = 'createdAt',
        order = 'desc',
      } = query;

      // Build filter
      const filter = { deletedAt: null };

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      if (role) filter.role = role;
      if (status === 'active') filter.isActive = true;
      if (status === 'inactive') filter.isActive = false;

      const skip = (page - 1) * limit;
      const sortOrder = order === 'asc' ? 1 : -1;

      // If not super admin, only show users from same organization
      if (userRole !== 'super_admin' && organizationId) {
        // Get organization members from Clerk
        const memberships = await clerkClient.organizations.getOrganizationMembershipList({
          organizationId,
          limit: 100, // Adjust as needed
        });

        const memberIds = memberships.map((m) => m.publicUserData.userId);
        filter.clerkId = { $in: memberIds };
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .sort({ [sort]: sortOrder })
          .limit(parseInt(limit))
          .skip(skip)
          .select('-__v')
          .lean(),
        User.countDocuments(filter),
      ]);

      return {
        users,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get users:', error);
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(clerkId) {
    try {
      const user = await User.findByClerkId(clerkId);
      if (!user) {
        throw new NotFoundError('User');
      }

      user.isActive = false;
      await user.save();

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_UPDATED,
        userId: clerkId,
        resourceType: 'user',
        resourceId: user._id.toString(),
        details: { action: 'deactivated' },
      });

      logger.info('User deactivated:', { userId: clerkId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to deactivate user:', error);
      throw error;
    }
  }

  /**
   * Reactivate user
   */
  static async reactivateUser(clerkId) {
    try {
      const user = await User.findByClerkId(clerkId);
      if (!user) {
        throw new NotFoundError('User');
      }

      user.isActive = true;
      await user.save();

      await AuditLog.createLog({
        action: AUDIT_ACTIONS.USER_UPDATED,
        userId: clerkId,
        resourceType: 'user',
        resourceId: user._id.toString(),
        details: { action: 'reactivated' },
      });

      logger.info('User reactivated:', { userId: clerkId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to reactivate user:', error);
      throw error;
    }
  }

  /**
   * Get user activity/audit logs
   */
  static async getUserActivity(userId, query = {}) {
    try {
      const { page = 1, limit = 50, action, startDate, endDate } = query;

      const filter = { userId };

      if (action) filter.action = action;

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter).sort({ timestamp: -1 }).limit(parseInt(limit)).skip(skip).lean(),
        AuditLog.countDocuments(filter),
      ]);

      return {
        logs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get user activity:', error);
      throw error;
    }
  }

  /**
   * Change password (redirects to Clerk)
   */
  static async changePassword() {
    try {
      // Since we're using Clerk, password changes should be handled through their API
      // This method exists for API consistency but redirects to proper flow
      throw new ValidationError(
        'Password changes must be done through your account settings in the authentication provider'
      );
    } catch (error) {
      logger.error('Failed to change password:', error);
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(clerkId, file) {
    try {
      // In production, you would upload to S3/CloudFront
      // For demo purposes, we'll create a placeholder URL
      const avatarUrl = `https://your-cdn.com/avatars/${clerkId}-${Date.now()}.${file.mimetype.split('/')[1]}`;

      // Update user avatar URL in our database
      await this.updateUser(clerkId, { avatar: avatarUrl });

      // Also update in Clerk
      try {
        await clerkClient.users.updateUser(clerkId, {
          imageUrl: avatarUrl,
        });
      } catch (clerkError) {
        logger.warn('Failed to update avatar in Clerk:', clerkError);
        // Continue anyway, our database is updated
      }

      logger.info('Avatar uploaded:', { userId: clerkId, avatarUrl });
      return avatarUrl;
    } catch (error) {
      logger.error('Failed to upload avatar:', error);
      throw error;
    }
  }

  /**
   * Get user organizations
   */
  static async getUserOrganizations(clerkId) {
    try {
      const memberships = await clerkClient.users.getOrganizationMembershipList({
        userId: clerkId,
      });

      const organizations = memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        permissions: membership.permissions,
        joinedAt: membership.createdAt,
        imageUrl: membership.organization.imageUrl,
      }));

      return organizations;
    } catch (error) {
      logger.error('Failed to get user organizations:', error);
      throw error;
    }
  }

  /**
   * Get user dashboard statistics
   */
  static async getUserStats(clerkId) {
    try {
      const user = await User.findByClerkId(clerkId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Get user's organizations
      const organizations = await this.getUserOrganizations(clerkId);

      // Get recent activity
      const recentActivity = await AuditLog.find({ userId: clerkId })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      // Get total action count
      const totalActions = await AuditLog.countDocuments({ userId: clerkId });

      // Calculate stats
      const stats = {
        profile: {
          joinedDate: user.createdAt,
          lastLogin: user.lastLoginAt,
          isActive: user.isActive,
          email: user.email,
          fullName: user.fullName,
        },
        organizations: {
          total: organizations.length,
          roles: organizations.map((org) => ({
            name: org.name,
            role: org.role,
          })),
        },
        activity: {
          totalActions,
          recentActions: recentActivity.length,
          lastAction: recentActivity[0]?.timestamp,
          recentActivitySummary: recentActivity.slice(0, 5).map((log) => ({
            action: log.action,
            timestamp: log.timestamp,
            details: log.details,
          })),
        },
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      throw error;
    }
  }
}

module.exports = UserService;
