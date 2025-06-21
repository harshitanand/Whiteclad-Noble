const PermissionService = require('../services/permission.service');
const { AuthorizationError } = require('../utils/errors');
const { catchAsync } = require('./error.middleware');

/**
 * Middleware to check if user has required permission
 */
const requirePermission = (permission, options = {}) => {
  return catchAsync(async (req, res, next) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership || {};
    
    const context = {
      userId,
      organizationId: orgId,
      ...options.context
    };

    // If checking resource-specific permission, get resource ID
    if (options.resourceParam) {
      context.resourceId = req.params[options.resourceParam];
    }

    const hasPermission = PermissionService.hasPermission(userRole, permission, context);
    
    if (!hasPermission) {
      throw new AuthorizationError(`Permission required: ${permission}`);
    }

    // Add permission context to request
    req.permissionContext = {
      permission,
      userRole,
      hasPermission: true
    };

    next();
  });
};

/**
 * Middleware to check minimum role requirement
 */
const requireRole = (minimumRole) => {
  return catchAsync(async (req, res, next) => {
    const { role: userRole } = req.membership || {};
    
    const hasRole = PermissionService.hasMinimumRole(userRole, minimumRole);
    
    if (!hasRole) {
      throw new AuthorizationError(`Minimum role required: ${minimumRole}`);
    }

    next();
  });
};

/**
 * Middleware to check resource ownership or permission
 */
const requireOwnershipOrPermission = (permission, resourceModel, options = {}) => {
  return catchAsync(async (req, res, next) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership || {};
    const resourceId = req.params[options.paramName || 'id'];

    // Get resource
    const resource = await resourceModel.findOne({
      _id: resourceId,
      organizationId: orgId,
      isActive: true,
      deletedAt: null
    });

    if (!resource) {
      throw new NotFoundError('Resource');
    }

    // Check ownership first
    if (resource.createdBy === userId) {
      req.resourceOwnership = 'owner';
      return next();
    }

    // Check permission
    const hasPermission = PermissionService.hasPermission(userRole, permission);
    if (!hasPermission) {
      throw new AuthorizationError('Insufficient permissions');
    }

    req.resourceOwnership = 'permission';
    next();
  });
};

module.exports = {
  requirePermission,
  requireRole,
  requireOwnershipOrPermission
};
