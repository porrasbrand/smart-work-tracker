class SmartWorkTrackerError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Parse Errors
class JSONLMalformedError extends SmartWorkTrackerError {
  constructor(line, details) {
    super(`Malformed JSONL at line ${line}`, 'JSONL_MALFORMED', details);
  }
}

class JSONLMissingFieldError extends SmartWorkTrackerError {
  constructor(field, details) {
    super(`Required field missing: ${field}`, 'JSONL_MISSING_FIELD', details);
  }
}

class JSONLUnknownTypeError extends SmartWorkTrackerError {
  constructor(type, details) {
    super(`Unknown event type: ${type}`, 'JSONL_UNKNOWN_TYPE', details);
  }
}

class JSONLOffsetInvalidError extends SmartWorkTrackerError {
  constructor(details) {
    super('Byte offset invalid (log rotation detected)', 'JSONL_OFFSET_INVALID', details);
  }
}

// Attribution Errors
class AttributionNoSignalsError extends SmartWorkTrackerError {
  constructor(details) {
    super('Insufficient data for attribution', 'ATTR_NO_SIGNALS', details);
  }
}

class AttributionAmbiguousError extends SmartWorkTrackerError {
  constructor(candidates, details) {
    super(`Ambiguous attribution: ${candidates.length} candidates`, 'ATTR_AMBIGUOUS', details);
  }
}

// API Errors
class ACAuthFailedError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab authentication failed', 'AC_AUTH_FAILED', details);
  }
}

class ACRateLimitError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab rate limit exceeded', 'AC_RATE_LIMIT', details);
  }
}

class ACNetworkError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab network error', 'AC_NETWORK_ERROR', details);
  }
}

class ACAPIChangedError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab API unexpected response', 'AC_API_CHANGED', details);
  }
}

class AIAPIError extends SmartWorkTrackerError {
  constructor(provider, details) {
    super(`${provider} API error`, 'AI_API_ERROR', details);
  }
}

class AIContextOverflowError extends SmartWorkTrackerError {
  constructor(details) {
    super('Session too large for AI context window', 'AI_CONTEXT_OVERFLOW', details);
  }
}

// Database Errors
class DBMigrationFailedError extends SmartWorkTrackerError {
  constructor(migration, details) {
    super(`Migration failed: ${migration}`, 'DB_MIGRATION_FAILED', details);
  }
}

class DBConstraintViolationError extends SmartWorkTrackerError {
  constructor(constraint, details) {
    super(`Database constraint violation: ${constraint}`, 'DB_CONSTRAINT_VIOLATION', details);
  }
}

// Configuration Errors
class ConfigError extends SmartWorkTrackerError {
  constructor(message, details) {
    super(message, 'CONFIG_ERROR', details);
  }
}

class ConfigMissingEnvError extends SmartWorkTrackerError {
  constructor(envVar, details) {
    super(`Required environment variable missing: ${envVar}`, 'CONFIG_MISSING_ENV', details);
  }
}

// Concurrency Errors
class FileLockedError extends SmartWorkTrackerError {
  constructor(file, details) {
    super(`File locked by another process: ${file}`, 'FILE_LOCKED', details);
  }
}

class LogRotationDetectedError extends SmartWorkTrackerError {
  constructor(details) {
    super('Log file rotated during read', 'LOG_ROTATION_DETECTED', details);
  }
}

module.exports = {
  SmartWorkTrackerError,
  // Parse
  JSONLMalformedError,
  JSONLMissingFieldError,
  JSONLUnknownTypeError,
  JSONLOffsetInvalidError,
  // Attribution
  AttributionNoSignalsError,
  AttributionAmbiguousError,
  // API
  ACAuthFailedError,
  ACRateLimitError,
  ACNetworkError,
  ACAPIChangedError,
  AIAPIError,
  AIContextOverflowError,
  // Database
  DBMigrationFailedError,
  DBConstraintViolationError,
  // Config
  ConfigError,
  ConfigMissingEnvError,
  // Concurrency
  FileLockedError,
  LogRotationDetectedError,
};
