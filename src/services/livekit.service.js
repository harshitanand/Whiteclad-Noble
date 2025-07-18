/* eslint-disable global-require */
// src/services/livekit.service.js - LiveKit call dispatch service
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../config/logger');
const { ExternalServiceError } = require('../utils/errors');

let AgentDispatchClient;
try {
  // Try importing AgentDispatchClient (name might vary by version)
  const livekitSdk = require('livekit-server-sdk');
  AgentDispatchClient =
    livekitSdk.AgentDispatchClient ||
    livekitSdk.AgentDispatchServiceClient ||
    livekitSdk.DispatchClient;
} catch (error) {
  console.warn('AgentDispatchClient not available in this SDK version');
}

class LiveKitService {
  constructor() {
    this.serverUrl = config.livekit.serverUrl;
    this.apiKey = config.livekit.apiKey;
    this.apiSecret = config.livekit.apiSecret;

    // Initialize Room Service Client for room management
    this.roomService = new RoomServiceClient(this.serverUrl, this.apiKey, this.apiSecret);

    // Initialize Agent Dispatch Client for AI agent management
    this.agentDispatchClient = new AgentDispatchClient(this.serverUrl, this.apiKey, this.apiSecret);
  }

  /**
   * Create a voice assistant room for web calls
   */
  async createWebCall(agentId, userId, organizationId, options = {}) {
    try {
      const {
        participantName = 'user',
        roomDuration = 3600, // 1 hour default
        enableVideo = false,
        enableAudio = true,
        agentName = null, // Custom agent name for dispatch
        agentMetadata = {},
      } = options;

      // Generate unique room name
      const roomId = Math.floor(Math.random() * 10000);
      const roomName = `voice_assistant_room_${roomId}`;

      // Create or get room
      await this.ensureRoomExists(roomName, {
        maxParticipants: 10, // Allow multiple participants + AI agents
        emptyTimeout: 300, // 5 minutes
        metadata: JSON.stringify({
          agentId,
          organizationId,
          callType: 'web',
          createdAt: new Date().toISOString(),
        }),
      });

      // Generate participant token
      const participantId = `voice_assistant_user_${Math.floor(Math.random() * 10000)}`;
      const participantToken = await this.generateParticipantToken({
        roomName,
        participantName,
        participantId,
        ttl: roomDuration,
        permissions: {
          canPublish: enableAudio || enableVideo,
          canPublishData: true,
          canSubscribe: true,
          canUpdateMetadata: true,
          video: enableVideo,
          audio: enableAudio,
        },
      });

      // Dispatch AI agent to the room
      const agentDispatch = await this.dispatchAgentToRoom(
        roomName,
        agentId,
        {
          userId,
          organizationId,
          callType: 'web',
          enableVideo,
          enableAudio,
          ...agentMetadata,
        },
        agentName
      );

      // Log call creation
      logger.info('Web call created with agent dispatch:', {
        roomName,
        agentId,
        userId,
        organizationId,
        participantId,
        dispatchId: agentDispatch.id,
      });

      return {
        serverUrl: this.serverUrl,
        roomName,
        participantToken,
        participantName,
        callType: 'web',
        roomId: participantId,
        agentDispatch: {
          id: agentDispatch.id,
          agentName: agentDispatch.agentName,
          status: 'dispatched',
        },
        metadata: {
          agentId,
          enableVideo,
          enableAudio,
          duration: roomDuration,
        },
      };
    } catch (error) {
      logger.error('Failed to create web call:', error);
      throw new ExternalServiceError('LiveKit', `Failed to create web call: ${error.message}`);
    }
  }

