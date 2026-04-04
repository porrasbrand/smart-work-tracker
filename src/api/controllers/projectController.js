/**
 * Project Controller
 * Handles project-related operations
 * Phase 5: Review Interface
 */

const { APIError } = require('../middleware/errorHandler');

/**
 * GET /api/projects
 * List all projects from projects_map
 */
async function listProjects(req, res, next) {
  const { db } = req.app.locals;

  try {
    const projects = await db.all(`
      SELECT
        id,
        activecollab_project_id,
        activecollab_project_name,
        keywords
      FROM projects_map
      ORDER BY activecollab_project_name
    `);

    // Parse keywords JSON
    const projectsWithKeywords = projects.map(p => ({
      ...p,
      keywords: p.keywords ? JSON.parse(p.keywords) : []
    }));

    res.json({
      projects: projectsWithKeywords
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

module.exports = {
  listProjects
};
