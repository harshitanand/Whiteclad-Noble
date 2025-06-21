const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../../src/config');
const logger = require('../../src/config/logger');

let mongod;

// Setup test database before all tests
beforeAll(async () => {
  try {
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Test database connected');
  } catch (error) {
    logger.error('Test database setup failed:', error);
    throw error;
  }
});

// Clean database between tests
beforeEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    logger.error('Database cleanup failed:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
    
    logger.info('Test database cleaned up');
  } catch (error) {
    logger.error('Test database cleanup failed:', error);
    throw error;
  }
});

// Helper functions for tests
global.testHelpers = {
  createTestUser: async (userData = {}) => {
    const User = require('../../src/models/User');
    return await User.create({
      clerkId: `test_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      ...userData
    });
  },
  
  createTestOrganization: async (orgData = {}) => {
    const Organization = require('../../src/models/Organization');
    return await Organization.create({
      clerkId: `org_test_${Date.now()}`,
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      ...orgData
    });
  },
  
  createTestAgent: async (agentData = {}) => {
    const Agent = require('../../src/models/Agent');
    return await Agent.create({
      name: `Test Agent ${Date.now()}`,
      description: 'Test agent description',
      type: 'chatbot',
      organizationId: `org_test_${Date.now()}`,
      createdBy: `user_test_${Date.now()}`,
      config: {
        model: 'gpt-3.5-turbo',
        instructions: 'Test instructions',
        temperature: 0.7,
        maxTokens: 1000
      },
      ...agentData
    });
  }
};