  /**
   * Create a voice assistant room for SIP calls
   */
  async createSipCall(agentId, phoneNumber, userId, organizationId, options = {}) {
    try {
      const {
        participantName = `caller_${phoneNumber}`,
        roomDuration = 1800, // 30 minutes default for SIP
        sipOptions = {},
        agentName = null,
        agentMetadata = {},
      } = options;

      // Generate unique room name for SIP
      const roomId = Math.floor(Math.random() * 10000);
      const roomName = `voice_assistant_sip_${roomId}`;

      // Create room for SIP call
      await this.ensureRoomExists(roomName, {
        maxParticipants: 10,
        emptyTimeout: 60, // 1 minute for SIP
        metadata: JSON.stringify({
          agentId,
          organizationId,
          callType: 'sip',
          phoneNumber,
          createdAt: new Date().toISOString(),
        }),
      });

      // Generate SIP participant token
      const participantId = `voice_assistant_sip_${Math.floor(Math.random() * 10000)}`;
      const participantToken = await this.generateParticipantToken({
        roomName,
        participantName,
        participantId,
        ttl: roomDuration,
        permissions: {
          canPublish: true,
          canPublishData: true,
          canSubscribe: true,
          canUpdateMetadata: true,
          video: false, // SIP is audio only
          audio: true,
        },
      });

      // Configure SIP trunk/gateway if needed
      const sipConfig = await this.configureSipTrunk(roomName, phoneNumber, sipOptions);

      // Dispatch AI agent to the room
      const agentDispatch = await this.dispatchAgentToRoom(
        roomName,
        agentId,
        {
          userId,
          organizationId,
          callType: 'sip',
          phoneNumber,
          sipConfig,
          ...agentMetadata,
        },
        agentName
      );

      logger.info('SIP call created with agent dispatch:', {
        roomName,
        agentId,
        userId,
        organizationId,
        phoneNumber,
        participantId,
        dispatchId: agentDispatch.id,
      });

      return {
        serverUrl: this.serverUrl,
        roomName,
        participantToken,
        participantName,
        callType: 'sip',
        roomId: participantId,
        sipConfig,
        agentDispatch: {
          id: agentDispatch.id,
          agentName: agentDispatch.agentName,
          status: 'dispatched',
        },
        metadata: {
          agentId,
          phoneNumber,
          duration: roomDuration,
        },
      };
    } catch (error) {
      logger.error('Failed to create SIP call:', error);
      throw new ExternalServiceError('LiveKit', `Failed to create SIP call: ${error.message}`);
    }
  }

  /**
   * Dispatch AI agent to room
   */
  async dispatchAgentToRoom(roomName, agentId, metadata = {}, customAgentName = null) {
    try {
      // Determine agent name - use custom name or generate from agentId
      const agentName = customAgentName || `ai-agent-${agentId}`;

      // Prepare dispatch metadata
      const dispatchMetadata = JSON.stringify({
        agentId,
        roomName,
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      // Create dispatch request for the agent to join the room
      const dispatch = await this.agentDispatchClient.createDispatch(roomName, agentName, {
        metadata: dispatchMetadata,
      });

      logger.info('Agent dispatched to room:', {
        roomName,
        agentName,
        agentId,
        dispatchId: dispatch.id,
        metadata: dispatchMetadata,
      });

      return {
        id: dispatch.id,
        agentName: dispatch.agentName,
        roomName: dispatch.room,
        status: 'dispatched',
        createdAt: dispatch.createdAt,
        metadata: dispatchMetadata,
      };
    } catch (error) {
      logger.error('Failed to dispatch agent to room:', error);
      throw new ExternalServiceError('LiveKit', `Failed to dispatch agent: ${error.message}`);
    }
  }

  /**
   * List active agent dispatches in a room
   */
  async listRoomDispatches(roomName) {
    try {
      const dispatches = await this.agentDispatchClient.listDispatch(roomName);

      logger.info(`Found ${dispatches.length} agent dispatches in room: ${roomName}`);

      return dispatches.map((dispatch) => ({
        id: dispatch.id,
        agentName: dispatch.agentName,
        roomName: dispatch.room,
        status: dispatch.status || 'active',
        createdAt: dispatch.createdAt,
        metadata: dispatch.metadata ? JSON.parse(dispatch.metadata) : {},
      }));
    } catch (error) {
      logger.error('Failed to list room dispatches:', error);
      throw new ExternalServiceError('LiveKit', `Failed to list dispatches: ${error.message}`);
    }
  }

  /**
   * Delete/Cancel agent dispatch
   */
  async cancelAgentDispatch(dispatchId) {
    try {
      await this.agentDispatchClient.deleteDispatch(dispatchId);

      logger.info('Agent dispatch cancelled:', { dispatchId });

      return { success: true, dispatchId, status: 'cancelled' };
    } catch (error) {
      logger.error('Failed to cancel agent dispatch:', error);
      throw new ExternalServiceError('LiveKit', `Failed to cancel dispatch: ${error.message}`);
    }
  }

  /**
   * Create explicit agent dispatch (standalone)
   */
  async createExplicitDispatch(roomName, agentName, metadata = {}) {
    try {
      const dispatchMetadata = JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'explicit_dispatch',
        ...metadata,
      });

      // Create a dispatch request for an agent to join the room
      const dispatch = await this.agentDispatchClient.createDispatch(roomName, agentName, {
        metadata: dispatchMetadata,
      });

      logger.info('Explicit agent dispatch created:', {
        roomName,
        agentName,
        dispatchId: dispatch.id,
      });

      // List all dispatches in the room for confirmation
      const dispatches = await this.agentDispatchClient.listDispatch(roomName);
      logger.info(`There are ${dispatches.length} dispatches in ${roomName}`);

      return {
        dispatch: {
          id: dispatch.id,
          agentName: dispatch.agentName,
          roomName: dispatch.room,
          status: 'dispatched',
          createdAt: dispatch.createdAt,
        },
        totalDispatches: dispatches.length,
      };
    } catch (error) {
      logger.error('Failed to create explicit dispatch:', error);
      throw new ExternalServiceError(
        'LiveKit',
        `Failed to create explicit dispatch: ${error.message}`
      );
    }
  }

