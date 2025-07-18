const Joi = require('joi');
const { ValidationError } = require('../utils/errors');
const { catchAsync } = require('./error.middleware.js');

const validate = (schema, property = 'body') => {
  return catchAsync(async (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message.replace(/"/g, ''))
        .join(', ');

      throw new ValidationError(errorMessage);
    }

    req[property] = value;
    next();
  });
};

const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');
const validateBody = (schema) => validate(schema, 'body');

module.exports = {
  validate,
  validateQuery,
  validateParams,
  validateBody,
};
