// src/middleware/error.middleware.js - Comprehensive Error Handling Middleware
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Handle MongoDB CastError (Invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, HTTP_STATUS.BAD_REQUEST);
};

/**
 * Handle MongoDB Duplicate Key Error
 */
const handleDuplicateFieldsDB = (err) => {
  let value = '';
  if (err.errmsg) {
    const match = err.errmsg.match(/(["'])(\\?.)*?\1/);
    value = match ? match[0] : 'duplicate value';
  } else if (err.keyValue) {
    // For newer MongoDB versions
    const field = Object.keys(err.keyValue)[0];
    value = err.keyValue[field];
  }

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, HTTP_STATUS.CONFLICT);
};

/**
 * Handle MongoDB Validation Error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, HTTP_STATUS.BAD_REQUEST);
};

/**
 * Handle JWT Invalid Token Error
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', HTTP_STATUS.UNAUTHORIZED);

/**
 * Handle JWT Expired Token Error
 */
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', HTTP_STATUS.UNAUTHORIZED);

/**
 * Handle Clerk Authentication Errors
 */
const handleClerkError = (err) => {
  if (err.status === 401) {
    return new AppError('Authentication failed. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
  }
  if (err.status === 403) {
    return new AppError('Access forbidden. Insufficient permissions.', HTTP_STATUS.FORBIDDEN);
  }
  return new AppError('Authentication service error.', HTTP_STATUS.BAD_GATEWAY);
};

/**
 * Handle Stripe API Errors
 */
const handleStripeError = (err) => {
  switch (err.type) {
    case 'StripeCardError':
      return new AppError(`Card error: ${err.message}`, HTTP_STATUS.PAYMENT_REQUIRED);
    case 'StripeRateLimitError':
      return new AppError('Too many requests to payment processor.', HTTP_STATUS.TOO_MANY_REQUESTS);
    case 'StripeInvalidRequestError':
      return new AppError('Invalid payment request.', HTTP_STATUS.BAD_REQUEST);
    case 'StripeAPIError':
      return new AppError('Payment processing error.', HTTP_STATUS.BAD_GATEWAY);
    case 'StripeConnectionError':
      return new AppError('Payment service unavailable.', HTTP_STATUS.SERVICE_UNAVAILABLE);
    case 'StripeAuthenticationError':
      return new AppError('Payment authentication error.', HTTP_STATUS.UNAUTHORIZED);
    default:
      return new AppError('Payment processing failed.', HTTP_STATUS.BAD_GATEWAY);
  }
};

/**
 * Handle OpenAI API Errors
 */
const handleOpenAIError = (err) => {
  if (err.status === 401) {
    return new AppError('OpenAI authentication failed.', HTTP_STATUS.BAD_GATEWAY);
  }
  if (err.status === 429) {
    return new AppError(
      'OpenAI rate limit exceeded. Please try again later.',
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }
  if (err.status === 400) {
    return new AppError('Invalid request to AI service.', HTTP_STATUS.BAD_REQUEST);
  }
  return new AppError('AI service error.', HTTP_STATUS.BAD_GATEWAY);
};

/**
 * Handle Anthropic API Errors
 */
const handleAnthropicError = (err) => {
  if (err.status === 401) {
    return new AppError('Anthropic authentication failed.', HTTP_STATUS.BAD_GATEWAY);
  }
  if (err.status === 429) {
    return new AppError(
      'Anthropic rate limit exceeded. Please try again later.',
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }
  if (err.status === 400) {
    return new AppError('Invalid request to AI service.', HTTP_STATUS.BAD_REQUEST);
  }
  return new AppError('AI service error.', HTTP_STATUS.BAD_GATEWAY);
};

/**
 * Handle LiveKit API Errors
 */
const handleLiveKitError = (err) => {
  if (err.message.includes('not found')) {
    return new AppError('Call room not found.', HTTP_STATUS.NOT_FOUND);
  }
  if (err.message.includes('unauthorized')) {
    return new AppError('Call authentication failed.', HTTP_STATUS.UNAUTHORIZED);
  }
  return new AppError('Call service error.', HTTP_STATUS.BAD_GATEWAY);
};

/**
 * Handle Redis Connection Errors
 */
const handleRedisError = (err) => {
  logger.error('Redis error:', err);
  return new AppError('Cache service temporarily unavailable.', HTTP_STATUS.SERVICE_UNAVAILABLE);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  // Log the full error for debugging
  logger.error('Error in development:', {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
  });

  // API Error Response
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        status: err.status,
        statusCode: err.statusCode,
        isOperational: err.isOperational,
        stack: err.stack,
        ...(err.field && { field: err.field }),
        ...(err.code && { code: err.code }),
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // For non-API requests (if any)
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    error: err,
    requestId: req.requestId,
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // Log error details for monitoring
  logger.error('Production error:', {
    message: err.message,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
    userId: req.auth?.userId || 'anonymous',
    organizationId: req.auth?.orgId || 'none',
    ...(err.field && { field: err.field }),
    ...(err.service && { service: err.service }),
  });

  // API Error Response
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        ...(err.field && { field: err.field }),
        ...(err.code && { code: err.name }),
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Programming or other unknown error: don't leak error details
    logger.error('NON-OPERATIONAL ERROR 💥', {
      error: err,
      stack: err.stack,
      requestId: req.requestId,
      headers: req.headers,
      url: req.originalUrl,
      method: req.method,
    });

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong! Our team has been notified.',
      code: 'INTERNAL_SERVER_ERROR',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // For non-API requests
  return res.status(err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: err.isOperational ? err.message : 'Something went wrong!',
    requestId: req.requestId,
  });
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  // Set default error properties
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle different environments
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    // Transform known errors for production
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    // Handle third-party service errors
    if (error.name === 'ClerkError' || error.clerk) error = handleClerkError(error);
    if (error.type && error.type.startsWith('Stripe')) error = handleStripeError(error);
    if (error.message && error.message.includes('OpenAI')) error = handleOpenAIError(error);
    if (error.message && error.message.includes('Anthropic')) error = handleAnthropicError(error);
    if (error.message && error.message.includes('LiveKit')) error = handleLiveKitError(error);
    if (error.code === 'ECONNREFUSED' && error.address) error = handleRedisError(error);

    sendErrorProd(error, req, res);
  }
};

/**
 * Async error catcher wrapper
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle 404 errors for undefined routes
 */
const handleNotFound = (req, res, next) => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  const err = new AppError(message, HTTP_STATUS.NOT_FOUND);

  // Add request context
  err.path = req.originalUrl;
  err.method = req.method;

  next(err);
};

/**
 * Handle async route errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // Add request context to error
    err.url = req.originalUrl;
    err.method = req.method;
    err.requestId = req.requestId;

    next(err);
  });
};

/**
 * Validation error handler for Joi
 */
const handleValidationError = (error, req, res, next) => {
  if (error.name === 'ValidationError' && error.isJoi) {
    const message = error.details.map((detail) => detail.message.replace(/"/g, '')).join(', ');

    const validationError = new AppError(message, HTTP_STATUS.BAD_REQUEST);
    validationError.name = 'ValidationError';
    validationError.field = error.details[0]?.path?.join('.') || 'unknown';

    return next(validationError);
  }
  next(error);
};

/**
 * Rate limit error handler
 */
const handleRateLimitError = (req, res, next) => {
  const err = new AppError(
    'Too many requests from this IP, please try again later.',
    HTTP_STATUS.TOO_MANY_REQUESTS
  );
  err.retryAfter = Math.ceil(req.rateLimit?.resetTime / 1000) || 900;
  next(err);
};

/**
 * Request timeout handler
 */
const handleTimeout = (req, res, next) => {
  const timeout = setTimeout(() => {
    const err = new AppError('Request timeout', HTTP_STATUS.REQUEST_TIMEOUT);
    next(err);
  }, 30000); // 30 seconds

  // Clear timeout if request completes
  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
};

/**
 * Error logging middleware for monitoring
 */
const logError = (err, req, res, next) => {
  // Enhanced error logging for monitoring systems
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: err.message,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    stack: err.stack,
    request: {
      id: req.requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
    },
    user: {
      id: req.auth?.userId || 'anonymous',
      organizationId: req.auth?.orgId || 'none',
      role: req.membership?.role || 'unknown',
    },
    ...(err.field && { field: err.field }),
    ...(err.service && { service: err.service }),
  };

  // Log to monitoring service (e.g., Sentry, DataDog)
  logger.error('Application Error', errorLog);

  // Continue to next error handler
  next(err);
};

/**
 * Security error handler
 */
const handleSecurityError = (err, req, res, next) => {
  // Handle security-related errors
  if (err.name === 'SecurityError' || err.code === 'EBADCSRFTOKEN') {
    const securityError = new AppError('Security validation failed', HTTP_STATUS.FORBIDDEN);
    return next(securityError);
  }

  next(err);
};

module.exports = {
  globalErrorHandler,
  catchAsync,
  asyncHandler,
  handleNotFound,
  handleValidationError,
  handleRateLimitError,
  handleTimeout,
  logError,
  handleSecurityError,
  sendErrorDev,
  sendErrorProd,
};
