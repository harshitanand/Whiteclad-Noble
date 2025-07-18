const express = require('express');
const multer = require('multer');
const KnowledgeBaseController = require('../controllers/knowledgebase.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { knowledgeBaseSchemas, commonSchemas } = require('../utils/validation');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOC, DOCX, CSV are allowed.'));
    }
  },
});

// Apply auth middleware to all routes
router.use(requireAuth);
router.use(requireOrganization);

// Knowledge Base CRUD routes
router
  .route('/')
  .get(validateQuery(knowledgeBaseSchemas.query), KnowledgeBaseController.getKnowledgeBases)
  .post(
    upload.array('kb_files', 5),
    validateBody(knowledgeBaseSchemas.create),
    KnowledgeBaseController.createKnowledgeBase
  );

router
  .route('/:kbId')
  .get(validateParams({ kbId: commonSchemas.id }), KnowledgeBaseController.getKnowledgeBase)
  .put(
    validateParams({ kbId: commonSchemas.id }),
    validateBody(knowledgeBaseSchemas.update),
    KnowledgeBaseController.updateKnowledgeBase
  )
  .delete(validateParams({ kbId: commonSchemas.id }), KnowledgeBaseController.deleteKnowledgeBase);

// File management
router.post(
  '/:kbId/files',
  validateParams({ kbId: commonSchemas.id }),
  upload.array('files', 5),
  validateBody(knowledgeBaseSchemas.addFiles),
  KnowledgeBaseController.addFiles
);

// Search knowledge base
router.post(
  '/:kbId/search',
  validateParams({ kbId: commonSchemas.id }),
  validateBody(knowledgeBaseSchemas.search),
  KnowledgeBaseController.searchKnowledgeBase
);

module.exports = router;
