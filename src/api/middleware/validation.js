/**
 * Validation Middleware
 * Request validation for API endpoints
 * Phase 5: Review Interface
 */

const { APIError } = require('./errorHandler');

/**
 * Validate segment update request
 */
function validateSegmentUpdate(req, res, next) {
  const { task_description, adjusted_duration_minutes, project_id_detected, review_notes } = req.body;

  // Validate task_description length
  if (task_description !== undefined) {
    if (typeof task_description !== 'string') {
      return next(new APIError('VALIDATION_ERROR', 'task_description must be a string'));
    }
    if (task_description.length > 500) {
      return next(new APIError('VALIDATION_ERROR', 'Task description exceeds 500 characters', {
        field: 'task_description',
        maxLength: 500,
        actualLength: task_description.length
      }));
    }
  }

  // Validate adjusted_duration_minutes
  if (adjusted_duration_minutes !== undefined) {
    if (typeof adjusted_duration_minutes !== 'number' || adjusted_duration_minutes < 1) {
      return next(new APIError('VALIDATION_ERROR', 'adjusted_duration_minutes must be >= 1', {
        field: 'adjusted_duration_minutes',
        value: adjusted_duration_minutes
      }));
    }
  }

  // Validate project_id_detected
  if (project_id_detected !== undefined) {
    if (!Number.isInteger(project_id_detected) || project_id_detected < 1) {
      return next(new APIError('VALIDATION_ERROR', 'project_id_detected must be a positive integer', {
        field: 'project_id_detected',
        value: project_id_detected
      }));
    }
  }

  // Validate review_notes
  if (review_notes !== undefined && typeof review_notes !== 'string') {
    return next(new APIError('VALIDATION_ERROR', 'review_notes must be a string'));
  }

  next();
}

/**
 * Validate batch operation request
 */
function validateBatchOperation(req, res, next) {
  const { segment_ids } = req.body;

  if (!Array.isArray(segment_ids)) {
    return next(new APIError('VALIDATION_ERROR', 'segment_ids must be an array'));
  }

  if (segment_ids.length === 0) {
    return next(new APIError('VALIDATION_ERROR', 'segment_ids array cannot be empty'));
  }

  if (segment_ids.length > 100) {
    return next(new APIError('VALIDATION_ERROR', 'Cannot process more than 100 segments at once', {
      field: 'segment_ids',
      maxLength: 100,
      actualLength: segment_ids.length
    }));
  }

  // Validate all IDs are positive integers
  for (let i = 0; i < segment_ids.length; i++) {
    if (!Number.isInteger(segment_ids[i]) || segment_ids[i] < 1) {
      return next(new APIError('VALIDATION_ERROR', `Invalid segment ID at index ${i}`, {
        field: 'segment_ids',
        index: i,
        value: segment_ids[i]
      }));
    }
  }

  next();
}

/**
 * Validate pagination parameters
 */
function validatePagination(req, res, next) {
  const { limit, offset } = req.query;

  // Parse limit
  let limitNum;
  if (limit !== undefined) {
    limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
      return next(new APIError('VALIDATION_ERROR', 'limit must be between 1 and 200', {
        field: 'limit',
        value: limit
      }));
    }
  } else {
    limitNum = 50; // Default
  }

  // Parse offset
  let offsetNum;
  if (offset !== undefined) {
    offsetNum = parseInt(offset, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return next(new APIError('VALIDATION_ERROR', 'offset must be >= 0', {
        field: 'offset',
        value: offset
      }));
    }
  } else {
    offsetNum = 0; // Default
  }

  // Express 5 query objects are immutable - store validated values separately
  req.validated = req.validated || {};
  req.validated.limit = limitNum;
  req.validated.offset = offsetNum;

  next();
}

/**
 * Validate segment ID parameter
 */
function validateSegmentId(req, res, next) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1) {
    return next(new APIError('VALIDATION_ERROR', 'Invalid segment ID', {
      field: 'id',
      value: req.params.id
    }));
  }

  req.params.id = id; // Convert to number
  next();
}

module.exports = {
  validateSegmentUpdate,
  validateBatchOperation,
  validatePagination,
  validateSegmentId
};
