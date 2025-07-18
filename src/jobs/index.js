const Queue = require('bull');
const config = require('../config');
const logger = require('../config/logger');
const redisClient = require('../config/redis');

// Job queues
const emailQueue = new Queue('email processing', {
  redis: {
    host: config.redis.url.split('://')[1].split(':')[0],
    port: config.redis.url.split(':')[2] || 6379,
  },
});

const analyticsQueue = new Queue('analytics processing', {
  redis: {
    host: config.redis.url.split('://')[1].split(':')[0],
    port: config.redis.url.split(':')[2] || 6379,
  },
});

const cleanupQueue = new Queue('cleanup tasks', {
  redis: {
    host: config.redis.url.split('://')[1].split(':')[0],
    port: config.redis.url.split(':')[2] || 6379,
  },
});

// Import job processors
const { processEmailJob } = require('./email.jobs');
const { processAnalyticsJob } = require('./analytics.jobs');
const { processCleanupJob } = require('./cleanup.jobs');

// Register job processors
emailQueue.process(processEmailJob);
analyticsQueue.process(processAnalyticsJob);
cleanupQueue.process(processCleanupJob);

// Queue event handlers
emailQueue.on('completed', (job) => {
  logger.info('Email job completed:', { jobId: job.id, type: job.data.type });
});

emailQueue.on('failed', (job, err) => {
  logger.error('Email job failed:', { jobId: job.id, error: err.message });
});

analyticsQueue.on('completed', (job) => {
  logger.info('Analytics job completed:', { jobId: job.id });
});

analyticsQueue.on('failed', (job, err) => {
  logger.error('Analytics job failed:', { jobId: job.id, error: err.message });
});

// Scheduled jobs
const scheduleRecurringJobs = () => {
  // Daily analytics aggregation
  analyticsQueue.add(
    'daily-analytics',
    {},
    {
      repeat: { cron: '0 2 * * *' }, // 2 AM daily
      removeOnComplete: 5,
      removeOnFail: 3,
    }
  );

  // Weekly cleanup
  cleanupQueue.add(
    'weekly-cleanup',
    {},
    {
      repeat: { cron: '0 3 * * 0' }, // 3 AM every Sunday
      removeOnComplete: 2,
      removeOnFail: 2,
    }
  );

  // Monthly usage reset
  analyticsQueue.add(
    'monthly-usage-reset',
    {},
    {
      repeat: { cron: '0 0 1 * *' }, // First day of month
      removeOnComplete: 2,
      removeOnFail: 2,
    }
  );

  logger.info('Scheduled recurring jobs initialized');
};

// Initialize queues
const initializeQueues = () => {
  scheduleRecurringJobs();

  logger.info('Job queues initialized:', {
    email: emailQueue.name,
    analytics: analyticsQueue.name,
    cleanup: cleanupQueue.name,
  });
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down job queues...');

  await Promise.all([emailQueue.close(), analyticsQueue.close(), cleanupQueue.close()]);

  logger.info('Job queues shut down successfully');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  emailQueue,
  analyticsQueue,
  cleanupQueue,
  initializeQueues,
  shutdown,
};
