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
// router.use(requireAuth);
// router.use(requireOrganization);

// Agent CRUD routes
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

router.post(
  '/:agentId/chat',
  validateParams({ agentId: commonSchemas.id }),
  validateBody(agentSchemas.chat),
  AgentController.chatWithAgent
);

// Analytics
router.get(
  '/:agentId/analytics',
  validateParams({ agentId: commonSchemas.id }),
  AgentController.getAgentAnalytics
);

module.exports = router;
