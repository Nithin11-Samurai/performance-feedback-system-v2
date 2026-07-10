/**
 * Runs after express-validator chains. Collects any validation errors and
 * throws a single AppError.badRequest with field-level details, so every
 * endpoint returns validation errors in the same shape.
 */
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(AppError.badRequest('Validation failed', details));
  }
  next();
}

module.exports = validate;
