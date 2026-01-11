const fs = require('fs');
const path = require('path');

class TaskLogAnalyzer {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.taskLogDir = '/home/mp/awesome/super-agent/tasks/responses/archive';
    this.dateCutoff = new Date('2025-12-20T00:00:00Z');
    this.timeWindowMinutes = 30; // Link tasks within ±30 min of segment
  }

  async loadTaskLogs() {
    this.logger.info('Loading task logs', { directory: this.taskLogDir });

    try {
      const files = fs.readdirSync(this.taskLogDir)
        .filter(f => f.endsWith('.json'));

      const tasks = [];

      for (const file of files) {
        try {
          const timestamp = parseInt(path.basename(file, '.json'));
          const date = new Date(timestamp);

          // Skip if before cutoff
          if (date < this.dateCutoff) continue;

          const content = JSON.parse(
            fs.readFileSync(path.join(this.taskLogDir, file), 'utf8')
          );

          tasks.push({
            id: timestamp,
            timestamp,
            date,
            task: content.task || '',
            response: content.response || '',
            fetchedAt: content.fetchedAt || date.toISOString()
          });
        } catch (err) {
          this.logger.warn('Failed to parse task file', { file, error: err.message });
        }
      }

      this.logger.info('Loaded task logs', { count: tasks.length });
      return tasks;
    } catch (err) {
      this.logger.error('Failed to read task log directory', { error: err.message });
      return [];
    }
  }

  matchTasksToProjects(tasks, projects) {
    this.logger.info('Matching tasks to projects');

    const matches = [];

    for (const task of tasks) {
      const taskText = `${task.task} ${task.response}`.toLowerCase();

      for (const project of projects) {
        const keywords = project.keywords || [];
        const matchedKeywords = [];

        for (const keyword of keywords) {
          if (keyword.length <= 3) continue; // Skip very short keywords

          // Use word boundary matching to avoid partial word matches
          // e.g., "hall" should not match within "challenges"
          const keywordLower = keyword.toLowerCase();
          const regex = new RegExp(`\\b${keywordLower}\\b`, 'i');

          if (regex.test(taskText)) {
            matchedKeywords.push(keyword);
          }
        }

        if (matchedKeywords.length > 0) {
          // Calculate confidence based on keyword matches
          let confidence = 0.6 + (0.1 * matchedKeywords.length);
          confidence = Math.min(0.95, confidence);

          // Check if this is a false positive
          if (this.isFalsePositive(task, project, matchedKeywords)) {
            this.logger.debug('False positive detected', {
              task: task.id,
              project: project.activecollab_project_name,
              keywords: matchedKeywords
            });
            continue; // Skip this match
          }

          matches.push({
            taskId: task.id,
            taskDate: task.date,
            projectId: project.id,
            projectName: project.activecollab_project_name,
            acProjectId: project.activecollab_project_id,
            confidence,
            matchedKeywords,
            taskSummary: task.task.substring(0, 150)
          });
        }
      }
    }

    this.logger.info('Task-to-project matches found', { count: matches.length });
    return matches;
  }

  isFalsePositive(task, project, matchedKeywords) {
    const taskText = `${task.task} ${task.response}`.toLowerCase();
    const projectName = project.activecollab_project_name.toLowerCase();

    // FALSE POSITIVE RULES

    // Rule 1: Generic HVAC keywords (plumbing, electric, heating) without company name
    const genericHVACKeywords = ['plumbing', 'electric', 'heating', 'hvac'];
    if (matchedKeywords.some(k => genericHVACKeywords.includes(k.toLowerCase()))) {
      // Check if the actual company name is present
      const companyIdentifier = projectName
        .replace(/\.com|\.net|\.org/g, '')
        .replace(/[^a-z0-9]/g, '');

      if (!taskText.includes(companyIdentifier)) {
        // Generic keyword without company name = false positive
        return true;
      }
    }

    // Rule 2: plumbing-connection.com - only match if exact domain present
    if (projectName.includes('plumbing-connection')) {
      if (!taskText.includes('plumbing-connection.com') &&
          !taskText.includes('plumbing connection')) {
        return true; // "plumbing" alone is not enough
      }
    }

    // Rule 3: echelonelectricnj.com - require "echelon" specifically
    if (projectName.includes('echelon')) {
      if (!matchedKeywords.includes('echelon') && !taskText.includes('echelon')) {
        return true; // "electric" alone is not enough
      }
    }

    // Rule 4: Phoenix & Infiniskin / Dr. Hall - location vs client disambiguation
    if (projectName.includes('phoenix') && projectName.includes('infiniskin')) {
      // Only match if "infiniskin" or "phoenixweightloss" is present
      if (!taskText.includes('infiniskin') && !taskText.includes('phoenixweightloss')) {
        // Just "phoenix" or "hall" = location reference, not client
        return true;
      }
    }

    // Rule 5: Generic business terms
    const genericTerms = ['connection', 'service', 'solutions', 'group', 'company'];
    if (matchedKeywords.every(k => genericTerms.includes(k.toLowerCase()))) {
      // All matches are generic terms = false positive
      return true;
    }

    return false; // Not a false positive
  }

  linkTasksToSegments(taskMatches, segments) {
    this.logger.info('Linking tasks to segments');

    const linkedSegments = [];

    for (const segment of segments) {
      const segmentStart = new Date(segment.start_time);
      const segmentEnd = new Date(segment.end_time);

      // Find tasks within time window
      const linkedTasks = taskMatches.filter(match => {
        const taskDate = match.taskDate;

        // Check if task is within ±30 min of segment
        const startWindow = new Date(segmentStart.getTime() - this.timeWindowMinutes * 60 * 1000);
        const endWindow = new Date(segmentEnd.getTime() + this.timeWindowMinutes * 60 * 1000);

        return taskDate >= startWindow && taskDate <= endWindow;
      });

      if (linkedTasks.length > 0) {
        linkedSegments.push({
          segment,
          linkedTasks,
          taskContext: this.buildTaskContext(linkedTasks)
        });
      }
    }

    this.logger.info('Segments linked to tasks', { count: linkedSegments.length });
    return linkedSegments;
  }

  buildTaskContext(linkedTasks) {
    // Group by project
    const projectMap = {};

    for (const task of linkedTasks) {
      if (!projectMap[task.projectId]) {
        projectMap[task.projectId] = {
          id: task.projectId,
          name: task.projectName,
          confidence: task.confidence,
          taskCount: 0
        };
      }
      projectMap[task.projectId].taskCount++;
      // Use highest confidence
      projectMap[task.projectId].confidence = Math.max(
        projectMap[task.projectId].confidence,
        task.confidence
      );
    }

    return {
      taskIds: linkedTasks.map(t => t.taskId),
      taskSummaries: linkedTasks.map(t => t.taskSummary),
      matchedProjects: Object.values(projectMap)
    };
  }

  async analyzeAndLink() {
    this.logger.info('Starting task log analysis and linking');

    // Load all tasks
    const tasks = await this.loadTaskLogs();

    if (tasks.length === 0) {
      this.logger.warn('No task logs found');
      return { linked: 0, totalTasks: 0 };
    }

    // Get all projects
    const projects = await this.db.all('SELECT * FROM projects_map');

    // Parse keywords
    projects.forEach(p => {
      p.keywords = p.keywords ? JSON.parse(p.keywords) : [];
    });

    // Match tasks to projects
    const taskMatches = this.matchTasksToProjects(tasks, projects);

    // Get all segments
    const segments = await this.db.all(`
      SELECT * FROM segments
      WHERE status = 'pending'
      ORDER BY start_time DESC
    `);

    // Link tasks to segments
    const linkedSegments = this.linkTasksToSegments(taskMatches, segments);

    // Update segments with task context
    let updated = 0;
    for (const linked of linkedSegments) {
      await this.db.run(`
        UPDATE segments
        SET task_context = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [JSON.stringify(linked.taskContext), linked.segment.id]);

      this.logger.debug('Updated segment with task context', {
        segmentId: linked.segment.id,
        taskCount: linked.linkedTasks.length
      });

      updated++;
    }

    this.logger.info('Task log analysis complete', {
      totalTasks: tasks.length,
      taskMatches: taskMatches.length,
      segmentsLinked: updated
    });

    return {
      totalTasks: tasks.length,
      taskMatches: taskMatches.length,
      segmentsLinked: updated
    };
  }
}

module.exports = TaskLogAnalyzer;
