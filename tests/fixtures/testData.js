const { faker } = require('@faker-js/faker');

const createTestUser = (overrides = {}) => ({
  clerkId: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  bio: faker.lorem.paragraph(),
  role: faker.helpers.arrayElement(['org:member', 'agent_creator', 'team_lead', 'org:admin']),
  isActive: true,
  ...overrides
});

const createTestOrganization = (overrides = {}) => ({
  clerkId: faker.string.uuid(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
  description: faker.company.catchPhrase(),
  plan: faker.helpers.arrayElement(['free', 'pro', 'enterprise']),
  ...overrides
});

const createTestAgent = (overrides = {}) => ({
  name: faker.lorem.words(3),
  description: faker.lorem.paragraph(),
  type: faker.helpers.arrayElement(['chatbot', 'assistant', 'analyzer', 'generator']),
  organizationId: faker.string.uuid(),
  createdBy: faker.string.uuid(),
  status: faker.helpers.arrayElement(['draft', 'published']),
  config: {
    model: faker.helpers.arrayElement(['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet']),
    instructions: faker.lorem.paragraphs(2),
    temperature: faker.number.float({ min: 0.1, max: 1.5, fractionDigits: 1 }),
    maxTokens: faker.number.int({ min: 100, max: 2000 })
  },
  tags: faker.lorem.words(3).split(' '),
  isPublic: faker.datatype.boolean(),
  ...overrides
});

const createTestAuditLog = (overrides = {}) => ({
  action: faker.helpers.arrayElement([
    'user.created', 'user.updated', 'agent.created', 'agent.updated', 'org.created'
  ]),
  userId: faker.string.uuid(),
  organizationId: faker.string.uuid(),
  resourceType: faker.helpers.arrayElement(['user', 'organization', 'agent']),
  resourceId: faker.string.uuid(),
  details: {
    field: faker.lorem.word(),
    oldValue: faker.lorem.word(),
    newValue: faker.lorem.word()
  },
  metadata: {
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent()
  },
  ...overrides
});

module.exports = {
  createTestUser,
  createTestOrganization,
  createTestAgent,
  createTestAuditLog,
  
  // Bulk creation helpers
  createMultipleUsers: (count = 5, overrides = {}) => 
    Array.from({ length: count }, () => createTestUser(overrides)),
    
  createMultipleOrganizations: (count = 3, overrides = {}) => 
    Array.from({ length: count }, () => createTestOrganization(overrides)),
    
  createMultipleAgents: (count = 10, overrides = {}) => 
    Array.from({ length: count }, () => createTestAgent(overrides))
};
