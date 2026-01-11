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

      // Extract cwd from tool_use events
      if (event.type === 'tool_use' && event.cwd) {
        metadata.cwd = metadata.cwd || event.cwd;
      }

      // Extract git branch from Bash tool results
      if (event.type === 'tool_result' && event.tool === 'Bash') {
        // Look for "On branch X" in git status output
        const content = this.extractText(event.content);
        if (content) {
          const branchMatch = content.match(/On branch ([^\s\n]+)/);
          if (branchMatch) {
            metadata.gitBranch = branchMatch[1];
          }
        }
      }

      // Extract files touched (Read, Write, Edit operations)
      if (event.type === 'tool_use') {
        if (['Read', 'Write', 'Edit', 'NotebookEdit'].includes(event.tool)) {
          if (event.params) {
            const filePath = event.params.file_path || event.params.notebook_path;
            if (filePath) {
              metadata.filesTouched.add(filePath);
            }
          }
        }

        // Extract commands run (Bash operations)
        if (event.tool === 'Bash' && event.params?.command) {
          // Truncate long commands
          const cmd = event.params.command.substring(0, 200);
          metadata.commandsRun.add(cmd);
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
