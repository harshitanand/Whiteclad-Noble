const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../utils/constants');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: Object.values(AUDIT_ACTIONS),
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    index: true
  },
  resourceType: {
    type: String,
    enum: ['user', 'organization', 'agent', 'subscription'],
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  targetUserId: String,
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We use custom timestamp field
});

// Indexes
auditLogSchema.index({ organizationId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

// TTL index to auto-delete old logs (keep for 2 years)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Static methods
auditLogSchema.statics.createLog = function(logData) {
  return this.create({
    ...logData,
    timestamp: new Date()
  });
};

auditLogSchema.statics.getOrganizationLogs = function(organizationId, options = {}) {
  const { startDate, endDate, action, limit = 100, skip = 0 } = options;
  
  const query = { organizationId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (action) query.action = action;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
