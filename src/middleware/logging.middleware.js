const morgan = require('morgan');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

// Add request ID to all requests
const addRequestId = (req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Custom token for request ID
morgan.token('id', (req) => req.requestId);

// Custom token for user ID
morgan.token('user', (req) => req.auth?.userId || 'anonymous');

// Custom token for organization ID
morgan.token('org', (req) => req.auth?.orgId || 'none');

// Custom token for response time in ms
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) {
    return;
  }
  
  const ms = (res._startAt[0] - req._startAt[0]) * 1000 +
             (res._startAt[1] - req._startAt[1]) * 1e-6;
  
  return ms.toFixed(3);
});

// Development format
const developmentFormat = ':id :method :url :status :response-time-ms ms - :user@:org';

// Production format (JSON)
const productionFormat = JSON.stringify({
  requestId: ':id',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user',
  organizationId: ':org'
});

// Create morgan middleware
const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  {
    stream: {
      write: (message) => {
        if (process.env.NODE_ENV === 'production') {
          try {
            const logData = JSON.parse(message.trim());
            logger.info('HTTP Request', logData);
          } catch (err) {
            logger.info(message.trim());
          }
        } else {
          logger.info(message.trim());
        }
      }
    },
    skip: (req, res) => {
      // Skip health check logs in production
      return process.env.NODE_ENV === 'production' && req.url === '/api/v1/health';
    }
  }
);

module.exports = {
  addRequestId,
  requestLogger
};
