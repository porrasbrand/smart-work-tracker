/**
 * Submit Controller
 * Handles submission preview for ActiveCollab
 * Phase 5: Review Interface
 */

const { APIError } = require('../middleware/errorHandler');
const config = require('../../../config');

/**
 * GET /api/submit/preview
 * Preview what will be submitted to ActiveCollab
 */
async function getPreview(req, res, next) {
  const { db } = req.app.locals;
  const { status = 'approved' } = req.query;

  try {
    // Get segments ready for submission
    const segments = await db.all(`
      SELECT
        s.id as segment_id,
        s.start_time,
        s.duration_minutes,
        s.adjusted_duration_minutes,
        s.task_description,
        s.task_context,
        p.id as project_id,
        p.activecollab_project_id,
        p.activecollab_project_name as project_name
      FROM segments s
      INNER JOIN projects_map p ON s.project_id_detected = p.id
      WHERE s.approval_status = ?
        AND s.submitted_to_ac = 0
      ORDER BY s.start_time DESC
    `, [status]);

    // Format segments for preview
    const segmentsToSubmit = segments.map(seg => {
      // Build task name
      let taskName = seg.task_description || 'Development work';

      // Extract from task_context if available
      if (seg.task_context) {
        try {
          const tc = JSON.parse(seg.task_context);
          if (tc.taskSummaries && tc.taskSummaries.length > 0) {
            taskName = tc.taskSummaries[0].substring(0, 100);
          }
        } catch (err) {
          // Ignore parse errors
        }
      }

      // Add (st) suffix
      taskName = `${taskName} (st)`;

      // Calculate hours
      const minutes = seg.adjusted_duration_minutes || seg.duration_minutes;
      const hours = minutes / 60;

      // Format date
      const date = new Date(seg.start_time).toISOString().split('T')[0];

      return {
        segment_id: seg.segment_id,
        project_id: seg.activecollab_project_id,
        project_name: seg.project_name,
        task_name: taskName,
        hours: parseFloat(hours.toFixed(2)),
        date
      };
    });

    // Calculate totals
    const totalHours = segmentsToSubmit.reduce((sum, seg) => sum + seg.hours, 0);
    const billingRate = parseFloat(process.env.BILLING_RATE_DEFAULT || config.billing?.rateDefault || 100);
    const totalBillable = totalHours * billingRate;

    res.json({
      segments_to_submit: segmentsToSubmit,
      total_hours: parseFloat(totalHours.toFixed(2)),
      total_billable: parseFloat(totalBillable.toFixed(2)),
      segment_count: segmentsToSubmit.length
    });
  } catch (err) {
    next(new APIError('DATABASE_ERROR', err.message));
  }
}

module.exports = {
  getPreview
};
