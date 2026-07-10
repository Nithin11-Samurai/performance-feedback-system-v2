/**
 * AppError — the single error type controllers/services should throw for
 * "expected" failures (bad input, not found, forbidden, etc). The global
 * error handler middleware knows how to turn this into a clean HTTP response.
 *
 * Unexpected errors (bugs, DB connection failures) should be left as plain
 * Error/Error subclasses — the handler treats those as 500s and logs the
 * full stack trace instead of exposing internals to the client.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes "expected" errors from bugs
    this.details = details; // e.g. field-level validation errors
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(message, 409);
  }

  static internal(message = 'Something went wrong') {
    return new AppError(message, 500);
  }
}

module.exports = AppError;
