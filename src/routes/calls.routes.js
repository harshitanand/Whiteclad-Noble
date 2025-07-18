const express = require('express');
const Joi = require('joi');
const CallsController = require('../controllers/calls.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const { validateBody, validateParams } = require('../middleware/validation.middleware');
const { commonSchemas } = require('../utils/validation');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);
router.use(requireOrganization);

// Validation schemas
const webCallSchema = Joi.object({
  agentId: commonSchemas.id.required(),
  participantName: Joi.string().min(1).max(50).default('user'),
  enableVideo: Joi.boolean().default(false),
  enableAudio: Joi.boolean().default(true),
  duration: Joi.number().min(60).max(7200).default(3600), // 1 minute to 2 hours
  agentName: Joi.string().min(1).max(100), // Custom agent name for dispatch
  agentMetadata: Joi.object().default({}), // Additional metadata for agent
});

const sipCallSchema = Joi.object({
  agentId: commonSchemas.id.required(),
  phoneNumber: Joi.string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .required(),
  participantName: Joi.string().min(1).max(50),
  duration: Joi.number().min(60).max(3600).default(1800), // 1 minute to 1 hour
  sipOptions: Joi.object({
    transport: Joi.string().valid('UDP', 'TCP', 'TLS').default('UDP'),
    codec: Joi.string().valid('PCMU', 'PCMA', 'G722', 'G729').default('PCMU'),
  }).default({}),
  agentName: Joi.string().min(1).max(100), // Custom agent name for dispatch
  agentMetadata: Joi.object().default({}), // Additional metadata for agent
});

const agentDispatchSchema = Joi.object({
  roomName: Joi.string().required(),
  agentName: Joi.string().required(),
  agentId: commonSchemas.id,
  metadata: Joi.object().default({}),
});

const endCallSchema = Joi.object({
  reason: Joi.string().max(200).default('call_ended'),
});

const updateMetadataSchema = Joi.object({
  metadata: Joi.object().required(),
});

// Call creation routes
router.post('/web', validateBody(webCallSchema), CallsController.createWebCall);

router.post('/sip', validateBody(sipCallSchema), CallsController.createSipCall);

// Call management routes
router.get('/active', CallsController.listActiveCalls);

router.get(
  '/:roomName/status',
  validateParams({ roomName: Joi.string().required() }),
  CallsController.getCallStatus
);

router.delete(
  '/:roomName',
  validateParams({ roomName: Joi.string().required() }),
  validateBody(endCallSchema),
  CallsController.endCall
);

// Agent dispatch management routes
router.post(
  '/agent-dispatch',
  validateBody(agentDispatchSchema),
  CallsController.createAgentDispatch
);

router.get(
  '/:roomName/dispatches',
  validateParams({ roomName: Joi.string().required() }),
  CallsController.listAgentDispatches
);

router.delete(
  '/dispatches/:dispatchId',
  validateParams({ dispatchId: Joi.string().required() }),
  CallsController.cancelAgentDispatch
);

// Call metadata update route
router.patch(
  '/:roomName/metadata',
  validateParams({ roomName: Joi.string().required() }),
  validateBody(updateMetadataSchema),
  CallsController.updateCallMetadata
);

module.exports = router;
