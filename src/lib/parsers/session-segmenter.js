class SessionSegmenter {
  constructor(config) {
    this.idleGapMinutes = config.attribution.idleGapMinutes || 15;
    this.minSessionMinutes = config.attribution.minSessionMinutes || 5;
  }

  segment(events, metadata) {
    const segments = [];
    let currentSegment = null;

    // Filter events with timestamps and sort by time
    const timestampedEvents = events
      .filter(item => item.event && item.event.timestamp)
      .sort((a, b) => new Date(a.event.timestamp) - new Date(b.event.timestamp));

    if (timestampedEvents.length === 0) {
      return segments;
    }

    for (const item of timestampedEvents) {
      const event = item.event;
      const eventTime = new Date(event.timestamp);

      // Start new segment if:
      // 1. No current segment
      // 2. Gap > idle threshold
      if (!currentSegment) {
        currentSegment = this.createSegment(eventTime, metadata);
      } else {
        const gapMinutes = (eventTime - currentSegment.endTime) / (1000 * 60);

        if (gapMinutes > this.idleGapMinutes) {
          // Save current segment if long enough
          if (this.isSegmentValid(currentSegment)) {
            // Calculate final duration
            currentSegment.durationMinutes = Math.round(
              (currentSegment.endTime - currentSegment.startTime) / (1000 * 60)
            );
            segments.push(currentSegment);
          }
          // Start new segment
          currentSegment = this.createSegment(eventTime, metadata);
        } else {
          // Extend current segment
          currentSegment.endTime = eventTime;
        }
      }

      // Track files and commands in this segment
      this.addEventMetadata(currentSegment, event);
    }

    // Save final segment
    if (currentSegment && this.isSegmentValid(currentSegment)) {
      currentSegment.durationMinutes = Math.round(
        (currentSegment.endTime - currentSegment.startTime) / (1000 * 60)
      );
      segments.push(currentSegment);
    }

    return segments;
  }

  addEventMetadata(segment, event) {
    // Capture event summary (high-level context)
    if (event.summary && typeof event.summary === 'string') {
      const cleanSummary = event.summary.trim();
      if (cleanSummary.length > 0 && cleanSummary.length < 500) {
        segment.summaries.add(cleanSummary);
      }
    }

    // Capture USER messages (the most important signal!)
    if (event.type === 'user' && event.message) {
      let userText = null;

      // Handle different user message formats
      if (typeof event.message.content === 'string') {
        // Simple string format
        userText = event.message.content;
      } else if (Array.isArray(event.message.content)) {
        // Array format - look for text content
        for (const item of event.message.content) {
          if (item.type === 'text' && item.text) {
            userText = item.text;
            break;
          } else if (typeof item === 'string') {
            userText = item;
            break;
          }
        }
      }

      // Add user message to summaries if found
      if (userText && userText.trim().length > 10) {
        // Truncate very long messages but keep meaningful ones
        const truncated = userText.length > 300 ? userText.substring(0, 297) + '...' : userText;
        segment.summaries.add(truncated.trim());
      }
    }

    // Extract files and commands from this event
    if (event.message?.content && Array.isArray(event.message.content)) {
      for (const contentItem of event.message.content) {
        if (contentItem.type === 'tool_use') {
          const toolName = contentItem.name;
          const toolInput = contentItem.input || {};

          // Track files touched
          if (['Read', 'Write', 'Edit', 'NotebookEdit'].includes(toolName)) {
            const filePath = toolInput.file_path || toolInput.notebook_path;
            if (filePath) {
              segment.filesTouched.add(filePath);
            }
          }

          // Track commands run
          if (toolName === 'Bash' && toolInput.command) {
            const cmd = toolInput.command.substring(0, 200); // Truncate long commands
            segment.commandsRun.add(cmd);
          }
        }
      }
    }
  }

  createSegment(startTime, metadata) {
    return {
      startTime,
      endTime: startTime,
      cwd: metadata.cwd || null,
      gitBranch: metadata.gitBranch || null,
      filesTouched: new Set(),
      commandsRun: new Set(),
      summaries: new Set(), // User messages and task context
      durationMinutes: 0
    };
  }

  isSegmentValid(segment) {
    const duration = (segment.endTime - segment.startTime) / (1000 * 60);
    return duration >= this.minSessionMinutes;
  }
}

module.exports = SessionSegmenter;
