const path = require('path');
const fs = require('fs').promises;
const JSONLParser = require('./parsers/jsonl-parser');
const PrivacyRedactor = require('./parsers/privacy-redactor');
const SessionExtractor = require('./parsers/session-extractor');
const SessionSegmenter = require('./parsers/session-segmenter');

class SessionProcessor {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.redactor = new PrivacyRedactor(config);
    this.extractor = new SessionExtractor();
    this.segmenter = new SessionSegmenter(config);

    // Date cutoff: 2025-12-20 00:00:00 UTC (temporarily adjusted for historical import)
    this.dateCutoff = new Date('2025-12-20T00:00:00Z');
  }

  async processSessionFile(filePath) {
    this.logger.info('Processing session file', { filePath });

    // Extract session ID from filename
    const sessionId = this.extractSessionId(filePath);

    // Check if already processed
    const existing = await this.db.get(
      'SELECT id, file_hash FROM sources WHERE session_id = ?',
      [sessionId]
    );

    // Calculate file hash
    const parser = new JSONLParser(filePath);
    const fileHash = await parser.calculateFileHash();
    const fileSize = await parser.getFileSize();

    // Skip if already processed with same hash
    if (existing && existing.file_hash === fileHash) {
      this.logger.info('Session already processed, skipping', { sessionId, fileHash });
      return { skipped: true, reason: 'already_processed', sessionId };
    }

    // Parse events
    const events = [];
    let errorCount = 0;

    for await (const item of parser.parseLines()) {
      if (item.error) {
        this.logger.warn('Malformed JSONL line', {
          sessionId,
          lineNumber: item.lineNumber,
          byteOffset: item.byteOffset
        });
        errorCount++;
        continue;
      }

      // Redact privacy-sensitive content
      const redactedEvent = this.redactor.redactEvent(item.event);

      events.push({
        event: redactedEvent,
        byteOffset: item.byteOffset,
        lineNumber: item.lineNumber
      });
    }

    if (events.length === 0) {
      this.logger.warn('No valid events in session file', { filePath, errorCount });
      return { skipped: true, reason: 'no_events', sessionId };
    }

    this.logger.info('Events parsed', {
      sessionId,
      eventCount: events.length,
      errorCount
    });

    // Extract metadata
    const metadata = this.extractor.extractMetadata(events);

    if (!metadata.startTime || !metadata.endTime) {
      this.logger.warn('No timestamps found in session', { sessionId });
      return { skipped: true, reason: 'no_timestamps', sessionId };
    }

    // Check date cutoff (skip old sessions for actual tracking)
    if (metadata.startTime < this.dateCutoff) {
      this.logger.info('Session before cutoff date, skipping for time tracking', {
        sessionId,
        startTime: metadata.startTime.toISOString(),
        cutoff: this.dateCutoff.toISOString()
      });
      return { skipped: true, reason: 'before_cutoff', sessionId };
    }

    // Save to sources table
    let sourceId;
    if (existing) {
      // Update existing
      await this.db.run(
        `UPDATE sources SET
          file_hash = ?,
          file_size = ?,
          processed_at = CURRENT_TIMESTAMP,
          status = 'parsed'
         WHERE id = ?`,
        [fileHash, fileSize, existing.id]
      );
      sourceId = existing.id;

      // Delete old segments for this source
      await this.db.run('DELETE FROM segments WHERE source_id = ?', [sourceId]);

    } else {
      // Insert new
      const result = await this.db.run(
        `INSERT INTO sources (session_id, file_path, file_size, file_hash, status, processed_at)
         VALUES (?, ?, ?, ?, 'parsed', CURRENT_TIMESTAMP)`,
        [sessionId, filePath, fileSize, fileHash]
      );
      sourceId = result.lastID;
    }

    // Segment into work blocks
    const segments = this.segmenter.segment(events, metadata);

    this.logger.info('Session segmented', {
      sessionId,
      segmentCount: segments.length,
      startTime: metadata.startTime.toISOString(),
      endTime: metadata.endTime.toISOString()
    });

    // Save segments to database
    for (const segment of segments) {
      // Convert Sets to arrays for JSON storage
      const filesTouched = segment.filesTouched ? Array.from(segment.filesTouched) : [];
      const commandsRun = segment.commandsRun ? Array.from(segment.commandsRun) : [];

      await this.db.run(
        `INSERT INTO segments (
          source_id, start_time, end_time, duration_minutes,
          cwd, git_branch, files_touched, commands_run, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          sourceId,
          segment.startTime.toISOString(),
          segment.endTime.toISOString(),
          segment.durationMinutes,
          segment.cwd,
          segment.gitBranch,
          JSON.stringify(filesTouched),
          JSON.stringify(commandsRun)
        ]
      );
    }

    this.logger.info('Session processed successfully', {
      sessionId,
      sourceId,
      segmentCount: segments.length,
      totalDuration: segments.reduce((sum, s) => sum + s.durationMinutes, 0)
    });

    return {
      success: true,
      sessionId,
      sourceId,
      segmentCount: segments.length,
      totalDuration: segments.reduce((sum, s) => sum + s.durationMinutes, 0)
    };
  }

  extractSessionId(filePath) {
    // Extract UUID from filename
    // e.g., /home/user/.claude/projects/xyz/abc-123-def.jsonl -> abc-123-def
    const basename = path.basename(filePath, '.jsonl');
    return basename;
  }

  async discoverSessionFiles(claudeProjectsDir) {
    // Discover all .jsonl files in ~/.claude/projects/
    const sessionFiles = [];

    try {
      const projectDirs = await fs.readdir(claudeProjectsDir);

      for (const projectDir of projectDirs) {
        const projectPath = path.join(claudeProjectsDir, projectDir);

        let stat;
        try {
          stat = await fs.stat(projectPath);
        } catch (err) {
          // Skip if not accessible
          continue;
        }

        if (!stat.isDirectory()) continue;

        try {
          const files = await fs.readdir(projectPath);
          const jsonlFiles = files
            .filter(f => f.endsWith('.jsonl'))
            .map(f => path.join(projectPath, f));

          sessionFiles.push(...jsonlFiles);
        } catch (err) {
          // Skip if can't read directory
          this.logger.warn('Cannot read project directory', { projectPath, error: err.message });
        }
      }
    } catch (err) {
      this.logger.error('Cannot read Claude projects directory', {
        claudeProjectsDir,
        error: err.message
      });
      throw err;
    }

    return sessionFiles;
  }
}

module.exports = SessionProcessor;
