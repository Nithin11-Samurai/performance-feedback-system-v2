const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * 404 handler — placed after all routes.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Centralized error handler — placed last in the middleware chain.
 * Any error passed to next(err) anywhere in the app ends up here.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  // Log full detail server-side always; only expose safe detail to clients.
  logger.error(err.message, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    userId: req.user ? req.user.id : undefined,
    stack: config.env === 'production' && isOperational ? undefined : err.stack,
  });

  // Handle known PostgreSQL error codes with friendlier messages.
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Related record not found (foreign key constraint).' });
  }

  const message = isOperational || config.env !== 'production' ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
