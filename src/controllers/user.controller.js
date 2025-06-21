const UserService = require('../services/user.service');
const PermissionService = require('../services/permission.service');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS, PERMISSIONS } = require('../utils/constants');
const logger = require('../config/logger');

class UserController {
  /**
   * Get current user profile
   */
  static getProfile = catchAsync(async (req, res) => {
    const { userId } = req.auth;
    
    const user = await UserService.getUserProfile(userId);
    
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
    
    logger.info('User profile updated:', { 
      userId,
      changes: Object.keys(req.body)
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  });

  /**
   * Get user by ID (admin only)
   */
  static getUser = catchAsync(async (req, res) => {
    const { userId: requesterId } = req.auth;
    const { userId } = req.params;
    const { role: requesterRole } = req.membership || {};
    
    // Check if user can view other users
    if (userId !== requesterId && !PermissionService.hasPermission(requesterRole, PERMISSIONS.SYSTEM_ADMIN)) {
      throw new AuthorizationError('Insufficient permissions to view other users');
    }
    
    const user = await UserService.getUserById(userId);
    
    res.json({
      success: true,
      data: { user }
    });
  });

  /**
   * Get users list (admin/team lead only)
   */
  static getUsers = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { role: userRole } = req.membership || {};
    
    // Check permissions
    if (!PermissionService.hasMinimumRole(userRole, 'team_lead')) {
      throw new AuthorizationError('Insufficient permissions to list users');
    }
    
    const result = await UserService.getUsers(req.query, orgId, userRole);
    
    res.json({
      success: true,
      data: result,
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: result.total,
        pages: Math.ceil(result.total / (parseInt(req.query.limit) || 20))
      }
    });
  });

  /**
   * Update user (admin only)
   */
  static updateUser = catchAsync(async (req, res) => {
    const { userId: requesterId } = req.auth;
    const { userId } = req.params;
    const { role: requesterRole } = req.membership || {};
    
    // Check permissions
    if (!PermissionService.hasPermission(requesterRole, PERMISSIONS.SYSTEM_ADMIN)) {
      throw new AuthorizationError('Insufficient permissions to update users');
    }

    // Prevent self-modification in certain cases
    if (userId === requesterId && req.body.role) {
      throw new ConflictError('Cannot modify your own role');
    }
    
    const user = await UserService.updateUser(userId, req.body);
    
    logger.info('User updated by admin:', { 
      targetUserId: userId,
      updatedBy: requesterId,
      changes: Object.keys(req.body)
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  });

  /**
   * Deactivate user (admin only)
   */
  static deactivateUser = catchAsync(async (req, res) => {
    const { userId: requesterId } = req.auth;
    const { userId } = req.params;
    const { role: requesterRole } = req.membership || {};
    
    // Check permissions
    if (!PermissionService.hasPermission(requesterRole, PERMISSIONS.SYSTEM_ADMIN)) {
      throw new AuthorizationError('Insufficient permissions to deactivate users');
    }

    // Prevent self-deactivation
    if (userId === requesterId) {
      throw new ConflictError('Cannot deactivate your own account');
    }
    
    await UserService.deactivateUser(userId);
    
    logger.info('User deactivated:', { 
      targetUserId: userId,
      deactivatedBy: requesterId
    });
    
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  });

  /**
   * Reactivate user (admin only)
   */
  static reactivateUser = catchAsync(async (req, res) => {
    const { userId: requesterId } = req.auth;
    const { userId } = req.params;
    const { role: requesterRole } = req.membership || {};
    
    // Check permissions
    if (!PermissionService.hasPermission(requesterRole, PERMISSIONS.SYSTEM_ADMIN)) {
      throw new AuthorizationError('Insufficient permissions to reactivate users');
    }
    
    await UserService.reactivateUser(userId);
    
    logger.info('User reactivated:', { 
      targetUserId: userId,
      reactivatedBy: requesterId
    });
    
    res.json({
      success: true,
      message: 'User reactivated successfully'
    });
  });

  /**
   * Delete user account (self or admin)
   */
  static deleteUser = catchAsync(async (req, res) => {
    const { userId: requesterId } = req.auth;
    const { userId } = req.params;
    const { role: requesterRole } = req.membership || {};
    
    // Check if user can delete this account
    const canDelete = userId === requesterId || 
                     PermissionService.hasPermission(requesterRole, PERMISSIONS.SYSTEM_ADMIN);
    
    if (!canDelete) {
      throw new AuthorizationError('Insufficient permissions to delete this user');
    }

    await UserService.deleteUser(userId);
    
    logger.info('User account deleted:', { 
      targetUserId: userId,
      deletedBy: requesterId,
      selfDelete: userId === requesterId
    });
    
    res.status(HTTP_STATUS.NO_CONTENT).json({
      success: true,
      message: 'User account deleted successfully'
    });
  });

  /**
   * Get user preferences
   */
  static getPreferences = catchAsync(async (req, res) => {
    const { userId } = req.auth;
    
    const user = await UserService.getUserById(userId);
    
    res.json({
      success: true,
      data: { 
        preferences: user.preferences,
        metadata: user.metadata 
      }
    });
  });

  /**
   * Update user preferences
   */
  static updatePreferences = catchAsync(async (req, res) => {
    const { userId } = req.auth;
    const { preferences, metadata } = req.body;
    
    const user = await UserService.updateUser(userId, {
      preferences: preferences ? { ...user.preferences, ...preferences } : user.preferences,
      metadata: metadata ? { ...user.metadata, ...metadata } : user.metadata
    });
    
    logger.info('User preferences updated:', { userId });
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { 
        preferences: user.preferences,
        metadata: user.metadata 
      }
    });
  });

  /**
   * Get user activity/audit logs
   */
  static getUserActivity = catchAsync(async (req, res) => {
    const { userId: requesterId } = req.auth;
    const { userId } = req.params;
    const { role: requesterRole } = req.membership || {};
    
    // Check if user can view activity
    if (userId !== requesterId && !PermissionService.hasMinimumRole(requesterRole, 'team_lead')) {
      throw new AuthorizationError('Insufficient permissions to view user activity');
    }
    
    const activity = await UserService.getUserActivity(userId, req.query);
    
    res.json({
      success: true,
      data: activity
    });
  });

  /**
   * Change user password (if using custom auth)
   */
  static changePassword = catchAsync(async (req, res) => {
    const { userId } = req.auth;
    const { currentPassword, newPassword } = req.body;
    
    // Note: This would only be used if not using Clerk for password management
    await UserService.changePassword(userId, currentPassword, newPassword);
    
    logger.info('Password changed:', { userId });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  });

  /**
   * Upload user avatar
   */
  static uploadAvatar = catchAsync(async (req, res) => {
    const { userId } = req.auth;
    
    if (!req.file) {
      throw new ValidationError('No avatar file provided');
    }
    
    const avatarUrl = await UserService.uploadAvatar(userId, req.file);
    
    logger.info('Avatar uploaded:', { userId, avatarUrl });
    
    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl }
    });
  });

  /**
   * Get user organizations
   */
  static getUserOrganizations = catchAsync(async (req, res) => {
    const { userId } = req.auth;
    
    const organizations = await UserService.getUserOrganizations(userId);
    
    res.json({
      success: true,
      data: { organizations }
    });
  });

  /**
   * Get user statistics/dashboard data
   */
  static getUserStats = catchAsync(async (req, res) => {
    const { userId } = req.auth;
    
    const stats = await UserService.getUserStats(userId);
    
    res.json({
      success: true,
      data: { stats }
    });
  });
}

module.exports = UserController;
