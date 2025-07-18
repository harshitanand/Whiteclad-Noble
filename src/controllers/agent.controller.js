const AgentService = require('../services/agent.service');
const PermissionService = require('../services/permission.service');
const { catchAsync } = require('../middleware/error.middleware.js');
const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class AgentController {
  /**
   * Create a new AI agent
   */
  static createAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const agent = await AgentService.createAgent(req.body, userId, orgId, userRole);

    logger.info('Agent created:', {
      agentId: agent._id,
      name: agent.name,
      createdBy: userId,
      organizationId: orgId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Agent created successfully',
      data: { agent },
    });
  });

  /**
   * Get agents with filtering and pagination
   */
  static getAgents = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const result = await AgentService.getAgents(req.query, userId, orgId, userRole);

    res.json({
      success: true,
      data: result,
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: result.total,
        pages: Math.ceil(result.total / (parseInt(req.query.limit) || 20)),
      },
    });
  });

  /**
   * Get single agent by ID
   */
  static getAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const agent = await AgentService.getAgentById(agentId, userId, orgId, userRole);

    res.json({
      success: true,
      data: { agent },
    });
  });

  /**
   * Update agent
   */
  static updateAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const agent = await AgentService.updateAgent(agentId, req.body, userId, orgId, userRole);

    logger.info('Agent updated:', {
      agentId: agent._id,
      updatedBy: userId,
      changes: Object.keys(req.body),
    });

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: { agent },
    });
  });

  /**
   * Delete agent
   */
  static deleteAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    await AgentService.deleteAgent(agentId, userId, orgId, userRole);

    logger.info('Agent deleted:', {
      agentId,
      deletedBy: userId,
    });

    res.status(HTTP_STATUS.NO_CONTENT).json({
      success: true,
      message: 'Agent deleted successfully',
    });
  });

  /**
   * Publish agent
   */
  static publishAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const agent = await AgentService.publishAgent(agentId, userId, orgId, userRole);

    logger.info('Agent published:', {
      agentId: agent._id,
      publishedBy: userId,
    });

    res.json({
      success: true,
      message: 'Agent published successfully',
      data: { agent },
    });
  });

  /**
   * Clone agent
   */
  static cloneAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const clonedAgent = await AgentService.cloneAgent(agentId, userId, orgId, userRole);

    logger.info('Agent cloned:', {
      originalAgentId: agentId,
      clonedAgentId: clonedAgent._id,
      clonedBy: userId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Agent cloned successfully',
      data: { agent: clonedAgent },
    });
  });

  /**
   * Chat with agent
   */
  static chatWithAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;
    const { message, sessionId, context } = req.body;

    const response = await AgentService.chatWithAgent(agentId, message, userId, orgId, userRole, {
      sessionId,
      context,
    });

    res.json({
      success: true,
      data: response,
    });
  });

  /**
   * Get agent analytics
   */
  static getAgentAnalytics = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const analytics = await AgentService.getAgentAnalytics(agentId, userId, orgId, userRole);

    res.json({
      success: true,
      data: { analytics },
    });
  });

  /**
   * Create draft agent for multi-step form
   */
  static createDraftAgent = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;

    const agent = await AgentService.createDraftAgent(userId, orgId);

    logger.info('Draft agent created:', {
      agentId: agent._id,
      createdBy: userId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Draft agent created successfully',
      data: { agent },
    });
  });

  /**
   * Update agent identity (Step 1)
   */
  static updateAgentIdentity = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const agent = await AgentService.updateAgentIdentity(
      agentId,
      req.body,
      userId,
      orgId,
      userRole
    );

    logger.info('Agent identity updated:', {
      agentId: agent._id,
      updatedBy: userId,
    });

    res.json({
      success: true,
      message: 'Agent identity updated successfully',
      data: { agent },
    });
  });

  /**
   * Update agent persona (Step 2)
   */
  static updateAgentPersona = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const agent = await AgentService.updateAgentPersona(agentId, req.body, userId, orgId, userRole);

    logger.info('Agent persona updated:', {
      agentId: agent._id,
      updatedBy: userId,
    });

    res.json({
      success: true,
      message: 'Agent persona updated successfully',
      data: { agent },
    });
  });

  /**
   * Update agent work (Step 3)
   */
  static updateAgentWork = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId } = req.params;

    const agent = await AgentService.updateAgentWork(agentId, req.body, userId, orgId, userRole);

    logger.info('Agent work updated:', {
      agentId: agent._id,
      updatedBy: userId,
    });

    res.json({
      success: true,
      message: 'Agent work configuration updated successfully',
      data: { agent },
    });
  });

  /**
   * Handle demo form submission
   */
  static handleDemoSubmission = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;

    const result = await AgentService.handleDemoSubmission(req.body, userId, orgId);

    logger.info('Demo form submitted:', {
      agentName: req.body.agentName,
      userId,
    });

    res.json({
      success: true,
      message: 'Demo form submitted successfully',
      data: result,
    });
  });
}

module.exports = AgentController;
