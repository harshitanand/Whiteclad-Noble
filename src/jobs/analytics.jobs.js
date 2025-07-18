const Agent = require('../models/Agent');
const Organization = require('../models/Organization');
const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

const processAnalyticsJob = async (job) => {
  const { type } = job.data;

  try {
    switch (type) {
      case 'daily-analytics':
        await processDailyAnalytics();
        break;
      case 'monthly-usage-reset':
        await processMonthlyUsageReset();
        break;
      case 'agent-performance':
        await processAgentPerformance(job.data.agentId);
        break;
      default:
        throw new Error(`Unknown analytics job type: ${type}`);
    }
  } catch (error) {
    logger.error('Analytics job failed:', { type, error: error.message });
    throw error;
  }
};

const processDailyAnalytics = async () => {
  logger.info('Processing daily analytics...');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Aggregate daily stats
  const dailyStats = await AuditLog.aggregate([
    {
      $match: {
        timestamp: { $gte: yesterday, $lt: today },
      },
    },
    {
      $group: {
        _id: {
          action: '$action',
          organizationId: '$organizationId',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Update organization analytics
  for (const stat of dailyStats) {
    if (stat._id.organizationId) {
      await Organization.findOneAndUpdate(
        { clerkId: stat._id.organizationId },
        {
          $inc: {
            [`analytics.daily.${stat._id.action}`]: stat.count,
          },
        }
      );
    }
  }

  logger.info('Daily analytics processed:', { statsCount: dailyStats.length });
};

const processMonthlyUsageReset = async () => {
  logger.info('Processing monthly usage reset...');

  const organizations = await Organization.find({ isActive: true });

  for (const org of organizations) {
    await org.resetMonthlyUsage();
  }

  logger.info('Monthly usage reset completed:', { organizationsCount: organizations.length });
};

const processAgentPerformance = async (agentId) => {
  logger.info('Processing agent performance analytics:', { agentId });

  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  // Calculate performance metrics
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const recentLogs = await AuditLog.find({
    resourceId: agentId,
    timestamp: { $gte: last30Days },
  });

  const conversationLogs = recentLogs.filter(
    (log) => log.details?.action === 'chat' || log.action === 'agent.used'
  );

  // Update agent analytics
  agent.analytics.totalConversations = conversationLogs.length;
  agent.analytics.last30DaysUsage = conversationLogs.length;

  if (conversationLogs.length > 0) {
    const avgResponseTime =
      conversationLogs.reduce((sum, log) => sum + (log.details?.responseTime || 0), 0) /
      conversationLogs.length;

    agent.analytics.averageResponseTime = Math.round(avgResponseTime);
  }

  await agent.save();

  logger.info('Agent performance analytics updated:', {
    agentId,
    conversationsLast30Days: conversationLogs.length,
  });
};

module.exports = {
  processAnalyticsJob,
  processDailyAnalytics,
  processMonthlyUsageReset,
  processAgentPerformance,
};
