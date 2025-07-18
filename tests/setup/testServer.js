const request = require('supertest');
const app = require('../../src/app');

// Mock Clerk for testing
jest.mock('@clerk/clerk-sdk-node', () => ({
  ClerkExpressRequireAuth: () => (req, res, next) => {
    req.auth = {
      userId: 'test_user_123',
      orgId: 'test_org_123',
    };
    next();
  },
  ClerkExpressWithAuth: () => (req, res, next) => {
    req.auth = {
      userId: 'test_user_123',
      orgId: 'test_org_123',
    };
    next();
  },
  clerkClient: {
    users: {
      getUser: jest.fn().mockResolvedValue({
        id: 'test_user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      }),
      updateUser: jest.fn(),
      getOrganizationMembershipList: jest.fn().mockResolvedValue([]),
    },
    organizations: {
      getOrganization: jest.fn().mockResolvedValue({
        id: 'test_org_123',
        name: 'Test Organization',
      }),
      getOrganizationMembership: jest.fn().mockResolvedValue({
        role: 'org:admin',
        permissions: ['org:read', 'org:write'],
      }),
    },
  },
}));

module.exports = { request, app };
