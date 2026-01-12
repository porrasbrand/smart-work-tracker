/**
 * Segment Routes
 * API routes for segment operations
 * Phase 5: Review Interface
 */

const express = require('express');
const router = express.Router();
const segmentController = require('../controllers/segmentController');
const {
  validateSegmentId,
  validateSegmentUpdate,
  validateBatchOperation,
  validatePagination
} = require('../middleware/validation');

// GET /api/segments - List segments with filtering/pagination
router.get('/',
  validatePagination,
  segmentController.listSegments
);

// GET /api/segments/:id - Get single segment
router.get('/:id',
  validateSegmentId,
  segmentController.getSegment
);

// PATCH /api/segments/:id - Update segment
router.patch('/:id',
  validateSegmentId,
  validateSegmentUpdate,
  segmentController.updateSegment
);

// POST /api/segments/:id/approve - Approve segment
router.post('/:id/approve',
  validateSegmentId,
  segmentController.approveSegment
);

// POST /api/segments/:id/skip - Skip segment
router.post('/:id/skip',
  validateSegmentId,
  segmentController.skipSegment
);

// DELETE /api/segments/:id - Archive segment (soft delete)
router.delete('/:id',
  validateSegmentId,
  segmentController.deleteSegment
);

// POST /api/segments/batch-approve - Batch approve
router.post('/batch-approve',
  validateBatchOperation,
  segmentController.batchApprove
);

// POST /api/segments/batch-skip - Batch skip
router.post('/batch-skip',
  validateBatchOperation,
  segmentController.batchSkip
);

module.exports = router;
