/* eslint-disable no-underscore-dangle */
// src/services/campaign.service.js - Campaign service
const Campaign = require('../models/Campaign');
const Agent = require('../models/Agent');
const AuditLog = require('../models/AuditLog');
const PermissionService = require('./permission.service');
const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} = require('../utils/errors');
const { AUDIT_ACTIONS, PERMISSIONS } = require('../utils/constants');
const logger = require('../config/logger');

class CampaignService {
  /**
   * Create a new campaign
   */
  static async createCampaign(campaignData, userId, organizationId, userRole) {
    try {
      // Check permissions
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_CREATE)) {
        throw new AuthorizationError('Insufficient permissions to create campaigns');
      }

      // Validate agent exists and user has access
      const agent = await Agent.findOne({
        _id: campaignData.agent,
        organizationId,
        isActive: true,
        deletedAt: null,
      });

      if (!agent) {
        throw new NotFoundError('Agent not found or not accessible');
      }

      // Validate date range
      if (new Date(campaignData.startTime) >= new Date(campaignData.endTime)) {
        throw new ValidationError('End time must be after start time');
      }

      // Create campaign
      const campaign = new Campaign({
        ...campaignData,
        organizationId,
        createdBy: userId,
        status: 'draft',
      });

      await campaign.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_CREATED, // We can add CAMPAIGN_CREATED later
        userId,
        organizationId,
        resourceType: 'campaign',
        resourceId: campaign._id.toString(),
        details: {
          name: campaign.campaignName,
          agent: agent.name,
          startTime: campaign.startTime,
          endTime: campaign.endTime,
        },
      });

      logger.info('Campaign created:', {
        campaignId: campaign._id,
        name: campaign.campaignName,
        createdBy: userId,
      });

      return campaign.populate('agent');
    } catch (error) {
      logger.error('Failed to create campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaigns with filtering and pagination
   */
  static async getCampaigns(query, userId, organizationId, userRole) {
    try {
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_READ)) {
        throw new AuthorizationError('Insufficient permissions to read campaigns');
      }

      const { page = 1, limit = 20, search, status, agent } = query;

      // Build filter
      const filter = { organizationId, isActive: true, deletedAt: null };

      if (search) {
        filter.$or = [{ campaignName: { $regex: search, $options: 'i' } }];
      }

      if (status) filter.status = status;
      if (agent) filter.agent = agent;

      // Apply role-based filtering
      if (!PermissionService.hasMinimumRole(userRole, 'team_lead')) {
        filter.createdBy = userId;
      }

      const skip = (page - 1) * limit;
      const [campaigns, total] = await Promise.all([
        Campaign.find(filter)
          .populate('agent', 'name type status')
          .sort({ createdAt: -1 })
          .limit(parseInt(limit, 10))
          .skip(skip)
          .lean(),
        Campaign.countDocuments(filter),
      ]);

      return {
        campaigns,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get campaigns:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(campaignId, userId, organizationId, userRole) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        organizationId,
        isActive: true,
        deletedAt: null,
      }).populate('agent', 'name type status voiceType voice');

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_READ, {
        resourceOwnerId: campaign.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to access this campaign');
      }

      return campaign;
    } catch (error) {
      logger.error('Failed to get campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign
   */
  static async updateCampaign(campaignId, updateData, userId, organizationId, userRole) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: campaign.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to update this campaign');
      }

      // Validate status transitions
      if (updateData.status) {
        const validTransitions = {
          draft: ['scheduled', 'cancelled'],
          scheduled: ['running', 'paused', 'cancelled'],
          running: ['paused', 'completed', 'cancelled'],
          paused: ['running', 'completed', 'cancelled'],
          completed: [],
          cancelled: [],
        };

        if (!validTransitions[campaign.status].includes(updateData.status)) {
          throw new ValidationError(
            `Cannot transition from ${campaign.status} to ${updateData.status}`
          );
        }
      }

      // Validate date range if updating times
      if (updateData.startTime || updateData.endTime) {
        const startTime = updateData.startTime
          ? new Date(updateData.startTime)
          : campaign.startTime;
        const endTime = updateData.endTime ? new Date(updateData.endTime) : campaign.endTime;

        if (startTime >= endTime) {
          throw new ValidationError('End time must be after start time');
        }
      }

      // Update campaign
      Object.assign(campaign, updateData);
      await campaign.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_UPDATED,
        userId,
        organizationId,
        resourceType: 'campaign',
        resourceId: campaign._id.toString(),
        details: {
          changes: Object.keys(updateData),
          name: campaign.campaignName,
        },
      });

      return campaign.populate('agent');
    } catch (error) {
      logger.error('Failed to update campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign call configuration
   */
  static async updateCallConfig(campaignId, callConfigData, userId, organizationId, userRole) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: campaign.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to update this campaign');
      }

      // Process uploaded files if any
      if (callConfigData.files && callConfigData.files.length > 0) {
        const processedFiles = callConfigData.files.map((file) => ({
          filename: file.filename,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        }));
        callConfigData.files = processedFiles;
      }

      // Update call configuration
      campaign.callConfig = {
        ...campaign.callConfig,
        ...callConfigData,
        timeSlots: {
          from: {
            hour: callConfigData.from,
            period: callConfigData.fromPeriod,
          },
          to: {
            hour: callConfigData.to,
            period: callConfigData.toPeriod,
          },
        },
      };

      await campaign.save();

      logger.info('Campaign call config updated:', {
        campaignId: campaign._id,
        updatedBy: userId,
      });

      return campaign.populate('agent');
    } catch (error) {
      logger.error('Failed to update campaign call config:', error);
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  static async deleteCampaign(campaignId, userId, organizationId, userRole) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_DELETE, {
        resourceOwnerId: campaign.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to delete this campaign');
      }

      // Can't delete running campaigns
      if (campaign.status === 'running') {
        throw new ConflictError('Cannot delete a running campaign. Please pause it first.');
      }

      // Soft delete
      campaign.deletedAt = new Date();
      campaign.isActive = false;
      await campaign.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_DELETED,
        userId,
        organizationId,
        resourceType: 'campaign',
        resourceId: campaign._id.toString(),
        details: {
          name: campaign.campaignName,
          status: campaign.status,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  /**
   * Start campaign
   */
  static async startCampaign(campaignId, userId, organizationId, userRole) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: campaign.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to start this campaign');
      }

      // Validate campaign can be started
      if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
        throw new ConflictError(`Cannot start campaign with status: ${campaign.status}`);
      }

      // Check if agent is published
      if (campaign.agent.status !== 'published') {
        throw new ConflictError('Cannot start campaign with unpublished agent');
      }

      // Start campaign
      await campaign.start();

      logger.info('Campaign started:', {
        campaignId: campaign._id,
        startedBy: userId,
      });

      return campaign.populate('agent');
    } catch (error) {
      logger.error('Failed to start campaign:', error);
      throw error;
    }
  }

  /**
   * Pause campaign
   */
  static async pauseCampaign(campaignId, userId, organizationId, userRole) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: campaign.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to pause this campaign');
      }

      if (campaign.status !== 'running') {
        throw new ConflictError('Can only pause running campaigns');
      }

      // Pause campaign
      await campaign.pause();

      logger.info('Campaign paused:', {
        campaignId: campaign._id,
        pausedBy: userId,
      });

      return campaign.populate('agent');
    } catch (error) {
      logger.error('Failed to pause campaign:', error);
      throw error;
    }
  }

  /**
   * Complete campaign
   */
  static async completeCampaign(campaignId, userId, organizationId, userRole) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: campaign.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to complete this campaign');
      }

      if (!['running', 'paused'].includes(campaign.status)) {
        throw new ConflictError('Can only complete running or paused campaigns');
      }

      // Complete campaign
      await campaign.complete();

      logger.info('Campaign completed:', {
        campaignId: campaign._id,
        completedBy: userId,
      });

      return campaign.populate('agent');
    } catch (error) {
      logger.error('Failed to complete campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign analytics
   */
  static async getCampaignAnalytics(campaignId, userId, organizationId, userRole) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId, organizationId, userRole);

      // Check permissions - owner or team lead can see analytics
      const hasPermission =
        campaign.createdBy === userId || PermissionService.hasMinimumRole(userRole, 'team_lead');

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to view campaign analytics');
      }

      return {
        basic: campaign.stats,
        duration: campaign.duration,
        status: campaign.status,
        timeSlots: campaign.callConfig?.timeSlots,
        performance: {
          successRate:
            campaign.stats.totalCalls > 0
              ? (campaign.stats.successfulCalls / campaign.stats.totalCalls) * 100
              : 0,
          averageCallDuration: campaign.stats.averageCallDuration,
          conversionRate: campaign.stats.conversionRate,
        },
      };
    } catch (error) {
      logger.error('Failed to get campaign analytics:', error);
      throw error;
    }
  }
}

module.exports = CampaignService;
