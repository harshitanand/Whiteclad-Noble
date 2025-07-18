/* eslint-disable no-underscore-dangle */
const UserService = require('../../../src/services/user.service');
const AuditLog = require('../../../src/models/AuditLog');
const { createTestUser } = require('../../fixtures/testData');
const { NotFoundError } = require('../../../src/utils/errors');

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = createTestUser();

      const user = await UserService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.clerkId).toBe(userData.clerkId);
      expect(user.email).toBe(userData.email);
    });

    it('should return existing user if already exists', async () => {
      const userData = createTestUser();

      // Create user first time
      const firstUser = await UserService.createUser(userData);

      // Try to create same user again
      const secondUser = await UserService.createUser(userData);

      expect(firstUser._id.toString()).toBe(secondUser._id.toString());
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userData = createTestUser();
      const createdUser = await UserService.createUser(userData);

      const foundUser = await UserService.getUserById(userData.clerkId);

      expect(foundUser._id.toString()).toBe(createdUser._id.toString());
    });

    it('should throw NotFoundError when user not found', async () => {
      await expect(UserService.getUserById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userData = createTestUser();
      await UserService.createUser(userData);

      const updateData = { firstName: 'Updated' };
      const updatedUser = await UserService.updateUser(userData.clerkId, updateData);

      expect(updatedUser.firstName).toBe('Updated');
    });

    it('should create audit log when updating user', async () => {
      const userData = createTestUser();
      await UserService.createUser(userData);

      const updateData = { firstName: 'Updated' };
      await UserService.updateUser(userData.clerkId, updateData);

      const auditLogs = await AuditLog.find({ userId: userData.clerkId });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('user.updated');
    });
  });
});
