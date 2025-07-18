// src/models/TestNumber.js - Model for test numbers/testers
const mongoose = require('mongoose');

const testNumberSchema = new mongoose.Schema(
  {
    // Tester information (from form-new-test-number)
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    // Test status and results
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },
    
    // Test call history
    testCalls: [{
      agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
      },
      campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
      },
      callDate: {
        type: Date,
        default: Date.now,
      },
      duration: Number, // in seconds
      successful: Boolean,
      feedback: String,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      notes: String,
    }],

    // Preferences
    preferences: {
      timezone: String,
      availableHours: {
        start: String,
        end: String,
      },
      preferredDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
    },

    // Organization and ownership
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
testNumberSchema.index({ organizationId: 1, isActive: 1 });
testNumberSchema.index({ createdBy: 1, isActive: 1 });
testNumberSchema.index({ phone: 1 });
testNumberSchema.index({ email: 1 });
testNumberSchema.index({ status: 1 });

// Ensure unique phone per organization
testNumberSchema.index({ phone: 1, organizationId: 1 }, { unique: true });

// Virtual for total test calls
testNumberSchema.virtual('totalTestCalls').get(function () {
  return this.testCalls.length;
});

// Virtual for average rating
testNumberSchema.virtual('averageRating').get(function () {
  const ratingsWithValues = this.testCalls.filter(call => call.rating);
  if (ratingsWithValues.length === 0) return 0;
  
  const sum = ratingsWithValues.reduce((acc, call) => acc + call.rating, 0);
  return (sum / ratingsWithValues.length).toFixed(1);
});

// Instance methods
testNumberSchema.methods.addTestCall = function(callData) {
  this.testCalls.push({
    agentId: callData.agentId,
    campaignId: callData.campaignId,
    duration: callData.duration,
    successful: callData.successful,
    feedback: callData.feedback,
    rating: callData.rating,
    notes: callData.notes,
  });
  
  return this.save();
};

testNumberSchema.methods.updatePreferences = function(preferences) {
  this.preferences = { ...this.preferences, ...preferences };
  return this.save();
};

testNumberSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

testNumberSchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

testNumberSchema.methods.block = function() {
  this.status = 'blocked';
  return this.save();
};

// Static methods
testNumberSchema.statics.findByPhone = function(phone, organizationId) {
  return this.findOne({ 
    phone, 
    organizationId, 
    isActive: true, 
    deletedAt: null 
  });
};

testNumberSchema.statics.getActiveTesters = function(organizationId) {
  return this.find({ 
    organizationId, 
    status: 'active', 
    isActive: true, 
    deletedAt: null 
  });
};

module.exports = mongoose.model('TestNumber', testNumberSchema);
