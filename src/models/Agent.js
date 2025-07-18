const mongoose = require('mongoose');
const { AGENT_TYPES, AGENT_STATUS } = require('../utils/constants');

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(AGENT_TYPES),
      required: true,
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

    // AI Configuration
    config: {
      model: {
        type: String,
        required: true,
        enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'],
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
      topP: {
        type: Number,
        min: 0,
        max: 1,
        default: 1,
      },
      frequencyPenalty: {
        type: Number,
        min: -2,
        max: 2,
        default: 0,
      },
      presencePenalty: {
        type: Number,
        min: -2,
        max: 2,
        default: 0,
      },
    },

    // Tools and capabilities
    tools: [
      {
        type: {
          type: String,
          required: true,
          enum: ['web_search', 'calculator', 'code_interpreter', 'file_upload', 'api_call'],
        },
        name: String,
        description: String,
        config: mongoose.Schema.Types.Mixed,
        isEnabled: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Knowledge base
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
    sharedWith: [
      {
        userId: String,
        permissions: [
          {
            type: String,
            enum: ['read', 'execute', 'edit'],
          },
        ],
        sharedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

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
    parentAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
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

// Virtual for formatted analytics
agentSchema.virtual('formattedAnalytics').get(function () {
  return {
    ...this.analytics,
    averageResponseTime: `${this.analytics.averageResponseTime}ms`,
    successRate: `${this.analytics.successRate}%`,
  };
});

// Instance methods
agentSchema.methods.incrementUsage = function () {
  this.analytics.totalConversations += 1;
  this.analytics.usageThisMonth += 1;
  this.analytics.lastUsedAt = new Date();
  return this.save();
};

agentSchema.methods.updateAnalytics = function (responseTime, success = true) {
  const { analytics } = this;
  analytics.totalMessages += 1;

  // Update average response time
  const totalResponses = analytics.totalMessages;
  analytics.averageResponseTime =
    (analytics.averageResponseTime * (totalResponses - 1) + responseTime) / totalResponses;

  // Update success rate
  if (!success) {
    const successfulMessages =
      Math.floor(analytics.totalMessages * (analytics.successRate / 100)) - 1;
    analytics.successRate = (successfulMessages / analytics.totalMessages) * 100;
  }

  return this.save();
};

agentSchema.methods.publish = function (publishedBy) {
  this.status = AGENT_STATUS.PUBLISHED;
  this.publishedAt = new Date();
  this.publishedBy = publishedBy;
  return this.save();
};

agentSchema.methods.clone = function (newOwnerId, newOrganizationId) {
  const clonedAgent = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    name: `${this.name} (Copy)`,
    createdBy: newOwnerId,
    organizationId: newOrganizationId,
    parentAgentId: this._id,
    status: AGENT_STATUS.DRAFT,
    publishedAt: undefined,
    publishedBy: undefined,
    analytics: {
      totalConversations: 0,
      totalMessages: 0,
      averageResponseTime: 0,
      successRate: 100,
      usageThisMonth: 0,
    },
    createdAt: undefined,
    updatedAt: undefined,
  });

  return clonedAgent.save();
};

agentSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Static methods
agentSchema.statics.findByOrganization = function (organizationId, filters = {}) {
  return this.find({
    organizationId,
    isActive: true,
    deletedAt: null,
    ...filters,
  });
};

agentSchema.statics.findPublicAgents = function (filters = {}) {
  return this.find({
    isPublic: true,
    status: AGENT_STATUS.PUBLISHED,
    isActive: true,
    deletedAt: null,
    ...filters,
  });
};

module.exports = mongoose.model('Agent', agentSchema);
