// src/models/Agent.js - Updated to match your frontend forms
const mongoose = require('mongoose');
const { AGENT_TYPES, AGENT_STATUS } = require('../utils/constants');

const agentSchema = new mongoose.Schema(
  {
    // Identity fields (from form-new-agent-identity)
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 10,
    },
    language: {
      type: String,
      required: true,
      enum: ['en', 'fr', 'de', 'es', 'pt', 'ru', 'ja', 'ko', 'zh'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },

    // Persona fields (from form-new-agent-persona)
    voiceType: {
      type: String,
      enum: ['male', 'female', 'neutral'],
      required: true,
    },
    voice: {
      type: String,
      required: true, // Voice avatar name
    },

    // Work/Company Information (from form-new-agent-work)
    companyName: {
      type: String,
      required: true,
      minlength: 2,
    },
    productDescription: {
      type: String,
      required: true,
      minlength: 10,
    },
    questions: [
      {
        id: {
          type: String,
          required: true,
        },
        question: {
          type: String,
          required: true,
          minlength: 5,
        },
        number: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    faqs: {
      type: String,
      required: true,
      minlength: 20,
    },
    agentIntroduction: {
      type: String,
      required: true,
      minlength: 50,
    },

    // Knowledge Base (from form-new-agent-knowledgebase)
    knowledgeBase: [
      {
        id: String,
        name: String,
        type: {
          type: String,
          enum: ['document', 'url', 'text', 'api'],
        },
        source: String,
        content: String,
        metadata: mongoose.Schema.Types.Mixed,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Original fields maintained for compatibility
    type: {
      type: String,
      enum: Object.values(AGENT_TYPES),
      default: AGENT_TYPES.ASSISTANT,
    },
    status: {
      type: String,
      enum: Object.values(AGENT_STATUS),
      default: AGENT_STATUS.DRAFT,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },

    // AI Configuration (enhanced)
    config: {
      model: {
        type: String,
        required: true,
        enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'],
        default: 'gpt-3.5-turbo',
      },
      instructions: {
        type: String,
        required: true,
        maxlength: 10000,
      },
      temperature: {
        type: Number,
        min: 0,
        max: 2,
        default: 0.7,
      },
      maxTokens: {
        type: Number,
        min: 1,
        max: 4000,
        default: 1000,
      },
    },

    // Visibility and sharing
    visibility: {
      type: String,
      enum: ['private', 'organization', 'public'],
      default: 'private',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },

    // Metadata and analytics
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
    },

    // Analytics
    analytics: {
      totalConversations: {
        type: Number,
        default: 0,
      },
      totalMessages: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
      successRate: {
        type: Number,
        default: 100,
      },
      lastUsedAt: Date,
      usageThisMonth: {
        type: Number,
        default: 0,
      },
    },

    // Publishing
    publishedAt: Date,
    publishedBy: String,

    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
agentSchema.index({ organizationId: 1, isActive: 1 });
agentSchema.index({ createdBy: 1, isActive: 1 });
agentSchema.index({ status: 1, visibility: 1 });
agentSchema.index({ tags: 1 });
agentSchema.index({ type: 1, category: 1 });
agentSchema.index({ isPublic: 1, status: 1 });

// Methods for your multi-step form flow
agentSchema.methods.updateIdentity = function(identityData) {
  this.name = identityData.name;
  this.language = identityData.language;
  this.description = identityData.description;
  this.active = identityData.active;
  return this.save();
};

agentSchema.methods.updatePersona = function(personaData) {
  this.voiceType = personaData.voiceType;
  this.voice = personaData.voice;
  return this.save();
};

agentSchema.methods.updateWork = function(workData) {
  this.companyName = workData.companyName;
  this.productDescription = workData.productDescription;
  this.questions = workData.questions;
  this.faqs = workData.faqs;
  this.agentIntroduction = workData.agentIntroduction;
  
  // Auto-generate AI instructions from the work data
  this.config.instructions = this.generateInstructions();
  
  return this.save();
};

agentSchema.methods.generateInstructions = function() {
  return `You are an AI assistant for ${this.companyName}. 

Product Information:
${this.productDescription}

Introduction Script:
${this.agentIntroduction}

Key Questions to Address:
${this.questions.map(q => `${q.number}. ${q.question}`).join('\n')}

Frequently Asked Questions:
${this.faqs}

Voice Type: ${this.voiceType}
Language: ${this.language}

Always be helpful, professional, and stay on topic about ${this.companyName} and its products/services.`;
};

// Static methods
agentSchema.statics.createDraft = function(userId, organizationId) {
  return this.create({
    name: '',
    language: 'en',
    description: '',
    organizationId,
    createdBy: userId,
    status: AGENT_STATUS.DRAFT,
    config: {
      model: 'gpt-3.5-turbo',
      instructions: '',
      temperature: 0.7,
      maxTokens: 1000,
    }
  });
};

module.exports = mongoose.model('Agent', agentSchema);
