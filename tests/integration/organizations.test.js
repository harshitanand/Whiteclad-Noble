const { request, app } = require('../setup/testServer');
const Organization = require('../../src/models/Organization');
const User = require('../../src/models/User');
const { createTestOrganization, createTestUser } = require('../fixtures/testData');

describe('Organization Endpoints', () => {
  let testUser;
  let testOrganization;

  beforeEach(async () => {
    // Create test user and organization
    testUser = new User(createTestUser());
    await testUser.save();

    testOrganization = new Organization(createTestOrganization());
    await testOrganization.save();
  });

  describe('GET /api/v1/organizations', () => {
    it('should return organization details', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.organization).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/organizations').expect(401);
    });
  });

  describe('PUT /api/v1/organizations', () => {
    it('should update organization details', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        description: 'Updated description',
      };

      const response = await request(app)
        .put('/api/v1/organizations')
        .set('Authorization', 'Bearer valid_token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should validate update data', async () => {
      const updateData = {
        name: '', // Invalid: empty name
      };

      await request(app)
        .put('/api/v1/organizations')
        .set('Authorization', 'Bearer valid_token')
        .send(updateData)
        .expect(400);
    });
  });

  describe('GET /api/v1/organizations/members', () => {
    it('should return organization members', async () => {
      const response = await request(app)
        .get('/api/v1/organizations/members')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toBeDefined();
      expect(Array.isArray(response.body.data.members)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/organizations/members?page=1&limit=5')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('POST /api/v1/organizations/members', () => {
    it('should invite a new member', async () => {
      const invitationData = {
        email: 'newmember@example.com',
        role: 'org:member',
      };

      const response = await request(app)
        .post('/api/v1/organizations/members')
        .set('Authorization', 'Bearer valid_token')
        .send(invitationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('invited');
    });

    it('should validate invitation data', async () => {
      const invitationData = {
        email: 'invalid-email',
        role: 'invalid-role',
      };

      await request(app)
        .post('/api/v1/organizations/members')
        .set('Authorization', 'Bearer valid_token')
        .send(invitationData)
        .expect(400);
    });

    it('should require valid email', async () => {
      const invitationData = {
        email: '',
        role: 'org:member',
      };

      await request(app)
        .post('/api/v1/organizations/members')
        .set('Authorization', 'Bearer valid_token')
        .send(invitationData)
        .expect(400);
    });
  });

  describe('GET /api/v1/organizations/usage', () => {
    it('should return usage statistics', async () => {
      const response = await request(app)
        .get('/api/v1/organizations/usage')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.current).toBeDefined();
      expect(response.body.data.stats.limits).toBeDefined();
    });
  });
});
