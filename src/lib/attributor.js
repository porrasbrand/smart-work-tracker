class Attributor {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
  }

  async attributeSegments() {
    this.logger.info('Starting project attribution');

    // Get all pending segments without attribution
    const segments = await this.db.all(
      'SELECT * FROM segments WHERE status = ? AND project_id_detected IS NULL',
      ['pending']
    );

    this.logger.info('Found segments to attribute', { count: segments.length });

    if (segments.length === 0) {
      return { attributed: 0, ambiguous: 0, noMatch: 0 };
    }

    // Get all projects
    const projects = await this.db.all('SELECT * FROM projects_map');

    if (projects.length === 0) {
      this.logger.warn('No projects in database. Run sync-projects first.');
      return { attributed: 0, ambiguous: 0, noMatch: segments.length };
    }

    // Parse JSON fields and normalize
    projects.forEach(p => {
      p.keywords = p.keywords ? JSON.parse(p.keywords) : [];
      p.cwd_patterns = p.cwd_patterns ? JSON.parse(p.cwd_patterns) : [];
      p.name = p.activecollab_project_name; // Normalize for easier access
      p.id = p.activecollab_project_id; // Normalize project ID
    });

    let attributed = 0;
    let ambiguous = 0;
    let noMatch = 0;

    for (const segment of segments) {
      const matches = this.findMatches(segment, projects);

      if (matches.length === 0) {
        this.logger.debug('No project match', { segmentId: segment.id, cwd: segment.cwd });
        noMatch++;
      } else if (matches.length === 1) {
        // Single match - attribute it
        await this.attributeSegment(segment, matches[0]);
        attributed++;
      } else {
        // Multiple matches - use priority to select best
        const best = this.selectBestMatch(matches);
        await this.attributeSegment(segment, best);
        attributed++;
        if (best.confidence < 1.0) {
          ambiguous++;
        }
      }
    }

    this.logger.info('Attribution complete', {
      attributed,
      ambiguous,
      noMatch
    });

    return { attributed, ambiguous, noMatch };
  }

  findMatches(segment, projects) {
    const matches = [];

    for (const project of projects) {
      const confidence = this.calculateConfidence(segment, project);

      if (confidence > 0) {
        matches.push({
          project,
          confidence
        });
      }
    }

    return matches;
  }

  calculateConfidence(segment, project) {
    let confidence = 0;

    // RULE 0: Summary matching (HIGHEST PRIORITY - User's actual messages!)
    // Check if task_context contains summaries with project mentions
    if (segment.task_context) {
      try {
        const taskContext = JSON.parse(segment.task_context);

        // Check if it's an array of summaries (new format)
        if (Array.isArray(taskContext)) {
          const summariesText = taskContext
            .filter(s => s && typeof s === 'string')
            .join(' ').toLowerCase();

          // Check project name match
          if (project.name && summariesText.includes(project.name.toLowerCase())) {
            this.logger.debug('Project name found in summaries', {
              segmentId: segment.id,
              projectName: project.name
            });
            return 0.98; // Very high confidence from user messages!
          }

          // Check project keywords in summaries
          if (project.keywords) {
            let keywordMatches = 0;
            for (const keyword of project.keywords) {
              if (summariesText.includes(keyword.toLowerCase())) {
                keywordMatches++;
              }
            }

            if (keywordMatches >= 2) {
              this.logger.debug('Multiple keywords found in summaries', {
                segmentId: segment.id,
                projectName: project.name,
                matches: keywordMatches
              });
              return 0.95; // Multiple keyword matches in user messages
            } else if (keywordMatches === 1) {
              confidence = Math.max(confidence, 0.85); // Single keyword match
            }
          }
        }
        // Old format: Task log matching
        else if (taskContext.matchedProjects) {
          const taskMatch = taskContext.matchedProjects.find(p => p.id === project.id);
          if (taskMatch) {
            this.logger.debug('Task log match found', {
              segmentId: segment.id,
              projectId: project.id,
              taskConfidence: taskMatch.confidence,
              taskCount: taskMatch.taskCount
            });
            return taskMatch.confidence; // 0.6-0.95 from task analysis
          }
        }
      } catch (err) {
        this.logger.warn('Failed to parse task_context', {
          segmentId: segment.id,
          error: err.message
        });
      }
    }

    if (!segment.cwd) {
      return 0; // No CWD = no attribution
    }

    const cwdLower = segment.cwd.toLowerCase();

    // Parse files and commands
    const filesTouched = segment.files_touched ? JSON.parse(segment.files_touched) : [];
    const commandsRun = segment.commands_run ? JSON.parse(segment.commands_run) : [];
    const filesText = filesTouched.join(' ').toLowerCase();
    const commandsText = commandsRun.join(' ').toLowerCase();

    // Rule 1: Exact CWD match
    if (project.cwd_patterns) {
      for (const pattern of project.cwd_patterns) {
        const patternLower = pattern.toLowerCase();

        if (cwdLower === patternLower) {
          return 1.0; // Exact match - highest confidence
        }
      }
    }

    // Rule 2: CWD substring match
    if (project.cwd_patterns) {
      for (const pattern of project.cwd_patterns) {
        const patternLower = pattern.toLowerCase();

        if (cwdLower.includes(patternLower) || patternLower.includes(cwdLower)) {
          confidence = Math.max(confidence, 0.9);
        }
      }
    }

    // Rule 3 & 4: Keyword matching in CWD
    if (project.keywords) {
      let keywordMatches = 0;

      for (const keyword of project.keywords) {
        if (cwdLower.includes(keyword)) {
          keywordMatches++;
        }
      }

      if (keywordMatches > 0) {
        const keywordConfidence = Math.min(1.0, 0.7 * keywordMatches);
        confidence = Math.max(confidence, keywordConfidence);
      }
    }

    // Rule 5: Keyword matching in files/commands (NEW)
    if (project.keywords && (filesText || commandsText)) {
      let fileKeywordMatches = 0;
      let commandKeywordMatches = 0;

      for (const keyword of project.keywords) {
        if (filesText.includes(keyword)) {
          fileKeywordMatches++;
        }
        if (commandsText.includes(keyword)) {
          commandKeywordMatches++;
        }
      }

      // If we find keywords in files/commands, give it strong confidence
      if (fileKeywordMatches > 0 || commandKeywordMatches > 0) {
        const totalMatches = fileKeywordMatches + commandKeywordMatches;
        const fileCommandConfidence = Math.min(0.95, 0.6 + (0.1 * totalMatches));
        confidence = Math.max(confidence, fileCommandConfidence);
      }
    }

    return confidence;
  }

  selectBestMatch(matches) {
    // Sort by confidence (desc), then priority (desc)
    matches.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return (b.project.priority || 0) - (a.project.priority || 0);
    });

    return matches[0];
  }

  async attributeSegment(segment, match) {
    await this.db.run(
      `UPDATE segments
       SET project_id_detected = ?,
           confidence_score = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [match.project.id, match.confidence, segment.id]
    );

    this.logger.debug('Segment attributed', {
      segmentId: segment.id,
      projectId: match.project.id,
      projectName: match.project.activecollab_project_name,
      confidence: match.confidence
    });
  }
}

module.exports = Attributor;
