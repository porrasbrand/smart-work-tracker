/**
 * Error Handler Middleware
 * Standardized error response format for API
 * Phase 5: Review Interface
 */

/**
 * Standard error response format
 * @param {string} code - Error code (e.g., 'VALIDATION_ERROR')
 * @param {string} message - Human-readable error message
 * @param {object} details - Additional error details (optional)
 * @returns {object} Standardized error response
 */
function formatError(code, message, details = null) {
  const error = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    error.error.details = details;
  }

  return error;
}

/**
 * Error handler middleware
 * Catches all errors and returns standardized format
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('API Error:', {
    code: err.code || 'UNKNOWN_ERROR',
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Determine HTTP status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An internal server error occurred';
  let details = null;

  // Handle different error types
  if (err.code === 'VALIDATION_ERROR') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
    details = err.details;
  } else if (err.code === 'NOT_FOUND') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = err.message;
  } else if (err.code === 'INVALID_STATE_TRANSITION' || err.code === 'ALREADY_SUBMITTED') {
    statusCode = 409;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.code === 'DATABASE_ERROR') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'Database operation failed';
    details = { dbError: err.message };
  } else if (err.name === 'ValidationError') {
    // Handle validation errors from validators
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  }

  // Send standardized error response
  res.status(statusCode).json(formatError(errorCode, message, details));
}

/**
 * 404 handler for unknown routes
 */
function notFoundHandler(req, res) {
  res.status(404).json(formatError(
    'NOT_FOUND',
    `Route not found: ${req.method} ${req.path}`
  ));
}

/**
 * Helper to create custom errors
 */
class APIError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  formatError,
  APIError
};
