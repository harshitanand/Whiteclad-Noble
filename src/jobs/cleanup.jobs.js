/* eslint-disable no-use-before-define */
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Agent = require('../models/Agent');
const logger = require('../config/logger');

const processCleanupJob = async (job) => {
  const { type } = job.data;

  try {
    switch (type) {
      case 'weekly-cleanup':
        await processWeeklyCleanup();
        break;
      case 'audit-log-cleanup':
        await processAuditLogCleanup();
        break;
      case 'temp-file-cleanup':
        await processTempFileCleanup();
        break;
      default:
        throw new Error(`Unknown cleanup job type: ${type}`);
    }
  } catch (error) {
    logger.error('Cleanup job failed:', { type, error: error.message });
    throw error;
  }
};

const processWeeklyCleanup = async () => {
  logger.info('Processing weekly cleanup...');

  await Promise.all([
    processAuditLogCleanup(),
    processTempFileCleanup(),
    cleanupInactiveUsers(),
    cleanupDraftAgents(),
  ]);

  logger.info('Weekly cleanup completed');
};

const processAuditLogCleanup = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const result = await AuditLog.deleteMany({
    timestamp: { $lt: sixMonthsAgo },
    action: { $in: ['user.login', 'user.logout', 'agent.viewed'] }, // Less critical logs
  });

  logger.info('Audit logs cleaned up:', { deletedCount: result.deletedCount });
};

const processTempFileCleanup = async () => {
  // Clean up temporary files older than 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // This would integrate with your file storage system
  logger.info('Temporary files cleaned up');
};

const cleanupInactiveUsers = async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const inactiveUsers = await User.find({
    lastLoginAt: { $lt: oneYearAgo },
    isActive: false,
    deletedAt: null,
  });

  for (const user of inactiveUsers) {
    await user.softDelete();
  }

  logger.info('Inactive users cleaned up:', { count: inactiveUsers.length });
};

const cleanupDraftAgents = async () => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const oldDrafts = await Agent.find({
    status: 'draft',
    createdAt: { $lt: threeMonthsAgo },
    'analytics.totalConversations': 0,
    isActive: true,
  });

  for (const agent of oldDrafts) {
    await agent.softDelete();
  }

  logger.info('Old draft agents cleaned up:', { count: oldDrafts.length });
};

module.exports = {
  processCleanupJob,
  processWeeklyCleanup,
  processAuditLogCleanup,
  processTempFileCleanup,
};
