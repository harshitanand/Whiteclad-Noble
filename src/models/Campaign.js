// src/models/Campaign.js - New model for your campaign forms
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    // Basic campaign info (from form-new-campaign)
    campaignName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    dialingNumber: {
      type: String,
      required: true,
    },
    timeZone: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },

    // Call configuration (from form-new-campaign-call)
    callConfig: {
      files: [{
        filename: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      country: {
        type: String,
        required: true,
      },
      timeSlots: {
        from: {
          hour: String,
          period: {
            type: String,
            enum: ['AM', 'PM'],
          },
        },
        to: {
          hour: String,
          period: {
            type: String,
            enum: ['AM', 'PM'],
          },
        },
      },
      retry: {
        type: String,
        required: true,
      },
      coolDown: {
        type: String,
        required: true,
      },
      maxCallDuration: {
        type: String,
        required: true,
      },
      inactiveDuration: {
        type: String,
        required: true,
      },
    },

    // Campaign status and metadata
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
      default: 'draft',
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

    // Campaign statistics
    stats: {
      totalCalls: {
        type: Number,
        default: 0,
      },
      successfulCalls: {
        type: Number,
        default: 0,
      },
      failedCalls: {
        type: Number,
        default: 0,
      },
      averageCallDuration: {
        type: Number,
        default: 0,
      },
      conversionRate: {
        type: Number,
        default: 0,
      },
    },

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
campaignSchema.index({ organizationId: 1, isActive: 1 });
campaignSchema.index({ createdBy: 1, isActive: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ startTime: 1, endTime: 1 });

// Virtual for campaign duration
campaignSchema.virtual('duration').get(function () {
  if (this.startTime && this.endTime) {
    return this.endTime.getTime() - this.startTime.getTime();
  }
  return 0;
});

// Instance methods
campaignSchema.methods.start = function() {
  this.status = 'running';
  return this.save();
};

campaignSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

campaignSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

campaignSchema.methods.updateStats = function(callResult) {
  this.stats.totalCalls += 1;
  
  if (callResult.successful) {
    this.stats.successfulCalls += 1;
  } else {
    this.stats.failedCalls += 1;
  }
  
  // Update average call duration
  const totalDuration = this.stats.averageCallDuration * (this.stats.totalCalls - 1) + callResult.duration;
  this.stats.averageCallDuration = totalDuration / this.stats.totalCalls;
  
  // Update conversion rate
  this.stats.conversionRate = (this.stats.successfulCalls / this.stats.totalCalls) * 100;
  
  return this.save();
};

module.exports = mongoose.model('Campaign', campaignSchema);
