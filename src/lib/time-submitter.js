const axios = require('axios');

class TimeSubmitter {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.apiUrl = config.activeCollab.apiUrl;
    this.apiToken = config.activeCollab.apiToken;
    this.userId = config.activeCollab.userId;
    this.jobTypeId = config.activeCollab.jobTypeId || 1;
    this.billableByDefault = config.activeCollab.billableByDefault !== false;
  }

  async submitTimeRecords(options = {}) {
    const {
      dryRun = false,
      startDate = null,
      endDate = null,
      projectId = null
    } = options;

    this.logger.info('Starting time record submission', {
      dryRun,
      startDate,
      endDate,
      projectId
    });

    // Build query to get segments ready to submit
    let query = `
      SELECT
        s.*,
        p.activecollab_project_id,
        p.activecollab_project_name
      FROM segments s
      INNER JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
      WHERE s.submitted_to_ac = 0
        AND s.project_id_final IS NOT NULL
        AND s.approval_status = 'approved'
    `;

    const params = [];

    if (startDate) {
      query += ' AND datetime(s.start_time) >= datetime(?)';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND datetime(s.start_time) <= datetime(?)';
      params.push(endDate);
    }

    if (projectId) {
      query += ' AND p.activecollab_project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY s.start_time ASC';

    const segments = await this.db.all(query, params);

    this.logger.info('Found segments to submit', { count: segments.length });

    if (segments.length === 0) {
      return {
        submitted: 0,
        failed: 0,
        skipped: 0,
        totalHours: 0
      };
    }

    let submitted = 0;
    let failed = 0;
    let skipped = 0;
    let totalHours = 0;

    for (const segment of segments) {
      try {
        const durationMinutes = segment.adjusted_duration_minutes || segment.duration_minutes;

        if (dryRun) {
          this.logger.info('DRY RUN - Would submit:', {
            segmentId: segment.id,
            project: segment.activecollab_project_name,
            hours: (durationMinutes / 60).toFixed(2),
            originalHours: (segment.duration_minutes / 60).toFixed(2),
            date: new Date(segment.start_time).toISOString().split('T')[0]
          });
          skipped++;
          continue;
        }

        const result = await this.submitSegment(segment);

        if (result.success) {
          submitted++;
          totalHours += durationMinutes / 60;
          this.logger.info('Time record submitted', {
            segmentId: segment.id,
            timeRecordId: result.timeRecordId,
            project: segment.activecollab_project_name,
            hours: (segment.duration_minutes / 60).toFixed(2)
          });
        } else {
          failed++;
          this.logger.error('Failed to submit time record', {
            segmentId: segment.id,
            error: result.error
          });
        }
      } catch (err) {
        failed++;
        this.logger.error('Error submitting segment', {
          segmentId: segment.id,
          error: err.message,
          stack: err.stack
        });
      }
    }

    this.logger.info('Time submission complete', {
      submitted,
      failed,
      skipped,
      totalHours: totalHours.toFixed(2)
    });

    return {
      submitted,
      failed,
      skipped,
      totalHours: totalHours.toFixed(2)
    };
  }

  async createTask(segment, taskName) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/projects/${segment.activecollab_project_id}/tasks`,
        {
          name: taskName,
          assignee_id: this.userId
        },
        {
          headers: {
            'X-Angie-AuthApiToken': this.apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const task = response.data.single;

      this.logger.info('Task created in ActiveCollab', {
        segmentId: segment.id,
        taskId: task.id,
        taskName: task.name,
        projectId: segment.activecollab_project_id
      });

      return {
        success: true,
        taskId: task.id,
        taskName: task.name
      };
    } catch (err) {
      this.logger.error('Failed to create task in ActiveCollab', {
        segmentId: segment.id,
        taskName: taskName,
        error: err.response?.data?.message || err.message
      });

      return {
        success: false,
        error: err.response?.data?.message || err.message
      };
    }
  }

  async submitSegment(segment) {
    // Use adjusted duration if available, otherwise use actual duration
    const durationMinutes = segment.adjusted_duration_minutes || segment.duration_minutes;
    const hours = durationMinutes / 60;
    const recordDate = new Date(segment.start_time).toISOString().split('T')[0];

    // Build summary from task description or task context
    let summary = segment.task_description || 'Development work';

    if (segment.task_context) {
      try {
        const taskContext = JSON.parse(segment.task_context);
        if (taskContext.taskSummaries && taskContext.taskSummaries.length > 0) {
          // Use first task summary
          summary = taskContext.taskSummaries[0].substring(0, 250);
        }
      } catch (err) {
        this.logger.warn('Failed to parse task_context for summary', {
          segmentId: segment.id
        });
      }
    }

    // Create task in ActiveCollab (if not already created)
    let taskId = segment.ac_task_id;

    if (!taskId) {
      // Build task name with (st) suffix
      const taskName = `${summary.substring(0, 100)} (st)`;

      const taskResult = await this.createTask(segment, taskName);

      if (!taskResult.success) {
        // If task creation fails, log error and continue without task
        this.logger.warn('Continuing time submission without task', {
          segmentId: segment.id,
          error: taskResult.error
        });
      } else {
        taskId = taskResult.taskId;

        // Store task ID in database
        await this.db.run(`
          UPDATE segments
          SET ac_task_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [taskId, segment.id]);
      }
    }

    const payload = {
      value: hours.toFixed(2),
      user_id: this.userId,
      job_type_id: this.jobTypeId,
      record_date: recordDate,
      billable_status: this.billableByDefault ? 1 : 0,
      summary: summary
    };

    // Add task_id if we have one
    if (taskId) {
      payload.task_id = taskId;
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/projects/${segment.activecollab_project_id}/time-records`,
        payload,
        {
          headers: {
            'X-Angie-AuthApiToken': this.apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const timeRecord = response.data.single;

      // Mark segment as submitted
      await this.db.run(`
        UPDATE segments
        SET submitted_to_ac = 1,
            ac_time_record_id = ?,
            submitted_at = CURRENT_TIMESTAMP,
            approval_status = 'submitted',
            submission_error = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [timeRecord.id, segment.id]);

      return {
        success: true,
        timeRecordId: timeRecord.id,
        taskId: taskId
      };
    } catch (err) {
      // Log error to database
      const errorMessage = err.response?.data?.message || err.message;

      await this.db.run(`
        UPDATE segments
        SET submission_error = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [errorMessage, segment.id]);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getSubmissionSummary() {
    const summary = await this.db.get(`
      SELECT
        COUNT(*) as total_segments,
        SUM(CASE WHEN submitted_to_ac = 1 THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN submitted_to_ac = 0 AND project_id_final IS NOT NULL AND approval_status = 'approved' THEN 1 ELSE 0 END) as ready_to_submit,
        SUM(CASE WHEN submitted_to_ac = 0 AND project_id_final IS NULL THEN 1 ELSE 0 END) as unattributed,
        SUM(CASE WHEN submitted_to_ac = 1 THEN COALESCE(adjusted_duration_minutes, duration_minutes) ELSE 0 END) as submitted_minutes,
        SUM(CASE WHEN submitted_to_ac = 0 AND project_id_final IS NOT NULL AND approval_status = 'approved' THEN COALESCE(adjusted_duration_minutes, duration_minutes) ELSE 0 END) as pending_minutes
      FROM segments
      WHERE status != 'archived'
    `);

    return {
      totalSegments: summary.total_segments,
      submitted: summary.submitted,
      readyToSubmit: summary.ready_to_submit,
      unattributed: summary.unattributed,
      submittedHours: (summary.submitted_minutes / 60).toFixed(2),
      pendingHours: (summary.pending_minutes / 60).toFixed(2)
    };
  }
}

module.exports = TimeSubmitter;
