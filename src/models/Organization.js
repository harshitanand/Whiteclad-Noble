const mongoose = require('mongoose');
const { SUBSCRIPTION_PLANS } = require('../utils/constants');

const organizationSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    logo: {
      type: String,
    },
    website: {
      type: String,
    },
    industry: {
      type: String,
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
    },
    plan: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PLANS),
      default: SUBSCRIPTION_PLANS.FREE,
    },
    subscription: {
      stripeSubscriptionId: String,
      stripeCustomerId: String,
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled', 'incomplete'],
        default: 'active',
      },
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
      },
    },
    limits: {
      maxAgents: {
        type: Number,
        default: 3,
      },
      maxMembers: {
        type: Number,
        default: 2,
      },
      apiCallsPerMonth: {
        type: Number,
        default: 1000,
      },
      storageLimit: {
        type: String,
        default: '100MB',
      },
    },
    usage: {
      agentCount: {
        type: Number,
        default: 0,
      },
      memberCount: {
        type: Number,
        default: 1,
      },
      apiCallsThisMonth: {
        type: Number,
        default: 0,
      },
      storageUsed: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: false,
      },
      requireApprovalForAgents: {
        type: Boolean,
        default: false,
      },
      defaultAgentVisibility: {
        type: String,
        enum: ['private', 'organization', 'public'],
        default: 'private',
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
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
// organizationSchema.index({ clerkId: 1 });
// organizationSchema.index({ slug: 1 });
organizationSchema.index({ plan: 1 });
organizationSchema.index({ isActive: 1, deletedAt: 1 });

// Virtual for plan features
organizationSchema.virtual('features').get(function () {
  const planFeatures = {
    [SUBSCRIPTION_PLANS.FREE]: ['basic_agents', 'community_support'],
    [SUBSCRIPTION_PLANS.PRO]: [
      'basic_agents',
      'advanced_agents',
      'api_access',
      'priority_support',
      'analytics',
    ],
    [SUBSCRIPTION_PLANS.ENTERPRISE]: ['all'],
  };
  return planFeatures[this.plan] || planFeatures[SUBSCRIPTION_PLANS.FREE];
});

// Instance methods
organizationSchema.methods.isFeatureEnabled = function (feature) {
  const { features } = this;
  return features.includes('all') || features.includes(feature);
};

organizationSchema.methods.checkLimits = function (type) {
  const current = this.usage[`${type}Count`] || this.usage[type];
  const limit =
    this.limits[`max${type.charAt(0).toUpperCase() + type.slice(1)}`] || this.limits[type];

  return {
    current,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
    exceeded: limit !== -1 && current >= limit,
  };
};

organizationSchema.methods.incrementUsage = function (type, amount = 1) {
  const usageField = `usage.${type}Count` in this.schema.paths ? `${type}Count` : type;
  this.usage[usageField] = (this.usage[usageField] || 0) + amount;
  return this.save();
};

organizationSchema.methods.resetMonthlyUsage = function () {
  this.usage.apiCallsThisMonth = 0;
  this.usage.lastResetDate = new Date();
  return this.save();
};

module.exports = mongoose.model('Organization', organizationSchema);
