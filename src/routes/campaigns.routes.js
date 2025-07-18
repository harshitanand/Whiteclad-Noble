const express = require('express');
const CampaignController = require('../controllers/campaign.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { campaignSchemas, commonSchemas } = require('../utils/validation');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);
router.use(requireOrganization);

// Campaign CRUD routes
router
  .route('/')
  .get(validateQuery(campaignSchemas.query), CampaignController.getCampaigns)
  .post(validateBody(campaignSchemas.create), CampaignController.createCampaign);

router
  .route('/:campaignId')
  .get(validateParams({ campaignId: commonSchemas.id }), CampaignController.getCampaign)
  .put(
    validateParams({ campaignId: commonSchemas.id }),
    validateBody(campaignSchemas.update),
    CampaignController.updateCampaign
  )
  .delete(validateParams({ campaignId: commonSchemas.id }), CampaignController.deleteCampaign);

// Campaign call configuration
router.put(
  '/:campaignId/call-config',
  validateParams({ campaignId: commonSchemas.id }),
  validateBody(campaignSchemas.updateCallConfig),
  CampaignController.updateCallConfig
);

// Campaign actions
router.post(
  '/:campaignId/start',
  validateParams({ campaignId: commonSchemas.id }),
  CampaignController.startCampaign
);

router.post(
  '/:campaignId/pause',
  validateParams({ campaignId: commonSchemas.id }),
  CampaignController.pauseCampaign
);

router.post(
  '/:campaignId/complete',
  validateParams({ campaignId: commonSchemas.id }),
  CampaignController.completeCampaign
);

// Campaign analytics
router.get(
  '/:campaignId/analytics',
  validateParams({ campaignId: commonSchemas.id }),
  CampaignController.getCampaignAnalytics
);

module.exports = router;
