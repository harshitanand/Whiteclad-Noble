const express = require('express');
const TestNumberController = require('../controllers/testnumber.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { testNumberSchemas, commonSchemas } = require('../utils/validation');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);
router.use(requireOrganization);

// Test Number CRUD routes
router
  .route('/')
  .get(validateQuery(testNumberSchemas.query), TestNumberController.getTestNumbers)
  .post(validateBody(testNumberSchemas.create), TestNumberController.createTestNumber);

router
  .route('/:testerId')
  .get(validateParams({ testerId: commonSchemas.id }), TestNumberController.getTestNumber)
  .put(
    validateParams({ testerId: commonSchemas.id }),
    validateBody(testNumberSchemas.update),
    TestNumberController.updateTestNumber
  )
  .delete(validateParams({ testerId: commonSchemas.id }), TestNumberController.deleteTestNumber);

// Test number actions
router.put(
  '/:testerId/activate',
  validateParams({ testerId: commonSchemas.id }),
  TestNumberController.activateTestNumber
);

router.put(
  '/:testerId/deactivate',
  validateParams({ testerId: commonSchemas.id }),
  TestNumberController.deactivateTestNumber
);

router.put(
  '/:testerId/block',
  validateParams({ testerId: commonSchemas.id }),
  TestNumberController.blockTestNumber
);

// Test call management
router.post(
  '/:testerId/test-calls',
  validateParams({ testerId: commonSchemas.id }),
  validateBody(testNumberSchemas.addTestCall),
  TestNumberController.addTestCall
);

router.get(
  '/:testerId/test-calls',
  validateParams({ testerId: commonSchemas.id }),
  TestNumberController.getTestCalls
);

module.exports = router;
