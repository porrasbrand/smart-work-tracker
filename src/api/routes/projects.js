/**
 * Project Routes
 * API routes for project operations
 * Phase 5: Review Interface
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// GET /api/projects - List all projects
router.get('/',
  projectController.listProjects
);

module.exports = router;
