/**
 * Stats Routes
 * API routes for statistics and analytics
 * Phase 5: Review Interface
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { validatePagination } = require('../middleware/validation');

// GET /api/stats/summary - Dashboard summary
router.get('/summary',
  statsController.getSummary
);

// GET /api/stats/timeline - Timeline of work
router.get('/timeline',
  validatePagination,
  statsController.getTimeline
);

module.exports = router;
