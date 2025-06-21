const { ClerkExpressRequireAuth, ClerkExpressWithAuth, clerkClient } = require('@clerk/clerk-sdk-node');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { catchAsync } = require('./error.middleware');
const logger = require('../config/logger');

const requireAuth = ClerkExpressRequireAuth({
  onError: (error) => {
    logger.error('Authentication error:', error);
    throw new AuthenticationError('Authentication required');
  }
});

const optionalAuth = ClerkExpressWithAuth({
  onError: (error) => {
    logger.warn('Optional auth error:', error);
  }
});

const requireOrganization = catchAsync(async (req, res, next) => {
  const { orgId, userId } = req.auth;
  
  if (!orgId) {
    throw new AuthenticationError('Organization context required');
  }

  try {
    const organization = await clerkClient.organizations.getOrganization(orgId);
    const membership = await clerkClient.organizations.getOrganizationMembership({
      organizationId: orgId,
      userId
    });

    req.organization = organization;
    req.membership = membership;
    next();
  } catch (error) {
    logger.error('Organization verification failed:', error);
    throw new AuthorizationError('Invalid organization access');
  }
});

const enrichUserContext = catchAsync(async (req, res, next) => {
  if (req.auth?.userId) {
    try {
      const user = await clerkClient.users.getUser(req.auth.userId);
      req.user = user;
    } catch (error) {
      logger.warn('Failed to enrich user context:', error);
    }
  }
  next();
});

module.exports = {
  requireAuth,
  optionalAuth,
  requireOrganization,
  enrichUserContext
};
