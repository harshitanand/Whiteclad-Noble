// src/controllers/calls.controller.js - Call dispatch controller
const LiveKitService = require('../services/livekit.service');
const AgentService = require('../services/agent.service');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class CallsController {
  /**
   * Create a web call (video/audio)
   */
  static createWebCall = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId, participantName, enableVideo, enableAudio, duration } = req.body;

    // Verify agent exists and user has access
    const agent = await AgentService.getAgentById(agentId, userId, orgId, userRole);

    // Create web call
    const callSession = await LiveKitService.createWebCall(agentId, userId, orgId, {
      participantName: participantName || 'user',
      enableVideo: enableVideo || false,
      enableAudio: enableAudio !== false, // Default to true
      roomDuration: duration || 3600,
    });

    logger.info('Web call initiated:', {
      agentId,
      userId,
      orgId,
      roomName: callSession.roomName,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Web call session created',
      data: callSession,
    });
  });

  /**
   * Create a SIP call
   */
  static createSipCall = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { agentId, phoneNumber, participantName, duration, sipOptions } = req.body;

    // Verify agent exists and user has access
    const agent = await AgentService.getAgentById(agentId, userId, orgId, userRole);

    // Create SIP call
    const callSession = await LiveKitService.createSipCall(agentId, phoneNumber, userId, orgId, {
      participantName: participantName || `caller_${phoneNumber}`,
      roomDuration: duration || 1800,
      sipOptions: sipOptions || {},
    });

    logger.info('SIP call initiated:', {
      agentId,
      userId,
      orgId,
      phoneNumber,
      roomName: callSession.roomName,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'SIP call session created',
      data: callSession,
    });
  });

  /**
   * Get call status
   */
  static getCallStatus = catchAsync(async (req, res) => {
    const { roomName } = req.params;
    const { userId, orgId } = req.auth;

    const status = await LiveKitService.getCallStatus(roomName);

    // Verify user has access to this call
    if (status.metadata && status.metadata.organizationId !== orgId) {
      throw new AuthorizationError('Access denied to this call');
    }

    res.json({
      success: true,
      data: status,
    });
  });

  /**
   * End a call
   */
  static endCall = catchAsync(async (req, res) => {
    const { roomName } = req.params;
    const { userId, orgId } = req.auth;
    const { reason } = req.body;

    // Verify user has access to end this call
    const status = await LiveKitService.getCallStatus(roomName);
    if (status.metadata && status.metadata.organizationId !== orgId) {
      throw new AuthorizationError('Access denied to end this call');
    }

    const result = await LiveKitService.endCall(roomName, reason);

    logger.info('Call ended by user:', {
      roomName,
      userId,
      reason,
    });

    res.json({
      success: true,
      message: 'Call ended successfully',
      data: result,
    });
  });

  /**
   * List active calls for organization
   */
  static listActiveCalls = catchAsync(async (req, res) => {
    const { orgId } = req.auth;

    const activeCalls = await LiveKitService.listActiveCalls(orgId);

    res.json({
      success: true,
      data: {
        calls: activeCalls,
        count: activeCalls.length,
      },
    });
  });

  /**
   * Create explicit agent dispatch
   */
  static createAgentDispatch = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { roomName, agentName, agentId, metadata } = req.body;

    // Verify user has access to the room/organization
    const status = await LiveKitService.getCallStatus(roomName);
    if (status.metadata && status.metadata.organizationId !== orgId) {
      throw new AuthorizationError('Access denied to this room');
    }

    const dispatch = await LiveKitService.createExplicitDispatch(roomName, agentName, {
      agentId,
      dispatchedBy: userId,
      organizationId: orgId,
      ...metadata,
    });

    logger.info('Agent dispatch created:', {
      roomName,
      agentName,
      agentId,
      userId,
      dispatchId: dispatch.dispatch.id,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Agent dispatch created successfully',
      data: dispatch,
    });
  });

  /**
   * List agent dispatches in room
   */
  static listAgentDispatches = catchAsync(async (req, res) => {
    const { roomName } = req.params;
    const { userId, orgId } = req.auth;

    // Verify user has access to the room
    const status = await LiveKitService.getCallStatus(roomName);
    if (status.metadata && status.metadata.organizationId !== orgId) {
      throw new AuthorizationError('Access denied to this room');
    }

    const dispatches = await LiveKitService.listRoomDispatches(roomName);

    res.json({
      success: true,
      data: {
        roomName,
        dispatches,
        count: dispatches.length,
      },
    });
  });

  /**
   * Cancel agent dispatch
   */
  static cancelAgentDispatch = catchAsync(async (req, res) => {
    const { dispatchId } = req.params;
    const { userId, orgId } = req.auth;

    // Note: In a full implementation, you might want to verify
    // the user has permission to cancel this specific dispatch

    const result = await LiveKitService.cancelAgentDispatch(dispatchId);

    logger.info('Agent dispatch cancelled:', {
      dispatchId,
      userId,
      orgId,
    });

    res.json({
      success: true,
      message: 'Agent dispatch cancelled successfully',
      data: result,
    });
  });
  static updateCallMetadata = catchAsync(async (req, res) => {
    const { roomName } = req.params;
    const { userId, orgId } = req.auth;
    const { metadata } = req.body;

    // Verify user has access to this call
    const status = await LiveKitService.getCallStatus(roomName);
    if (status.metadata && status.metadata.organizationId !== orgId) {
      throw new AuthorizationError('Access denied to update this call');
    }

    await LiveKitService.updateCallMetadata(roomName, {
      ...status.metadata,
      ...metadata,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });

    res.json({
      success: true,
      message: 'Call metadata updated',
    });
  });
}

module.exports = CallsController;
