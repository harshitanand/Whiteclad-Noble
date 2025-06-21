const Joi = require('joi');
require('dotenv').config();

// Configuration schema validation
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  
  // Database
  MONGODB_URI: Joi.string().required(),
  DB_NAME: Joi.string().default('ai_agents_platform'),
  
  // Redis
  REDIS_URL: Joi.string().required(),
  
  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: Joi.string().required(),
  CLERK_SECRET_KEY: Joi.string().required(),
  CLERK_WEBHOOK_SECRET: Joi.string().required(),
  
  // External APIs
  OPENAI_API_KEY: Joi.string().required(),
  ANTHROPIC_API_KEY: Joi.string().required(),
  
  // Stripe Billing
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  
  // Email
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  FROM_EMAIL: Joi.string().email().required(),
  
  // App Settings
  FRONTEND_URL: Joi.string().uri().required(),
  API_VERSION: Joi.string().default('v1'),
  JWT_SECRET: Joi.string().min(32).required(),
  
  // File Storage
  AWS_ACCESS_KEY_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  // Monitoring
  SENTRY_DSN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  SESSION_SECRET: Joi.string().min(32).required(),
  
  // Feature Flags
  ENABLE_ANALYTICS: Joi.boolean().default(true),
  ENABLE_AUDIT_LOGS: Joi.boolean().default(true),
  ENABLE_RATE_LIMITING: Joi.boolean().default(true)
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
  
  // Database configuration
  database: {
    uri: envVars.MONGODB_URI,
    name: envVars.DB_NAME,
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    }
  },
  
  // Redis configuration
  redis: {
    url: envVars.REDIS_URL,
    options: {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    }
  },
  
  // Clerk authentication
  clerk: {
    publishableKey: envVars.CLERK_PUBLISHABLE_KEY,
    secretKey: envVars.CLERK_SECRET_KEY,
    webhookSecret: envVars.CLERK_WEBHOOK_SECRET
  },
  
  // External API keys
  apis: {
    openai: {
      apiKey: envVars.OPENAI_API_KEY,
      organization: envVars.OPENAI_ORG_ID
    },
    anthropic: {
      apiKey: envVars.ANTHROPIC_API_KEY
    }
  },
  
  // Stripe billing
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
    plans: {
      free: 'price_free',
      pro: 'price_pro', 
      enterprise: 'price_enterprise'
    }
  },
  
  // Email configuration
  email: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    secure: envVars.SMTP_PORT === 465,
    auth: {
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASS
    },
    from: envVars.FROM_EMAIL
  },
  
  // Application settings
  app: {
    frontendUrl: envVars.FRONTEND_URL,
    apiVersion: envVars.API_VERSION,
    jwtSecret: envVars.JWT_SECRET,
    sessionSecret: envVars.SESSION_SECRET
  },
  
  // AWS/S3 configuration
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3Bucket: envVars.AWS_S3_BUCKET
  },
  
  // Security settings
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    rateLimiting: {
      enabled: envVars.ENABLE_RATE_LIMITING,
      windowMs: envVars.RATE_LIMIT_WINDOW_MS,
      maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
    },
    cors: {
      origin: envVars.NODE_ENV === 'production' 
        ? [envVars.FRONTEND_URL]
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }
  },
  
  // Feature flags
  features: {
    analytics: envVars.ENABLE_ANALYTICS,
    auditLogs: envVars.ENABLE_AUDIT_LOGS,
    rateLimiting: envVars.ENABLE_RATE_LIMITING
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: envVars.SENTRY_DSN
  },
  
  // Plan limits
  plans: {
    free: {
      maxAgents: 3,
      maxMembers: 2,
      apiCallsPerMonth: 1000,
      storageLimit: '100MB',
      features: ['basic_agents', 'community_support']
    },
    pro: {
      maxAgents: 50,
      maxMembers: 10,
      apiCallsPerMonth: 50000,
      storageLimit: '10GB',
      features: ['basic_agents', 'advanced_agents', 'api_access', 'priority_support', 'analytics']
    },
    enterprise: {
      maxAgents: -1, // unlimited
      maxMembers: -1,
      apiCallsPerMonth: -1,
      storageLimit: 'unlimited',
      features: ['all']
    }
  }
};

module.exports = config;
