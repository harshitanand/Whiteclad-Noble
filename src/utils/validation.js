// src/utils/validation.js - Updated to match your frontend Zod schemas
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

// Agent schemas matching your frontend forms
const agentSchemas = {
  // Agent Identity (form-new-agent-identity)
  createIdentity: Joi.object({
    name: Joi.string().min(3).max(10).required(),
    language: Joi.string().valid('en', 'fr', 'de', 'es', 'pt', 'ru', 'ja', 'ko', 'zh').required(),
    description: Joi.string().required(),
    active: Joi.boolean().default(true),
  }),

  // Agent Persona (form-new-agent-persona)
  updatePersona: Joi.object({
    voiceType: Joi.string().valid('male', 'female', 'neutral').required(),
    voice: Joi.string().required(),
  }),

  // Agent Work (form-new-agent-work)
  updateWork: Joi.object({
    companyName: Joi.string().min(2).required(),
    productDescription: Joi.string().min(10).required(),
    questions: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        question: Joi.string().min(5).required(),
        number: Joi.number().positive().required(),
      })
    ).min(1).required(),
    faqs: Joi.string().min(20).required(),
    agentIntroduction: Joi.string().min(50).required(),
  }).strict(),

  // Demo form (form-demo)
  demoSubmission: Joi.object({
    agentName: Joi.string().min(2).required(),
    language: Joi.string().min(2).required(),
    voice: Joi.string().min(2).required(),
    phone: Joi.string().min(10).required(),
    reason: Joi.string().min(20).required(),
  }),

  // Original create/update (maintained for compatibility)
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

// Campaign schemas matching your frontend forms
const campaignSchemas = {
  // Campaign Basic Info (form-new-campaign)
  create: Joi.object({
    campaignName: Joi.string().min(1).required(),
    agent: Joi.string().required(), // ObjectId as string
    dialingNumber: Joi.string().required(),
    timeZone: Joi.string().required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
  }),

  // Campaign Call Configuration (form-new-campaign-call)
  updateCallConfig: Joi.object({
    files: Joi.array().items(Joi.any()).optional(), // File objects
    country: Joi.string().required(),
    from: Joi.string().required(),
    fromPeriod: Joi.string().valid('AM', 'PM').required(),
    to: Joi.string().required(),
    toPeriod: Joi.string().valid('AM', 'PM').required(),
    retry: Joi.string().required(),
    coolDown: Joi.string().required(),
    maxCallDuration: Joi.string().required(),
    inactiveDuration: Joi.string().required(),
  }),

  update: Joi.object({
    campaignName: Joi.string().min(1),
    agent: Joi.string(),
    dialingNumber: Joi.string(),
    timeZone: Joi.string(),
    startTime: Joi.date(),
    endTime: Joi.date(),
    status: Joi.string().valid('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'),
  }).min(1),

  query: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'),
    agent: Joi.string(),
    search: Joi.string().trim(),
  })
};

// Knowledge Base schemas
const knowledgeBaseSchemas = {
  // Knowledge Base Creation (form-new-knowledgebase)
  create: Joi.object({
    kb_name: Joi.string().min(1).required(),
    kb_files: Joi.array().items(Joi.any()).optional(), // File objects
    description: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
  }),

  update: Joi.object({
    kb_name: Joi.string().min(1),
    description: Joi.string().max(500),
    tags: Joi.array().items(Joi.string().trim()),
  }).min(1),

  addFiles: Joi.object({
    files: Joi.array().items(Joi.any()).min(1).required(),
  }),

  search: Joi.object({
    query: Joi.string().min(1).required(),
    limit: Joi.number().min(1).max(50).default(10),
  }),

  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().trim(),
    status: Joi.string().valid('uploading', 'processing', 'ready', 'error'),
    tags: Joi.array().items(Joi.string()),
  })
};

// Test Number schemas
const testNumberSchemas = {
  // Test Number Creation (form-new-test-number)
  create: Joi.object({
    name: Joi.string().min(3).required(),
    phone: Joi.string().required(), // Phone validation handled by frontend
    email: Joi.string().email().required(),
    preferences: Joi.object({
      timezone: Joi.string(),
      availableHours: Joi.object({
        start: Joi.string(),
        end: Joi.string(),
      }),
      preferredDays: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      ),
    }).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(3),
    phone: Joi.string(),
    email: Joi.string().email(),
    status: Joi.string().valid('active', 'inactive', 'blocked'),
    preferences: Joi.object({
      timezone: Joi.string(),
      availableHours: Joi.object({
        start: Joi.string(),
        end: Joi.string(),
      }),
      preferredDays: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      ),
    }),
  }).min(1),

  addTestCall: Joi.object({
    agentId: Joi.string().required(),
    campaignId: Joi.string().optional(),
    duration: Joi.number().min(0),
    successful: Joi.boolean().required(),
    feedback: Joi.string().max(1000),
    rating: Joi.number().min(1).max(5),
    notes: Joi.string().max(500),
  }),

  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().trim(),
    status: Joi.string().valid('active', 'inactive', 'blocked'),
  })
};

// User schemas (kept from original for compatibility)
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

// Organization schemas (kept from original for compatibility)
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

// Call schemas for LiveKit integration
const callSchemas = {
  createWebCall: Joi.object({
    agentId: commonSchemas.id.required(),
    participantName: Joi.string().min(1).max(50).default('user'),
    enableVideo: Joi.boolean().default(false),
    enableAudio: Joi.boolean().default(true),
    duration: Joi.number().min(60).max(7200).default(3600),
    agentName: Joi.string().min(1).max(100),
    agentMetadata: Joi.object().default({}),
  }),

  createSipCall: Joi.object({
    agentId: commonSchemas.id.required(),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
    participantName: Joi.string().min(1).max(50),
    duration: Joi.number().min(60).max(3600).default(1800),
    sipOptions: Joi.object({
      transport: Joi.string().valid('UDP', 'TCP', 'TLS').default('UDP'),
      codec: Joi.string().valid('PCMU', 'PCMA', 'G722', 'G729').default('PCMU'),
    }).default({}),
    agentName: Joi.string().min(1).max(100),
    agentMetadata: Joi.object().default({}),
  }),

  agentDispatch: Joi.object({
    roomName: Joi.string().required(),
    agentName: Joi.string().required(),
    agentId: commonSchemas.id,
    metadata: Joi.object().default({}),
  }),

  endCall: Joi.object({
    reason: Joi.string().max(200).default('call_ended'),
  }),

  updateMetadata: Joi.object({
    metadata: Joi.object().required(),
  })
};

module.exports = {
  commonSchemas,
  userSchemas,
  organizationSchemas,
  agentSchemas,
  campaignSchemas,
  knowledgeBaseSchemas,
  testNumberSchemas,
  callSchemas,
};
