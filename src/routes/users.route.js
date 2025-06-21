const express = require('express');
const UserController = require('./user.controller');
const { requireAuth, requireOrganization } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { requirePermission, requireRole } = require('../middleware/permission.middleware');
const { userSchemas, commonSchemas } = require('../utils/validation');
const multer = require('multer');
const { PERMISSIONS } = require('../utils/constants');
const Joi = require('joi');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Apply auth middleware to all routes
router.use(requireAuth);

// Self-service routes (no organization required)
router
  .route('/profile')
  .get(UserController.getProfile)
  .put(
    validateBody(userSchemas.update),
    UserController.updateProfile
  );

router
  .route('/preferences')
  .get(UserController.getPreferences)
  .put(
    validateBody(Joi.object({
      preferences: Joi.object({
        theme: Joi.string().valid('light', 'dark', 'system'),
        notifications: Joi.object({
          email: Joi.boolean(),
          push: Joi.boolean(),
          marketing: Joi.boolean()
        }),
        language: Joi.string().min(2).max(5)
      }),
      metadata: Joi.object()
    })),
    UserController.updatePreferences
  );

router.post('/avatar',
  upload.single('avatar'),
  UserController.uploadAvatar
);

router.get('/organizations', UserController.getUserOrganizations);
router.get('/stats', UserController.getUserStats);

router.post('/change-password',
  validateBody(Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required()
  })),
  UserController.changePassword
);

// Organization-scoped routes
router.use(requireOrganization);

// Admin/Team Lead routes
router.get('/',
  requireRole('team_lead'),
  validateQuery(userSchemas.query),
  UserController.getUsers
);

router
  .route('/:userId')
  .get(
    validateParams({ userId: commonSchemas.id }),
    UserController.getUser
  )
  .put(
    requirePermission(PERMISSIONS.SYSTEM_ADMIN),
    validateParams({ userId: commonSchemas.id }),
    validateBody(userSchemas.update),
    UserController.updateUser
  )
  .delete(
    validateParams({ userId: commonSchemas.id }),
    UserController.deleteUser
  );

router.put('/:userId/deactivate',
  requirePermission(PERMISSIONS.SYSTEM_ADMIN),
  validateParams({ userId: commonSchemas.id }),
  UserController.deactivateUser
);

router.put('/:userId/reactivate',
  requirePermission(PERMISSIONS.SYSTEM_ADMIN),
  validateParams({ userId: commonSchemas.id }),
  UserController.reactivateUser
);

router.get('/:userId/activity',
  validateParams({ userId: commonSchemas.id }),
  validateQuery({
    ...commonSchemas.pagination,
    action: Joi.string(),
    startDate: Joi.date(),
    endDate: Joi.date()
  }),
  UserController.getUserActivity
);

module.exports = router;
