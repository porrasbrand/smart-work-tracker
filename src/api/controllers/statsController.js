/**
 * Stats Controller
 * Handles statistics and analytics
 * Phase 5: Review Interface
 */

const { APIError } = require('../middleware/errorHandler');
const config = require('../../../config');

/**
 * GET /api/stats/summary
 * Get summary statistics for dashboard
 */
async function getSummary(req, res, next) {
  const { db } = req.app.locals;

  try {
    // Count by status
    const statusCounts = await db.all(`
      SELECT
        approval_status,
        COUNT(*) as count
      FROM segments
      WHERE approval_status != 'archived'
      GROUP BY approval_status
    `);

    const stats = {
      total_segments: 0,
      pending: 0,
      approved: 0,
      skipped: 0,
      submitted: 0,
      archived: 0,
      total_hours_pending: 0,
      total_hours_approved: 0,
      avg_confidence: 0,
      billable_amount: 0,
      by_project: []
    };

    // Populate status counts
    statusCounts.forEach(row => {
      stats[row.approval_status] = row.count;
      stats.total_segments += row.count;
    });

    // Calculate hours by status
    const hoursByStatus = await db.all(`
      SELECT
        approval_status,
        SUM(COALESCE(adjusted_duration_minutes, duration_minutes)) / 60.0 as total_hours
      FROM segments
      WHERE approval_status != 'archived'
      GROUP BY approval_status
    `);

    hoursByStatus.forEach(row => {
      if (row.approval_status === 'pending') {
        stats.total_hours_pending = parseFloat(row.total_hours || 0);
      } else if (row.approval_status === 'approved') {
        stats.total_hours_approved = parseFloat(row.total_hours || 0);
      }
    });

    // Average confidence score
    const { avg_confidence } = await db.get(`
      SELECT AVG(confidence_score) as avg_confidence
      FROM segments
      WHERE confidence_score IS NOT NULL
        AND approval_status != 'archived'
    `);
    stats.avg_confidence = parseFloat(avg_confidence || 0);

    // Calculate billable amount (approved hours × billing rate)
    const billingRate = parseFloat(process.env.BILLING_RATE_DEFAULT || config.billing?.rateDefault || 100);
    stats.billable_amount = stats.total_hours_approved * billingRate;

    // Hours by project
    const byProject = await db.all(`
      SELECT
        p.id as project_id,
        p.activecollab_project_name as project_name,
        COUNT(s.id) as segment_count,
        SUM(COALESCE(s.adjusted_duration_minutes, s.duration_minutes)) / 60.0 as total_hours,
        AVG(s.confidence_score) as avg_confidence
      FROM segments s
      INNER JOIN projects_map p ON s.project_id_detected = p.id
      WHERE s.approval_status != 'archived'
      GROUP BY p.id, p.activecollab_project_name
      ORDER BY total_hours DESC
    `);

    stats.by_project = byProject.map(row => ({
      project_id: row.project_id,
      project_name: row.project_name,
      segment_count: row.segment_count,
      total_hours: parseFloat(row.total_hours || 0),
      avg_confidence: parseFloat(row.avg_confidence || 0)
    }));

    res.json(stats);
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

/**
 * GET /api/stats/timeline
 * Get timeline of work over days
 */
async function getTimeline(req, res, next) {
  const { db } = req.app.locals;
  const days = parseInt(req.query.days || '30', 10);

  try {
    const timeline = await db.all(`
      SELECT
        DATE(start_time) as date,
        SUM(COALESCE(adjusted_duration_minutes, duration_minutes)) / 60.0 as hours,
        COUNT(*) as segment_count
      FROM segments
      WHERE start_time >= datetime('now', '-${days} days')
        AND approval_status != 'archived'
      GROUP BY DATE(start_time)
      ORDER BY date DESC
    `);

    res.json({
      timeline: timeline.map(row => ({
        date: row.date,
        hours: parseFloat(row.hours || 0),
        segment_count: row.segment_count
      }))
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

module.exports = {
  getSummary,
  getTimeline
};
