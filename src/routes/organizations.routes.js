const express = require('express');
const OrganizationController = require('../controllers/organization.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { organizationSchemas, commonSchemas } = require('../utils/validation');
const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);
router.use(requireOrganization);

// Organization routes
router
  .route('/')
  .get(OrganizationController.getOrganization)
  .put(
    validateBody(organizationSchemas.update),
    OrganizationController.updateOrganization
  );

// Member management
router
  .route('/members')
  .get(
    validateQuery(commonSchemas.pagination),
    OrganizationController.getMembers
  )
  .post(
    validateBody(organizationSchemas.invitation),
    OrganizationController.inviteUser
  );

router
  .route('/members/:memberId')
  .put(
    validateParams({ memberId: commonSchemas.id }),
    validateBody(organizationSchemas.memberUpdate),
    OrganizationController.updateMemberRole
  )
  .delete(
    validateParams({ memberId: commonSchemas.id }),
    OrganizationController.removeMember
  );

// Analytics and logs
router.get('/usage', OrganizationController.getUsageStats);
router.get(
  '/audit-logs',
  validateQuery({
    ...commonSchemas.pagination,
    action: Joi.string(),
    startDate: Joi.date(),
    endDate: Joi.date()
  }),
  OrganizationController.getAuditLogs
);

module.exports = router;
