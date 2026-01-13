class TaskDetector {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  detectTaskType(segment) {
    // Parse JSON fields
    const filesTouched = segment.files_touched ? JSON.parse(segment.files_touched) : [];
    const commandsRun = segment.commands_run ? JSON.parse(segment.commands_run) : [];
    const summaries = segment.task_context ? JSON.parse(segment.task_context) : [];

    // Collect signals from different sources
    const signals = {
      summaries: this.analyzeSummaries(summaries), // HIGHEST priority signal!
      branchName: this.analyzeBranchName(segment.git_branch),
      fileOps: this.analyzeFileOperations(filesTouched),
      commands: this.analyzeCommands(commandsRun)
    };

    // Determine task type from signals
    const taskType = this.selectTaskType(signals);

    // Generate description (summaries are now primary source)
    const description = this.generateDescription(segment, filesTouched, commandsRun, taskType, summaries);

    // Calculate confidence
    const confidence = this.calculateConfidence(signals);

    return {
      type: taskType,
      description,
      confidence,
      signals
    };
  }

  analyzeSummaries(summaries) {
    if (!summaries || !Array.isArray(summaries) || summaries.length === 0) {
      return { type: 'unknown', confidence: 0, description: null, projects: [] };
    }

    // Combine all summaries into context
    const combinedText = summaries.filter(s => s && typeof s === 'string').join(' ').toLowerCase();

    // Extract project names mentioned
    const projects = this.extractProjectNames(summaries);

    // Detect task type from summary text
    let taskType = 'existing_task';
    let confidence = 0.9; // High confidence when we have user messages

    // Keywords indicating new tasks
    if (combinedText.match(/\b(create|build|implement|add|generate|setup|initialize)\b/)) {
      taskType = 'new_task';
      confidence = 0.95;
    }
    // Keywords indicating bug fixes
    else if (combinedText.match(/\b(fix|debug|repair|resolve|bug|error|issue)\b/)) {
      taskType = 'bug_fix';
      confidence = 0.95;
    }
    // Keywords indicating refactoring
    else if (combinedText.match(/\b(refactor|cleanup|reorganize|improve|optimize)\b/)) {
      taskType = 'refactoring';
      confidence = 0.95;
    }

    // Use first non-technical summary as description
    const description = this.extractBestSummary(summaries);

    return {
      type: taskType,
      confidence,
      description,
      projects
    };
  }

  extractProjectNames(summaries) {
    const projects = new Set();

    for (const summary of summaries) {
      // Look for common project name patterns
      const matches = summary.match(/\b([\w-]+(?:-[\w-]+)*)\s+(?:project|tracker|system|service|report|site|app)/gi);
      if (matches) {
        matches.forEach(match => {
          const projectName = match.split(/\s+/)[0];
          if (projectName.length > 3) {
            projects.add(projectName);
          }
        });
      }
    }

    return Array.from(projects);
  }

  extractBestSummary(summaries) {
    // Filter out technical/noise summaries
    const meaningful = summaries.filter(s => {
      const lower = s.toLowerCase();
      // Skip very short or technical summaries
      if (s.length < 10) return false;
      // Skip generic phrases
      if (lower.match(/^(processing|analyzing|checking|reading|writing)/)) return false;
      return true;
    });

    // Return first meaningful summary (user's actual request)
    if (meaningful.length > 0) {
      // Truncate if too long
      const summary = meaningful[0];
      return summary.length > 150 ? summary.substring(0, 147) + '...' : summary;
    }

    return null;
  }

  analyzeBranchName(gitBranch) {
    if (!gitBranch) {
      return { type: 'unknown', confidence: 0 };
    }

    const branch = gitBranch.toLowerCase();

    // New task patterns
    if (branch.match(/^(feature|feat)\//)) return { type: 'new_task', confidence: 1.0 };
    if (branch.match(/^(add|new|create)-/)) return { type: 'new_task', confidence: 1.0 };

    // Bug fix patterns
    if (branch.match(/^(fix|bugfix|hotfix)\//)) return { type: 'bug_fix', confidence: 1.0 };
    if (branch.match(/^fix-/)) return { type: 'bug_fix', confidence: 1.0 };

    // Refactoring patterns
    if (branch.match(/^(refactor|cleanup)-/)) return { type: 'refactoring', confidence: 1.0 };

    // Existing task patterns
    if (branch.match(/^(update|improve|enhance)-/)) return { type: 'existing_task', confidence: 1.0 };

    // Main/master/develop branches suggest existing work
    if (branch.match(/^(main|master|develop|dev)$/)) return { type: 'existing_task', confidence: 0.6 };

    return { type: 'unknown', confidence: 0 };
  }

  analyzeFileOperations(filesTouched) {
    if (!filesTouched || filesTouched.length === 0) {
      return { type: 'unknown', confidence: 0 };
    }

    // Count file types (very basic heuristic)
    let newFilesLikely = 0;
    let existingFilesLikely = 0;
    let testFiles = 0;

    for (const file of filesTouched) {
      const fileName = file.toLowerCase();

      // Test files suggest bug fixes or new features being tested
      if (fileName.match(/\.(test|spec)\./)) {
        testFiles++;
      }

      // Common new project indicators
      if (fileName.match(/(package\.json|readme|\.gitignore|license)/)) {
        newFilesLikely++;
      }

      // Otherwise assume existing file work
      existingFilesLikely++;
    }

    // Simple heuristic: many files touched suggests new task
    if (filesTouched.length > 5) {
      return { type: 'new_task', confidence: 0.7 };
    }

    // Test files suggest bug fixes
    if (testFiles > 0 && testFiles / filesTouched.length > 0.3) {
      return { type: 'bug_fix', confidence: 0.6 };
    }

    // Few files touched suggests existing task updates
    return { type: 'existing_task', confidence: 0.5 };
  }

  analyzeCommands(commandsRun) {
    if (!commandsRun || commandsRun.length === 0) {
      return { type: 'unknown', confidence: 0 };
    }

    let newTaskIndicators = 0;
    let bugFixIndicators = 0;
    let existingTaskIndicators = 0;

    for (const cmd of commandsRun) {
      const command = cmd.toLowerCase();

      // New task indicators
      if (command.match(/npm install|yarn add|pip install/)) newTaskIndicators++;
      if (command.match(/git init|mkdir.*project|npx create-/)) newTaskIndicators++;

      // Bug fix indicators
      if (command.match(/npm test|pytest|jest|test|debug/)) bugFixIndicators++;
      if (command.match(/git commit --amend/)) bugFixIndicators++;

      // Existing task indicators
      if (command.match(/npm run build|yarn build|make/)) existingTaskIndicators++;
    }

    // Prioritize strongest signal
    if (newTaskIndicators > bugFixIndicators && newTaskIndicators > existingTaskIndicators) {
      return { type: 'new_task', confidence: 0.7 };
    }
    if (bugFixIndicators > newTaskIndicators && bugFixIndicators > existingTaskIndicators) {
      return { type: 'bug_fix', confidence: 0.7 };
    }
    if (existingTaskIndicators > 0) {
      return { type: 'existing_task', confidence: 0.6 };
    }

    return { type: 'unknown', confidence: 0 };
  }

  selectTaskType(signals) {
    // Summaries (user messages) have HIGHEST priority!
    if (signals.summaries.confidence >= 0.9) {
      return signals.summaries.type;
    }

    // Branch name has second highest priority
    if (signals.branchName.confidence >= 1.0) {
      return signals.branchName.type;
    }

    // If branch suggests main/master, use file ops signal
    if (signals.branchName.type === 'existing_task' && signals.branchName.confidence < 1.0) {
      if (signals.fileOps.confidence > signals.branchName.confidence) {
        return signals.fileOps.type;
      }
    }

    // Use strongest signal
    const allSignals = [signals.summaries, signals.branchName, signals.fileOps, signals.commands];
    const strongest = allSignals.reduce((max, signal) =>
      signal.confidence > max.confidence ? signal : max
    );

    return strongest.type;
  }

  generateDescription(segment, filesTouched, commandsRun, taskType, summaries) {
    // If we have a summary description from user messages, USE IT!
    if (summaries && summaries.length > 0) {
      const bestSummary = this.extractBestSummary(summaries);
      if (bestSummary) {
        return bestSummary;
      }
    }

    // Fallback to old method if no good summaries
    // Extract project name from CWD
    const projectName = this.extractProjectName(segment.cwd);

    // Extract key files/components
    const components = this.extractComponents(filesTouched);

    // Generate description based on task type
    const templates = {
      new_task: `Add ${components} to ${projectName}`,
      existing_task: `Update ${components} in ${projectName}`,
      bug_fix: `Fix ${components} in ${projectName}`,
      refactoring: `Refactor ${components} in ${projectName}`,
      unknown: `Work on ${projectName}`
    };

    return templates[taskType] || templates.unknown;
  }

  extractProjectName(cwd) {
    if (!cwd) return 'project';

    // Extract last part of path
    const parts = cwd.split('/');
    return parts[parts.length - 1] || 'project';
  }

  extractComponents(filesTouched) {
    if (!filesTouched || filesTouched.length === 0) {
      return 'components';
    }

    // Extract unique directories/components
    const components = new Set();

    for (const file of filesTouched.slice(0, 5)) { // Limit to first 5 files
      const parts = file.split('/');
      const fileName = parts[parts.length - 1];

      // Remove extension and use as component name
      const component = fileName.replace(/\.[^/.]+$/, '');
      if (component && component.length > 0) {
        components.add(component);
      }
    }

    if (components.size === 0) return 'components';
    if (components.size === 1) return Array.from(components)[0];
    if (components.size === 2) return Array.from(components).join(' and ');

    return `${Array.from(components).slice(0, 2).join(', ')} and others`;
  }

  calculateConfidence(signals) {
    // Weight the signals (summaries are most important!)
    const weights = {
      summaries: 0.6,   // User messages are strongest signal!
      branchName: 0.2,  // Branch name is second
      fileOps: 0.1,     // File operations are moderate
      commands: 0.1     // Commands are weakest
    };

    const weightedConfidence =
      (signals.summaries.confidence * weights.summaries) +
      (signals.branchName.confidence * weights.branchName) +
      (signals.fileOps.confidence * weights.fileOps) +
      (signals.commands.confidence * weights.commands);

    // If all signals agree on same type, boost confidence
    const types = [signals.summaries.type, signals.branchName.type, signals.fileOps.type, signals.commands.type]
      .filter(t => t !== 'unknown');

    if (types.length >= 2) {
      const allSame = types.every(t => t === types[0]);
      if (allSame) {
        return Math.min(1.0, weightedConfidence * 1.2);
      }
    }

    return Math.max(0.2, weightedConfidence); // Minimum confidence 0.2
  }
}

module.exports = TaskDetector;
