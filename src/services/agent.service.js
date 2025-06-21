const Agent = require('../models/Agent');
const Organization = require('../models/Organization');
const AuditLog = require('../models/AuditLog');
const PermissionService = require('./permission.service');
const LLMService = require('./llm.service');
const { 
  NotFoundError, 
  AuthorizationError, 
  PaymentRequiredError,
  ValidationError 
} = require('../utils/errors');
const { AUDIT_ACTIONS, PERMISSIONS, AGENT_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class AgentService {
  /**
   * Create a new agent
   */
  static async createAgent(agentData, userId, organizationId, userRole) {
    try {
      // Check permissions
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_CREATE)) {
        throw new AuthorizationError('Insufficient permissions to create agents');
      }

      // Check organization limits
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (!organization) {
        throw new NotFoundError('Organization');
      }

      const agentLimits = organization.checkLimits('agent');
      if (agentLimits.exceeded) {
        throw new PaymentRequiredError('Agent limit exceeded for current plan');
      }

      // Create agent
      const agent = new Agent({
        ...agentData,
        organizationId,
        createdBy: userId,
        status: AGENT_STATUS.DRAFT,
        config: {
          model: agentData.model,
          instructions: agentData.instructions,
          temperature: agentData.temperature || 0.7,
          maxTokens: agentData.maxTokens || 1000,
          topP: agentData.topP || 1,
          frequencyPenalty: agentData.frequencyPenalty || 0,
          presencePenalty: agentData.presencePenalty || 0
        }
      });

      await agent.save();

      // Update organization usage
      await organization.incrementUsage('agent');

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_CREATED,
        userId,
        organizationId,
        resourceType: 'agent',
        resourceId: agent._id.toString(),
        details: {
          name: agent.name,
          type: agent.type,
          model: agent.config.model
        }
      });

      logger.info('Agent created:', {
        agentId: agent._id,
        name: agent.name,
        createdBy: userId,
        organizationId
      });

      return agent;
    } catch (error) {
      logger.error('Failed to create agent:', error);
      throw error;
    }
  }

  /**
   * Get agents with filtering and pagination
   */
  static async getAgents(query, userId, organizationId, userRole) {
    try {
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_READ)) {
        throw new AuthorizationError('Insufficient permissions to read agents');
      }

      const {
        page = 1,
        limit = 20,
        search,
        type,
        status,
        tags,
        isPublic,
        createdBy
      } = query;

      // Build filter
      const filter = { organizationId, isActive: true, deletedAt: null };

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (type) filter.type = type;
      if (status) filter.status = status;
      if (tags && tags.length) filter.tags = { $in: tags };
      if (typeof isPublic === 'boolean') filter.isPublic = isPublic;
      if (createdBy) filter.createdBy = createdBy;

      // Apply role-based filtering
      if (!PermissionService.hasMinimumRole(userRole, 'team_lead')) {
        // Non-leads can only see published agents or their own
        filter.$or = [
          { status: AGENT_STATUS.PUBLISHED },
          { createdBy: userId }
        ];
      }

      const skip = (page - 1) * limit;
      const [agents, total] = await Promise.all([
        Agent.find(filter)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(skip)
          .lean(),
        Agent.countDocuments(filter)
      ]);

      return {
        agents,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get agents:', error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  static async getAgentById(agentId, userId, organizationId, userRole) {
    try {
      const agent = await Agent.findOne({
        _id: agentId,
        organizationId,
        isActive: true,
        deletedAt: null
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      // Check permissions
      const hasPermission = PermissionService.hasPermission(
        userRole, 
        PERMISSIONS.AGENT_READ,
        { resourceOwnerId: agent.createdBy, userId }
      );

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to access this agent');
      }

      return agent;
    } catch (error) {
      logger.error('Failed to get agent:', error);
      throw error;
    }
  }

  /**
   * Update agent
   */
  static async updateAgent(agentId, updateData, userId, organizationId, userRole) {
    try {
      const agent = await this.getAgentById(agentId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(
        userRole, 
        PERMISSIONS.AGENT_UPDATE,
        { resourceOwnerId: agent.createdBy, userId }
      );

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to update this agent');
      }

      // Update agent
      Object.assign(agent, updateData);
      if (updateData.config) {
        Object.assign(agent.config, updateData.config);
      }

      await agent.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_UPDATED,
        userId,
        organizationId,
        resourceType: 'agent',
        resourceId: agent._id.toString(),
        details: {
          changes: Object.keys(updateData),
          name: agent.name
        }
      });

      logger.info('Agent updated:', {
        agentId: agent._id,
        updatedBy: userId
      });

      return agent;
    } catch (error) {
      logger.error('Failed to update agent:', error);
      throw error;
    }
  }

  /**
   * Delete agent
   */
  static async deleteAgent(agentId, userId, organizationId, userRole) {
    try {
      const agent = await this.getAgentById(agentId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(
        userRole, 
        PERMISSIONS.AGENT_DELETE,
        { resourceOwnerId: agent.createdBy, userId }
      );

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to delete this agent');
      }

      // Soft delete
      await agent.softDelete();

      // Update organization usage
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (organization) {
        organization.usage.agentCount = Math.max(0, organization.usage.agentCount - 1);
        await organization.save();
      }

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_DELETED,
        userId,
        organizationId,
        resourceType: 'agent',
        resourceId: agent._id.toString(),
        details: {
          name: agent.name,
          type: agent.type
        }
      });

      logger.info('Agent deleted:', {
        agentId: agent._id,
        deletedBy: userId
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete agent:', error);
      throw error;
    }
  }

  /**
   * Publish agent
   */
  static async publishAgent(agentId, userId, organizationId, userRole) {
    try {
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_PUBLISH)) {
        throw new AuthorizationError('Insufficient permissions to publish agents');
      }

      const agent = await this.getAgentById(agentId, userId, organizationId, userRole);
      
      // Publish agent
      await agent.publish(userId);

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_PUBLISHED,
        userId,
        organizationId,
        resourceType: 'agent',
        resourceId: agent._id.toString(),
        details: {
          name: agent.name,
          publishedBy: userId
        }
      });

      logger.info('Agent published:', {
        agentId: agent._id,
        publishedBy: userId
      });

      return agent;
    } catch (error) {
      logger.error('Failed to publish agent:', error);
      throw error;
    }
  }

  /**
   * Clone agent
   */
  static async cloneAgent(agentId, userId, organizationId, userRole) {
    try {
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_CREATE)) {
        throw new AuthorizationError('Insufficient permissions to create agents');
      }

      const originalAgent = await this.getAgentById(agentId, userId, organizationId, userRole);
      
      // Check organization limits
      const organization = await Organization.findOne({ clerkId: organizationId });
      const agentLimits = organization.checkLimits('agent');
      if (agentLimits.exceeded) {
        throw new PaymentRequiredError('Agent limit exceeded for current plan');
      }

      // Clone agent
      const clonedAgent = await originalAgent.clone(userId, organizationId);

      // Update organization usage
      await organization.incrementUsage('agent');

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_CREATED,
        userId,
        organizationId,
        resourceType: 'agent',
        resourceId: clonedAgent._id.toString(),
        details: {
          name: clonedAgent.name,
          clonedFrom: originalAgent._id.toString(),
          originalName: originalAgent.name
        }
      });

      logger.info('Agent cloned:', {
        originalAgentId: agentId,
        clonedAgentId: clonedAgent._id,
        clonedBy: userId
      });

      return clonedAgent;
    } catch (error) {
      logger.error('Failed to clone agent:', error);
      throw error;
    }
  }

  /**
   * Chat with agent
   */
  static async chatWithAgent(agentId, message, userId, organizationId, userRole, options = {}) {
    try {
      const agent = await this.getAgentById(agentId, userId, organizationId, userRole);

      // Check if agent is accessible for chat
      if (agent.status !== AGENT_STATUS.PUBLISHED && agent.createdBy !== userId) {
        throw new AuthorizationError('Cannot chat with unpublished agent');
      }

      // Check API call limits
      const organization = await Organization.findOne({ clerkId: organizationId });
      const apiLimits = organization.checkLimits('apiCallsThisMonth');
      if (apiLimits.exceeded) {
        throw new PaymentRequiredError('API call limit exceeded for current plan');
      }

      const startTime = Date.now();

      try {
        // Use LLM service to get response
        const response = await LLMService.chatCompletion({
          model: agent.config.model,
          messages: [
            { role: 'system', content: agent.config.instructions },
            { role: 'user', content: message }
          ],
          temperature: agent.config.temperature,
          max_tokens: agent.config.maxTokens,
          top_p: agent.config.topP,
          frequency_penalty: agent.config.frequencyPenalty,
          presence_penalty: agent.config.presencePenalty
        });

        const responseTime = Date.now() - startTime;

        // Update usage and analytics
        await Promise.all([
          agent.incrementUsage(),
          agent.updateAnalytics(responseTime, true),
          organization.incrementUsage('apiCallsThisMonth')
        ]);

        return {
          message: response.content,
          usage: response.usage,
          responseTime,
          sessionId: options.sessionId
        };

      } catch (llmError) {
        const responseTime = Date.now() - startTime;
        await agent.updateAnalytics(responseTime, false);
        throw llmError;
      }
    } catch (error) {
      logger.error('Failed to chat with agent:', error);
      throw error;
    }
  }

  /**
   * Get agent analytics
   */
  static async getAgentAnalytics(agentId, userId, organizationId, userRole) {
    try {
      const agent = await this.getAgentById(agentId, userId, organizationId, userRole);

      // Check permissions - owner or team lead can see analytics
      const hasPermission = agent.createdBy === userId || 
                           PermissionService.hasMinimumRole(userRole, 'team_lead');

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to view agent analytics');
      }

      return {
        basic: agent.analytics,
        formatted: agent.formattedAnalytics,
        trends: {
          // Add trend calculations here if needed
          dailyUsage: [], // Implement based on your needs
          monthlyUsage: []
        }
      };
    } catch (error) {
      logger.error('Failed to get agent analytics:', error);
      throw error;
    }
  }
}

module.exports = AgentService;
