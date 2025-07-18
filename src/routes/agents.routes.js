const express = require('express');
const AgentController = require('../controllers/agent.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const {
  validateBody,
  validateQuery,
  validateParams,
} = require('../middleware/validation.middleware');
const { agentSchemas, commonSchemas } = require('../utils/validation');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);
router.use(requireOrganization);

// Multi-step agent creation (matching your frontend flow)
router.post('/draft', AgentController.createDraftAgent); // Create empty draft

router.put(
  '/:agentId/identity',
  validateParams({ agentId: commonSchemas.id }),
  validateBody(agentSchemas.createIdentity),
  AgentController.updateAgentIdentity
);

router.put(
  '/:agentId/persona',
  validateParams({ agentId: commonSchemas.id }),
  validateBody(agentSchemas.updatePersona),
  AgentController.updateAgentPersona
);

router.put(
  '/:agentId/work',
  validateParams({ agentId: commonSchemas.id }),
  validateBody(agentSchemas.updateWork),
  AgentController.updateAgentWork
);

// Original Agent CRUD routes (maintained for compatibility)
router
  .route('/')
  .get(validateQuery(agentSchemas.query), AgentController.getAgents)
  .post(validateBody(agentSchemas.create), AgentController.createAgent);

router
  .route('/:agentId')
  .get(validateParams({ agentId: commonSchemas.id }), AgentController.getAgent)
  .put(
    validateParams({ agentId: commonSchemas.id }),
    validateBody(agentSchemas.update),
    AgentController.updateAgent
  )
  .delete(validateParams({ agentId: commonSchemas.id }), AgentController.deleteAgent);

// Agent actions
router.post(
  '/:agentId/publish',
  validateParams({ agentId: commonSchemas.id }),
  AgentController.publishAgent
);

router.post(
  '/:agentId/clone',
  validateParams({ agentId: commonSchemas.id }),
  AgentController.cloneAgent
);

// Chat endpoints
router.post(
  '/:agentId/chat',
  validateParams({ agentId: commonSchemas.id }),
  validateBody(agentSchemas.chat),
  AgentController.chatWithAgent
);

// Demo form endpoint (form-demo.tsx)
router.post(
  '/demo/submit',
  validateBody(agentSchemas.demoSubmission),
  AgentController.handleDemoSubmission
);

// Analytics
router.get(
  '/:agentId/analytics',
  validateParams({ agentId: commonSchemas.id }),
  AgentController.getAgentAnalytics
);

module.exports = router;
