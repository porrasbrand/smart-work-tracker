/**
 * Submit Routes
 * API routes for ActiveCollab submission preview
 * Phase 5: Review Interface
 */

const express = require('express');
const router = express.Router();
const submitController = require('../controllers/submitController');

// GET /api/submit/preview - Preview submission
router.get('/preview',
  submitController.getPreview
);

module.exports = router;
