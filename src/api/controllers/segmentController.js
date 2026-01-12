/**
 * Segment Controller
 * Handles segment CRUD operations with approval state machine
 * Phase 5: Review Interface
 */

const { APIError } = require('../middleware/errorHandler');

/**
 * State machine: Valid transitions
 * pending → approved, skipped, archived
 * approved → skipped, submitted, archived
 * skipped → approved, archived
 * submitted → (immutable)
 * archived → (immutable)
 */
const VALID_TRANSITIONS = {
  pending: ['approved', 'skipped', 'archived'],
  approved: ['skipped', 'submitted', 'archived'],
  skipped: ['approved', 'archived'],
  submitted: [], // Immutable
  archived: []  // Immutable
};

/**
 * Check if state transition is valid
 */
function isValidTransition(fromState, toState) {
  return VALID_TRANSITIONS[fromState]?.includes(toState) || false;
}

/**
 * GET /api/segments
 * List segments with filtering, pagination, sorting
 */
async function listSegments(req, res, next) {
  const { db } = req.app.locals;
  const { status, project_id, search, sort = 'date', order = 'desc' } = req.query;
  // Get validated pagination from middleware (Express 5 query objects are immutable)
  const { limit, offset } = req.validated || { limit: 50, offset: 0 };

  try {
    // Build query
    let query = `
      SELECT
        s.*,
        p.activecollab_project_name as project_name
      FROM segments s
      LEFT JOIN projects_map p ON s.project_id_detected = p.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status
    if (status) {
      query += ` AND s.approval_status = ?`;
      params.push(status);
    }

    // Filter by project
    if (project_id) {
      query += ` AND s.project_id_detected = ?`;
      params.push(parseInt(project_id, 10));
    }

    // Search in task description
    if (search) {
      query += ` AND s.task_description LIKE ?`;
      params.push(`%${search}%`);
    }

    // Count total (before pagination)
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const { total } = await db.get(countQuery, params);

    // Sort
    const sortColumn = sort === 'duration' ? 's.duration_minutes'
      : sort === 'confidence' ? 's.confidence_score'
      : 's.start_time'; // date
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute query
    const segments = await db.all(query, params);

    res.json({
      segments,
      total,
      limit,
      offset
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * GET /api/segments/:id
 * Get single segment by ID
 */
async function getSegment(req, res, next) {
  const { db } = req.app.locals;
  const { id } = req.params;

  try {
    const segment = await db.get(`
      SELECT
        s.*,
        p.activecollab_project_name as project_name
      FROM segments s
      LEFT JOIN projects_map p ON s.project_id_detected = p.id
      WHERE s.id = ?
    `, [id]);

    if (!segment) {
      return next(new APIError('NOT_FOUND', `Segment with id ${id} not found`));
    }

    res.json(segment);
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * PATCH /api/segments/:id
 * Update segment fields (respects immutability rules)
 */
async function updateSegment(req, res, next) {
  const { db } = req.app.locals;
  const { id } = req.params;
  const { task_description, adjusted_duration_minutes, project_id_detected, review_notes } = req.body;

  try {
    // Check if segment exists and get current state
    const segment = await db.get('SELECT * FROM segments WHERE id = ?', [id]);

    if (!segment) {
      return next(new APIError('NOT_FOUND', `Segment with id ${id} not found`));
    }

    // Cannot edit submitted segments
    if (segment.approval_status === 'submitted') {
      return next(new APIError('ALREADY_SUBMITTED', 'Cannot edit segment after submission to ActiveCollab', {
        segment_id: id,
        submitted_at: segment.submitted_at
      }));
    }

    // Build UPDATE query dynamically
    const updates = [];
    const params = [];

    if (task_description !== undefined) {
      updates.push('task_description = ?');
      params.push(task_description);
    }

    if (adjusted_duration_minutes !== undefined) {
      updates.push('adjusted_duration_minutes = ?');
      params.push(adjusted_duration_minutes);
    }

    if (project_id_detected !== undefined) {
      // Validate project exists
      const project = await db.get('SELECT id FROM projects_map WHERE id = ?', [project_id_detected]);
      if (!project) {
        return next(new APIError('VALIDATION_ERROR', `Project with id ${project_id_detected} not found`, {
          field: 'project_id_detected',
          value: project_id_detected
        }));
      }
      updates.push('project_id_detected = ?');
      params.push(project_id_detected);
    }

    if (review_notes !== undefined) {
      updates.push('review_notes = ?');
      params.push(review_notes);
    }

    if (updates.length === 0) {
      return next(new APIError('VALIDATION_ERROR', 'No valid fields to update'));
    }

    // Add updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');

    // Execute update
    params.push(id);
    await db.run(`UPDATE segments SET ${updates.join(', ')} WHERE id = ?`, params);

    // Fetch updated segment
    const updatedSegment = await db.get(`
      SELECT
        s.*,
        p.activecollab_project_name as project_name
      FROM segments s
      LEFT JOIN projects_map p ON s.project_id_detected = p.id
      WHERE s.id = ?
    `, [id]);

    res.json({
      success: true,
      segment: updatedSegment
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * POST /api/segments/:id/approve
 * Approve segment (state transition to 'approved')
 */
async function approveSegment(req, res, next) {
  const { db } = req.app.locals;
  const { id } = req.params;

  try {
    const segment = await db.get('SELECT * FROM segments WHERE id = ?', [id]);

    if (!segment) {
      return next(new APIError('NOT_FOUND', `Segment with id ${id} not found`));
    }

    // Validate state transition
    if (!isValidTransition(segment.approval_status, 'approved')) {
      return next(new APIError('INVALID_STATE_TRANSITION',
        `Cannot approve segment with status '${segment.approval_status}'`, {
        current_status: segment.approval_status,
        requested_status: 'approved',
        valid_transitions: VALID_TRANSITIONS[segment.approval_status]
      }));
    }

    // Update status
    await db.run(`
      UPDATE segments
      SET approval_status = 'approved',
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    // Fetch updated segment
    const updatedSegment = await db.get(`
      SELECT
        s.*,
        p.activecollab_project_name as project_name
      FROM segments s
      LEFT JOIN projects_map p ON s.project_id_detected = p.id
      WHERE s.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Segment approved',
      segment: updatedSegment
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * POST /api/segments/:id/skip
 * Skip segment (state transition to 'skipped')
 */
async function skipSegment(req, res, next) {
  const { db } = req.app.locals;
  const { id } = req.params;

  try {
    const segment = await db.get('SELECT * FROM segments WHERE id = ?', [id]);

    if (!segment) {
      return next(new APIError('NOT_FOUND', `Segment with id ${id} not found`));
    }

    // Validate state transition
    if (!isValidTransition(segment.approval_status, 'skipped')) {
      return next(new APIError('INVALID_STATE_TRANSITION',
        `Cannot skip segment with status '${segment.approval_status}'`, {
        current_status: segment.approval_status,
        requested_status: 'skipped',
        valid_transitions: VALID_TRANSITIONS[segment.approval_status]
      }));
    }

    // Update status
    await db.run(`
      UPDATE segments
      SET approval_status = 'skipped',
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    // Fetch updated segment
    const updatedSegment = await db.get(`
      SELECT
        s.*,
        p.activecollab_project_name as project_name
      FROM segments s
      LEFT JOIN projects_map p ON s.project_id_detected = p.id
      WHERE s.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Segment skipped',
      segment: updatedSegment
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * DELETE /api/segments/:id
 * Archive segment (soft delete, state transition to 'archived')
 */
async function deleteSegment(req, res, next) {
  const { db } = req.app.locals;
  const { id } = req.params;

  try {
    const segment = await db.get('SELECT * FROM segments WHERE id = ?', [id]);

    if (!segment) {
      return next(new APIError('NOT_FOUND', `Segment with id ${id} not found`));
    }

    // Validate state transition
    if (!isValidTransition(segment.approval_status, 'archived')) {
      return next(new APIError('INVALID_STATE_TRANSITION',
        `Cannot archive segment with status '${segment.approval_status}'`, {
        current_status: segment.approval_status,
        requested_status: 'archived',
        valid_transitions: VALID_TRANSITIONS[segment.approval_status]
      }));
    }

    // Soft delete (mark as archived)
    await db.run(`
      UPDATE segments
      SET approval_status = 'archived',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Segment archived'
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * POST /api/segments/batch-approve
 * Approve multiple segments
 */
async function batchApprove(req, res, next) {
  const { db } = req.app.locals;
  const { segment_ids } = req.body;

  try {
    const results = {
      success: true,
      approved_count: 0,
      segment_ids: [],
      errors: []
    };

    for (const id of segment_ids) {
      try {
        const segment = await db.get('SELECT * FROM segments WHERE id = ?', [id]);

        if (!segment) {
          results.errors.push({ segment_id: id, error: 'Not found' });
          continue;
        }

        // Check if transition is valid
        if (!isValidTransition(segment.approval_status, 'approved')) {
          results.errors.push({
            segment_id: id,
            error: `Cannot approve from status '${segment.approval_status}'`
          });
          continue;
        }

        // Approve
        await db.run(`
          UPDATE segments
          SET approval_status = 'approved',
              reviewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [id]);

        results.approved_count++;
        results.segment_ids.push(id);
      } catch (err) {
        results.errors.push({ segment_id: id, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * POST /api/segments/batch-skip
 * Skip multiple segments
 */
async function batchSkip(req, res, next) {
  const { db } = req.app.locals;
  const { segment_ids } = req.body;

  try {
    const results = {
      success: true,
      skipped_count: 0,
      segment_ids: [],
      errors: []
    };

    for (const id of segment_ids) {
      try {
        const segment = await db.get('SELECT * FROM segments WHERE id = ?', [id]);

        if (!segment) {
          results.errors.push({ segment_id: id, error: 'Not found' });
          continue;
        }

        // Check if transition is valid
        if (!isValidTransition(segment.approval_status, 'skipped')) {
          results.errors.push({
            segment_id: id,
            error: `Cannot skip from status '${segment.approval_status}'`
          });
          continue;
        }

        // Skip
        await db.run(`
          UPDATE segments
          SET approval_status = 'skipped',
              reviewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [id]);

        results.skipped_count++;
        results.segment_ids.push(id);
      } catch (err) {
        results.errors.push({ segment_id: id, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

module.exports = {
  listSegments,
  getSegment,
  updateSegment,
  approveSegment,
  skipSegment,
  deleteSegment,
  batchApprove,
  batchSkip
};
