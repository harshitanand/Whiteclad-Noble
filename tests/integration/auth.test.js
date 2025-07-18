const { request, app } = require('../setup/testServer');

describe('Authentication Integration', () => {
  describe('Protected Routes', () => {
    it('should require authentication for protected routes', async () => {
      // Mock no auth
      jest.clearAllMocks();
      jest.mock('@clerk/clerk-sdk-node', () => ({
        ClerkExpressRequireAuth: () => (req, res, next) => {
          res.status(401).json({ error: 'Unauthorized' });
        },
      }));

      const response = await request(app).get('/api/v1/agents').expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Webhook Endpoints', () => {
    it('should handle user creation webhook', async () => {
      const webhookData = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User',
        },
      };

      const response = await request(app)
        .post('/api/v1/auth/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.received).toBe(true);
    });
  });
});
