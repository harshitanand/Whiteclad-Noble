/* eslint-disable global-require */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
require('express-async-errors');

const config = require('./config');
const logger = require('./config/logger');
const routes = require('./routes');
const { globalErrorHandler, handleNotFound } = require('./middleware/error.middleware');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(cors(config.security.cors));

// Rate limiting
if (config.security.rateLimiting.enabled) {
  const limiter = rateLimit({
    windowMs: config.security.rateLimiting.windowMs,
    max: config.security.rateLimiting.maxRequests,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.security.rateLimiting.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Request logging
app.use((req, res, next) => {
  req.requestId = require('uuid').v4();
  logger.info('Request received', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// API routes
app.use('/api/v1', routes);

// API documentation (in production, you might want to restrict this)
// if (!config.isProduction) {
//   const swaggerUi = require('swagger-ui-express');
//   const swaggerDocument = require('./docs/swagger.json');
//   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// }

// Handle 404
app.use(handleNotFound);

// Global error handler
app.use(globalErrorHandler);

module.exports = app;