  async generateParticipantToken({
    roomName,
    participantName,
    participantId,
    ttl = 3600,
    permissions = {},
  }) {
    try {
      const token = new AccessToken(this.apiKey, this.apiSecret, {
        identity: participantId,
        name: participantName,
        ttl,
      });

      // Set video grants
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: permissions.canPublish || true,
        canPublishData: permissions.canPublishData || true,
        canSubscribe: permissions.canSubscribe || true,
        canUpdateMetadata: permissions.canUpdateMetadata || false,
        // Specific media permissions
        ...(permissions.video !== undefined && { video: permissions.video }),
        ...(permissions.audio !== undefined && { audio: permissions.audio }),
      });

      return token.toJwt();
    } catch (error) {
      logger.error('Failed to generate participant token:', error);
      throw error;
    }
  }

  /**
   * Ensure room exists or create it
   */
  async ensureRoomExists(roomName, roomOptions = {}) {
    try {
      // Try to get existing room
      try {
        await this.roomService.getRoom(roomName);
        logger.info('Room already exists:', roomName);
      } catch (error) {
        // Room doesn't exist, create it
        if (error.message.includes('not found')) {
          await this.roomService.createRoom({
            name: roomName,
            ...roomOptions,
          });
          logger.info('Room created:', roomName);
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Failed to ensure room exists:', error);
      throw error;
    }
  }

  /**
   * Configure SIP trunk for SIP calls
   */
  async configureSipTrunk(roomName, phoneNumber, sipOptions = {}) {
    try {
      // This would integrate with your SIP provider
      // For example: Twilio, Plivo, or custom SIP gateway

      const sipConfig = {
        trunkId: `trunk_${roomName}`,
        phoneNumber,
        sipUri: `sip:${phoneNumber}@your-sip-provider.com`,
        transport: sipOptions.transport || 'UDP',
        codec: sipOptions.codec || 'PCMU',
        ...sipOptions,
      };

      // Configure SIP ingress/egress rules in LiveKit
      // This is pseudo-code - actual implementation depends on your SIP setup

      logger.info('SIP trunk configured:', sipConfig);
      return sipConfig;
    } catch (error) {
      logger.error('Failed to configure SIP trunk:', error);
      throw error;
    }
  }

  /**
   * End a call/room
   */
  async endCall(roomName, reason = 'call_ended') {
    try {
      // Get room participants
      const participants = await this.roomService.listParticipants(roomName);

      // Disconnect all participants
      for (const participant of participants) {
        await this.roomService.removeParticipant(roomName, participant.identity);
      }

      // Delete the room
      await this.roomService.deleteRoom(roomName);

      logger.info('Call ended:', { roomName, reason });
      return { success: true, roomName, reason };
    } catch (error) {
      logger.error('Failed to end call:', error);
      throw error;
    }
  }

  /**
   * Get active call status with agent dispatches
   */
  async getCallStatus(roomName) {
    try {
      const room = await this.roomService.getRoom(roomName);
      const participants = await this.roomService.listParticipants(roomName);
      const dispatches = await this.listRoomDispatches(roomName);

      return {
        roomName: room.name,
        status: 'active',
        participantCount: participants.length,
        participants: participants.map((p) => ({
          identity: p.identity,
          name: p.name,
          joinedAt: p.joinedAt,
          isConnected: p.state === 'active',
        })),
        agentDispatches: dispatches,
        metadata: room.metadata ? JSON.parse(room.metadata) : {},
        createdAt: room.creationTime,
        duration: Date.now() - room.creationTime,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        return { status: 'not_found', roomName };
      }
      logger.error('Failed to get call status:', error);
      throw error;
    }
  }

  /**
   * Update room metadata
   */
  async updateCallMetadata(roomName, metadata) {
    try {
      await this.roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
      logger.info('Room metadata updated:', { roomName, metadata });
      return { success: true };
    } catch (error) {
      logger.error('Failed to update room metadata:', error);
      throw error;
    }
  }

  /**
   * List active calls for organization
   */
  async listActiveCalls(organizationId) {
    try {
      const rooms = await this.roomService.listRooms();

      const organizationRooms = rooms.filter((room) => {
        if (!room.metadata) return false;
        try {
          const metadata = JSON.parse(room.metadata);
          return metadata.organizationId === organizationId;
        } catch {
          return false;
        }
      });

      return organizationRooms.map((room) => ({
        roomName: room.name,
        participantCount: room.numParticipants,
        createdAt: room.creationTime,
        metadata: room.metadata ? JSON.parse(room.metadata) : {},
      }));
    } catch (error) {
      logger.error('Failed to list active calls:', error);
      throw error;
    }
  }
}

module.exports = new LiveKitService();
