const TestNumberService = require('../services/testnumber.service');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class TestNumberController {
  static createTestNumber = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const testNumber = await TestNumberService.createTestNumber(req.body, userId, orgId, userRole);

    logger.info('Test number created:', {
      testerId: testNumber._id,
      name: testNumber.name,
      phone: testNumber.phone,
      createdBy: userId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Test number created successfully',
      data: { testNumber },
    });
  });

  static getTestNumbers = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;

    const result = await TestNumberService.getTestNumbers(req.query, userId, orgId, userRole);

    res.json({
      success: true,
      data: result,
    });
  });

  static getTestNumber = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    const testNumber = await TestNumberService.getTestNumberById(testerId, userId, orgId, userRole);

    res.json({
      success: true,
      data: { testNumber },
    });
  });

  static updateTestNumber = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    const testNumber = await TestNumberService.updateTestNumber(
      testerId,
      req.body,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Test number updated successfully',
      data: { testNumber },
    });
  });

  static deleteTestNumber = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    await TestNumberService.deleteTestNumber(testerId, userId, orgId, userRole);

    res.status(HTTP_STATUS.NO_CONTENT).json({
      success: true,
      message: 'Test number deleted successfully',
    });
  });

  static activateTestNumber = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    const testNumber = await TestNumberService.activateTestNumber(
      testerId,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Test number activated successfully',
      data: { testNumber },
    });
  });

  static deactivateTestNumber = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    const testNumber = await TestNumberService.deactivateTestNumber(
      testerId,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Test number deactivated successfully',
      data: { testNumber },
    });
  });

  static blockTestNumber = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    const testNumber = await TestNumberService.blockTestNumber(testerId, userId, orgId, userRole);

    res.json({
      success: true,
      message: 'Test number blocked successfully',
      data: { testNumber },
    });
  });

  static addTestCall = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    const testNumber = await TestNumberService.addTestCall(
      testerId,
      req.body,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      message: 'Test call recorded successfully',
      data: { testNumber },
    });
  });

  static getTestCalls = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { testerId } = req.params;

    const testCalls = await TestNumberService.getTestCalls(
      testerId,
      req.query,
      userId,
      orgId,
      userRole
    );

    res.json({
      success: true,
      data: testCalls,
    });
  });
}

module.exports = TestNumberController;
