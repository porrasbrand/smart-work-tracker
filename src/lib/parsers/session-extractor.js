class SessionExtractor {
  extractMetadata(events) {
    const metadata = {
      startTime: null,
      endTime: null,
      cwd: null,
      gitBranch: null,
      filesTouched: new Set(),
      commandsRun: new Set(),
    };

    for (const item of events) {
      const event = item.event;

      // Extract timestamps
      if (event.timestamp) {
        const ts = new Date(event.timestamp);
        if (!metadata.startTime || ts < metadata.startTime) {
          metadata.startTime = ts;
        }
        if (!metadata.endTime || ts > metadata.endTime) {
          metadata.endTime = ts;
        }
      }

      // Extract cwd and git branch from event (they're at the top level)
      if (event.cwd && !metadata.cwd) {
        metadata.cwd = event.cwd;
      }
      if (event.gitBranch && !metadata.gitBranch) {
        metadata.gitBranch = event.gitBranch;
      }

      // Extract tool uses from message content
      if (event.message?.content && Array.isArray(event.message.content)) {
        for (const contentItem of event.message.content) {
          if (contentItem.type === 'tool_use') {
            const toolName = contentItem.name;
            const toolInput = contentItem.input || {};

            // Extract files touched (Read, Write, Edit operations)
            if (['Read', 'Write', 'Edit', 'NotebookEdit'].includes(toolName)) {
              const filePath = toolInput.file_path || toolInput.notebook_path;
              if (filePath) {
                metadata.filesTouched.add(filePath);
              }
            }

            // Extract commands run (Bash operations)
            if (toolName === 'Bash' && toolInput.command) {
              // Truncate long commands
              const cmd = toolInput.command.substring(0, 200);
              metadata.commandsRun.add(cmd);
            }
          }
        }
      }
    }

    return {
      ...metadata,
      filesTouched: Array.from(metadata.filesTouched),
      commandsRun: Array.from(metadata.commandsRun),
    };
  }

  extractText(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(item => {
        if (typeof item === 'string') return item;
        if (item && item.text) return item.text;
        return '';
      }).join('\n');
    }
    if (content && content.text) return content.text;
    return '';
  }
}

module.exports = SessionExtractor;
