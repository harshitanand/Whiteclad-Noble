const { ROLE_PERMISSIONS, ROLE_HIERARCHY, PERMISSIONS } = require('../utils/constants');
const { AuthorizationError } = require('../utils/errors');
const logger = require('../config/logger');

class PermissionService {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(userRole, requiredPermission, context = {}) {
    try {
      // Super admin has all permissions
      if (userRole === 'super_admin') {
        return true;
      }
      
      // Get role permissions
      const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
      
      // Check direct permission
      if (rolePermissions.includes(requiredPermission)) {
        return true;
      }
      
      // Check context-specific permissions (e.g., resource ownership)
      if (context.resourceOwnerId && context.userId === context.resourceOwnerId) {
        const ownershipPermissions = [
          PERMISSIONS.AGENT_READ,
          PERMISSIONS.AGENT_UPDATE,
          PERMISSIONS.AGENT_DELETE
        ];
        
        if (ownershipPermissions.includes(requiredPermission)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false;
    }
  }
  
  /**
   * Check if user has minimum role level
   */
  static hasMinimumRole(userRole, minimumRole) {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
    
    return userLevel >= requiredLevel;
  }
  
  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }
  
  /**
   * Check if user can assign a role to another user
   */
  static canAssignRole(assignerRole, targetRole) {
    const assignerLevel = ROLE_HIERARCHY[assignerRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    
    // Can only assign roles lower than your own
    return assignerLevel > targetLevel;
  }
  
  /**
   * Filter resources based on user permissions
   */
  static async filterResourcesByPermission(resources, userRole, userId, permission) {
    return resources.filter(resource => {
      const context = {
        resourceOwnerId: resource.createdBy,
        userId
      };
      
      return this.hasPermission(userRole, permission, context);
    });
  }
  
  /**
   * Get permission context for request
   */
  static async getPermissionContext(userId, organizationId, membership) {
    try {
      const userRole = membership?.role || 'guest';
      const permissions = this.getRolePermissions(userRole);
      
      return {
        userId,
        organizationId,
        role: userRole,
        permissions,
        level: ROLE_HIERARCHY[userRole] || 0,
        canElevate: this.hasMinimumRole(userRole, 'team_lead')
      };
    } catch (error) {
      logger.error('Failed to get permission context:', error);
      throw new AuthorizationError('Permission context error');
    }
  }
}

module.exports = PermissionService;
