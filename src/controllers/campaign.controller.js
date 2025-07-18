const CampaignService = require('../services/campaign.service');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class CampaignController {
  static createCampaign = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const campaign = await CampaignService.createCampaign(req.body, userId, orgId, userRole);

    logger.info('Campaign created:', {
      campaignId: campaign._id,
      name: campaign.campaignName,
      createdBy: userId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaign },
    });
  });

  static getCampaigns = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const result = await CampaignService.getCampaigns(req.query, userId, orgId, userRole);

    res.json({
      success: true,
      data: result,
    });
  });

  static getCampaign = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    const campaign = await CampaignService.getCampaignById(campaignId, userId, orgId, userRole);

    res.json({
      success: true,
      data: { campaign },
    });
  });

  static updateCampaign = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    const campaign = await CampaignService.updateCampaign(
      campaignId,
      req.body,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign },
    });
  });

  static updateCallConfig = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    const campaign = await CampaignService.updateCallConfig(
      campaignId,
      req.body,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Call configuration updated successfully',
      data: { campaign },
    });
  });

  static deleteCampaign = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    await CampaignService.deleteCampaign(campaignId, userId, orgId, userRole);

    res.status(HTTP_STATUS.NO_CONTENT).json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  });

  static startCampaign = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    const campaign = await CampaignService.startCampaign(campaignId, userId, orgId, userRole);

    res.json({
      success: true,
      message: 'Campaign started successfully',
      data: { campaign },
    });
  });

  static pauseCampaign = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    const campaign = await CampaignService.pauseCampaign(campaignId, userId, orgId, userRole);

    res.json({
      success: true,
      message: 'Campaign paused successfully',
      data: { campaign },
    });
  });

  static completeCampaign = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    const campaign = await CampaignService.completeCampaign(campaignId, userId, orgId, userRole);

    res.json({
      success: true,
      message: 'Campaign completed successfully',
      data: { campaign },
    });
  });

  static getCampaignAnalytics = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { campaignId } = req.params;

    const analytics = await CampaignService.getCampaignAnalytics(
      campaignId,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      data: { analytics },
    });
  });
}

module.exports = CampaignController;
