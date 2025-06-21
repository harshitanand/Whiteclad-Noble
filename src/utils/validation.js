const Joi = require('joi');
const { AGENT_TYPES, AGENT_STATUS, SUBSCRIPTION_PLANS, ROLES } = require('./constants');

const commonSchemas = {
  id: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')),
  url: Joi.string().uri(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }
};

const userSchemas = {
  create: Joi.object({
    email: commonSchemas.email,
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.ORG_MEMBER)
  }),
  
  update: Joi.object({
    firstName: Joi.string().trim().min(1).max(50),
    lastName: Joi.string().trim().min(1).max(50),
    bio: Joi.string().max(500),
    preferences: Joi.object()
  }).min(1),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().trim(),
    role: Joi.string().valid(...Object.values(ROLES)),
    status: Joi.string().valid('active', 'inactive')
  })
};

const organizationSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    slug: Joi.string().trim().min(2).max(50).pattern(/^[a-z0-9-]+$/),
    description: Joi.string().max(500),
    plan: Joi.string().valid(...Object.values(SUBSCRIPTION_PLANS)).default(SUBSCRIPTION_PLANS.FREE)
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    description: Joi.string().max(500),
    settings: Joi.object()
  }).min(1),
  
  invitation: Joi.object({
    email: commonSchemas.email,
    role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.ORG_MEMBER),
    message: Joi.string().max(500)
  }),
  
  memberUpdate: Joi.object({
    role: Joi.string().valid(...Object.values(ROLES)).required()
  })
};

const agentSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().max(500).required(),
    type: Joi.string().valid(...Object.values(AGENT_TYPES)).required(),
    instructions: Joi.string().min(10).max(10000).required(),
    model: Joi.string().valid('gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2').required(),
    temperature: Joi.number().min(0).max(2).default(0.7),
    maxTokens: Joi.number().min(1).max(4000).default(1000),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
    isPublic: Joi.boolean().default(false),
    tools: Joi.array().items(Joi.object({
      type: Joi.string().required(),
      config: Joi.object()
    })),
    knowledgeBase: Joi.array().items(Joi.string()),
    metadata: Joi.object()
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    description: Joi.string().max(500),
    instructions: Joi.string().min(10).max(10000),
    temperature: Joi.number().min(0).max(2),
    maxTokens: Joi.number().min(1).max(4000),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
    isPublic: Joi.boolean(),
    tools: Joi.array().items(Joi.object({
      type: Joi.string().required(),
      config: Joi.object()
    })),
    metadata: Joi.object()
  }).min(1),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().trim(),
    type: Joi.string().valid(...Object.values(AGENT_TYPES)),
    status: Joi.string().valid(...Object.values(AGENT_STATUS)),
    tags: Joi.array().items(Joi.string()),
    isPublic: Joi.boolean(),
    createdBy: Joi.string()
  }),
  
  chat: Joi.object({
    message: Joi.string().trim().min(1).max(1000).required(),
    sessionId: Joi.string(),
    context: Joi.object()
  })
};

module.exports = {
  commonSchemas,
  userSchemas,
  organizationSchemas,
  agentSchemas
};
