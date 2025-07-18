const KnowledgeBaseService = require('../services/knowledgebase.service');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class KnowledgeBaseController {
  static createKnowledgeBase = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const knowledgeBase = await KnowledgeBaseService.createKnowledgeBase(
      req.body,
      req.files,
      userId,
      orgId,
      userRole
    );

    logger.info('Knowledge base created:', {
      // eslint-disable-next-line no-underscore-dangle
      kbId: knowledgeBase._id,
      name: knowledgeBase.kb_name,
      createdBy: userId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Knowledge base created successfully',
      data: { knowledgeBase },
    });
  });

  static getKnowledgeBases = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const result = await KnowledgeBaseService.getKnowledgeBases(req.query, userId, orgId, userRole);

    res.json({
      success: true,
      data: result,
    });
  });

  static getKnowledgeBase = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { kbId } = req.params;

    const knowledgeBase = await KnowledgeBaseService.getKnowledgeBaseById(
      kbId,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      data: { knowledgeBase },
    });
  });

  static updateKnowledgeBase = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { kbId } = req.params;

    const knowledgeBase = await KnowledgeBaseService.updateKnowledgeBase(
      kbId,
      req.body,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Knowledge base updated successfully',
      data: { knowledgeBase },
    });
  });

  static deleteKnowledgeBase = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { kbId } = req.params;

    await KnowledgeBaseService.deleteKnowledgeBase(kbId, userId, orgId, userRole);

    res.status(HTTP_STATUS.NO_CONTENT).json({
      success: true,
      message: 'Knowledge base deleted successfully',
    });
  });

  static addFiles = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { kbId } = req.params;

    const knowledgeBase = await KnowledgeBaseService.addFiles(
      kbId,
      req.files,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Files added successfully',
      data: { knowledgeBase },
    });
  });

  static searchKnowledgeBase = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { kbId } = req.params;

    const results = await KnowledgeBaseService.searchKnowledgeBase(
      kbId,
      req.body.query,
      req.body.limit,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      data: { results },
    });
  });
}

module.exports = KnowledgeBaseController;
