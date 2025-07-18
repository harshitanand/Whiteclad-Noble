/* eslint-disable no-underscore-dangle */
const Promise = require('bluebird');
const TestNumber = require('../models/TestNumber');
const Agent = require('../models/Agent');
const Campaign = require('../models/Campaign');
const AuditLog = require('../models/AuditLog');
const PermissionService = require('./permission.service');
const { NotFoundError, AuthorizationError, ConflictError } = require('../utils/errors');
const { AUDIT_ACTIONS, PERMISSIONS } = require('../utils/constants');
const logger = require('../config/logger');

class TestNumberService {
  /**
   * Create a new test number
   */
  static async createTestNumber(testNumberData, userId, organizationId, userRole) {
    try {
      // Check permissions
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_CREATE)) {
        throw new AuthorizationError('Insufficient permissions to create test numbers');
      }

      // Check if phone number already exists in organization
      const existingTestNumber = await TestNumber.findByPhone(testNumberData.phone, organizationId);
      if (existingTestNumber) {
        throw new ConflictError('Phone number already exists in this organization');
      }

      // Create test number
      const testNumber = new TestNumber({
        ...testNumberData,
        organizationId,
        createdBy: userId,
        status: 'active',
      });

      await testNumber.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_CREATED, // We can add TEST_NUMBER_CREATED later
        userId,
        organizationId,
        resourceType: 'testnumber',
        resourceId: testNumber._id.toString(),
        details: {
          name: testNumber.name,
          phone: testNumber.phone,
          email: testNumber.email,
        },
      });

      logger.info('Test number created:', {
        testerId: testNumber._id,
        name: testNumber.name,
        phone: testNumber.phone,
        createdBy: userId,
      });

      return testNumber;
    } catch (error) {
      logger.error('Failed to create test number:', error);
      throw error;
    }
  }

  /**
   * Get test numbers with filtering and pagination
   */
  static async getTestNumbers(query, userId, organizationId, userRole) {
    try {
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_READ)) {
        throw new AuthorizationError('Insufficient permissions to read test numbers');
      }

      const { page = 1, limit = 20, search, status } = query;

      // Build filter
      const filter = { organizationId, isActive: true, deletedAt: null };

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      if (status) filter.status = status;

      // Apply role-based filtering
      if (!PermissionService.hasMinimumRole(userRole, 'team_lead')) {
        filter.createdBy = userId;
      }

      const skip = (page - 1) * limit;
      const [testNumbers, total] = await Promise.all([
        TestNumber.find(filter)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit, 10))
          .skip(skip)
          .lean(),
        TestNumber.countDocuments(filter),
      ]);

      return {
        testNumbers,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get test numbers:', error);
      throw error;
    }
  }

  /**
   * Get test number by ID
   */
  static async getTestNumberById(testerId, userId, organizationId, userRole) {
    try {
      const testNumber = await TestNumber.findOne({
        _id: testerId,
        organizationId,
        isActive: true,
        deletedAt: null,
      });

      if (!testNumber) {
        throw new NotFoundError('Test Number');
      }

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_READ, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to access this test number');
      }

      return testNumber;
    } catch (error) {
      logger.error('Failed to get test number:', error);
      throw error;
    }
  }

  /**
   * Update test number
   */
  static async updateTestNumber(testerId, updateData, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to update this test number');
      }

      // Check if phone number already exists (if updating phone)
      if (updateData.phone && updateData.phone !== testNumber.phone) {
        const existingTestNumber = await TestNumber.findByPhone(updateData.phone, organizationId);
        if (existingTestNumber) {
          throw new ConflictError('Phone number already exists in this organization');
        }
      }

      // Update test number
      Object.assign(testNumber, updateData);
      await testNumber.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_UPDATED,
        userId,
        organizationId,
        resourceType: 'testnumber',
        resourceId: testNumber._id.toString(),
        details: {
          changes: Object.keys(updateData),
          name: testNumber.name,
          phone: testNumber.phone,
        },
      });

      logger.info('Test number updated:', {
        testerId: testNumber._id,
        updatedBy: userId,
        changes: Object.keys(updateData),
      });

      return testNumber;
    } catch (error) {
      logger.error('Failed to update test number:', error);
      throw error;
    }
  }

  /**
   * Delete test number
   */
  static async deleteTestNumber(testerId, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_DELETE, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to delete this test number');
      }

      // Soft delete
      testNumber.deletedAt = new Date();
      testNumber.isActive = false;
      await testNumber.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_DELETED,
        userId,
        organizationId,
        resourceType: 'testnumber',
        resourceId: testNumber._id.toString(),
        details: {
          name: testNumber.name,
          phone: testNumber.phone,
          testCalls: testNumber.testCalls.length,
        },
      });

      logger.info('Test number deleted:', {
        testerId: testNumber._id,
        deletedBy: userId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete test number:', error);
      throw error;
    }
  }

  /**
   * Activate test number
   */
  static async activateTestNumber(testerId, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to activate this test number');
      }

      await testNumber.activate();

      logger.info('Test number activated:', {
        testerId: testNumber._id,
        activatedBy: userId,
      });

      return testNumber;
    } catch (error) {
      logger.error('Failed to activate test number:', error);
      throw error;
    }
  }

  /**
   * Deactivate test number
   */
  static async deactivateTestNumber(testerId, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to deactivate this test number');
      }

      await testNumber.deactivate();

      logger.info('Test number deactivated:', {
        testerId: testNumber._id,
        deactivatedBy: userId,
      });

      return testNumber;
    } catch (error) {
      logger.error('Failed to deactivate test number:', error);
      throw error;
    }
  }

  /**
   * Block test number
   */
  static async blockTestNumber(testerId, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to block this test number');
      }

      await testNumber.block();

      logger.info('Test number blocked:', {
        testerId: testNumber._id,
        blockedBy: userId,
      });

      return testNumber;
    } catch (error) {
      logger.error('Failed to block test number:', error);
      throw error;
    }
  }

  /**
   * Add test call record
   */
  static async addTestCall(testerId, testCallData, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError(
          'Insufficient permissions to add test call to this test number'
        );
      }

      // Validate agent exists if provided
      if (testCallData.agentId) {
        const agent = await Agent.findOne({
          _id: testCallData.agentId,
          organizationId,
          isActive: true,
          deletedAt: null,
        });

        if (!agent) {
          throw new NotFoundError('Agent not found or not accessible');
        }
      }

      // Validate campaign exists if provided
      if (testCallData.campaignId) {
        const campaign = await Campaign.findOne({
          _id: testCallData.campaignId,
          organizationId,
          isActive: true,
          deletedAt: null,
        });

        if (!campaign) {
          throw new NotFoundError('Campaign not found or not accessible');
        }
      }

      // Add test call
      await testNumber.addTestCall(testCallData);

      logger.info('Test call added:', {
        testerId: testNumber._id,
        agentId: testCallData.agentId,
        campaignId: testCallData.campaignId,
        successful: testCallData.successful,
        addedBy: userId,
      });

      return testNumber;
    } catch (error) {
      logger.error('Failed to add test call:', error);
      throw error;
    }
  }

  /**
   * Get test calls for a test number
   */
  static async getTestCalls(testerId, query, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      const { page = 1, limit = 20 } = query;

      // Get test calls with pagination
      const skip = (page - 1) * limit;
      const testCalls = testNumber.testCalls
        .sort((a, b) => new Date(b.callDate) - new Date(a.callDate))
        .slice(skip, skip + limit);

      const total = testNumber.testCalls.length;

      return {
        testCalls,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
        averageRating: testNumber.averageRating,
        totalTestCalls: testNumber.totalTestCalls,
      };
    } catch (error) {
      logger.error('Failed to get test calls:', error);
      throw error;
    }
  }

  /**
   * Get active testers for organization
   */
  static async getActiveTesters(organizationId) {
    try {
      const activeTesters = await TestNumber.getActiveTesters(organizationId);

      return activeTesters.map((tester) => ({
        id: tester._id,
        name: tester.name,
        phone: tester.phone,
        email: tester.email,
        totalTestCalls: tester.totalTestCalls,
        averageRating: tester.averageRating,
        preferences: tester.preferences,
      }));
    } catch (error) {
      logger.error('Failed to get active testers:', error);
      throw error;
    }
  }

  /**
   * Update test number preferences
   */
  static async updatePreferences(testerId, preferences, userId, organizationId, userRole) {
    try {
      const testNumber = await this.getTestNumberById(testerId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: testNumber.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to update test number preferences');
      }

      await testNumber.updatePreferences(preferences);

      logger.info('Test number preferences updated:', {
        testerId: testNumber._id,
        updatedBy: userId,
      });

      return testNumber;
    } catch (error) {
      logger.error('Failed to update test number preferences:', error);
      throw error;
    }
  }

  /**
   * Bulk operations for test numbers
   */
  static async bulkUpdateStatus(testerIds, status, userId, organizationId, userRole) {
    try {
      // Check permissions
      if (!PermissionService.hasMinimumRole(userRole, 'team_lead')) {
        throw new AuthorizationError('Insufficient permissions for bulk operations');
      }

      const results = {
        success: [],
        failed: [],
      };

      await Promise.map(
        testerIds,
        async (testerId) => {
          try {
            const testNumber = await TestNumber.findOne({
              _id: testerId,
              organizationId,
              isActive: true,
              deletedAt: null,
            });

            if (!testNumber) {
              return { success: false, data: { testerId, reason: 'Test number not found' } };
            }

            testNumber.status = status;
            await testNumber.save();

            return {
              success: true,
              data: { testerId, name: testNumber.name },
            };
          } catch (error) {
            return {
              success: false,
              data: { testerId, reason: error.message },
            };
          }
        },
        { concurrency: 5 }
      ) // Process 5 test numbers at a time
        .each((result) => {
          if (result.success) {
            results.success.push(result.data);
          } else {
            results.failed.push(result.data);
          }
        });

      logger.info('Bulk status update completed:', {
        status,
        success: results.success.length,
        failed: results.failed.length,
        updatedBy: userId,
      });

      return results;
    } catch (error) {
      logger.error('Failed to bulk update test number status:', error);
      throw error;
    }
  }
}

module.exports = TestNumberService;
