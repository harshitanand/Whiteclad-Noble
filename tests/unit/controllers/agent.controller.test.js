const { request, app } = require('../../setup/testServer');
const Agent = require('../../../src/models/Agent');
const { createTestAgent } = require('../../fixtures/testData');

describe('Agent Controller', () => {
  describe('POST /api/v1/agents', () => {
    it('should create agent successfully', async () => {
      const agentData = createTestAgent();

      const response = await request(app).post('/api/v1/agents').send(agentData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agent.name).toBe(agentData.name);
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/api/v1/agents').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/agents', () => {
    it('should return agents list', async () => {
      // Create test agents
      const agent1 = new Agent(createTestAgent());
      const agent2 = new Agent(createTestAgent());
      await agent1.save();
      await agent2.save();

      const response = await request(app).get('/api/v1/agents').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const response = await request(app).get('/api/v1/agents?page=1&limit=5').expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });
});
