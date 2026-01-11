const path = require('path');
const helpCommand = require('./help');

function parseArgs(args) {
  const command = args[2] || 'help';
  const flags = args.slice(3);
  return { command, flags };
}

async function executeCommand(command, flags, { db, logger, config }) {
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      helpCommand.show();
      break;

    case 'version':
    case '--version':
    case '-v':
      const pkg = require(path.resolve(__dirname, '../../package.json'));
      console.log(`Smart Work Tracker v${pkg.version}`);
      break;

    case 'migrate':
      const MigrationRunner = require('../lib/migrations');
      const migrationsDir = path.resolve(__dirname, '../../migrations');
      const direction = flags[0] === 'down' ? 'down' : 'up';
      const runner = new MigrationRunner(db, migrationsDir);
      await runner.runMigrations(direction);
      break;

    case 'status':
      console.log('Smart Work Tracker Status:');
      console.log(`Database: ${config.database.path}`);

      // Check if tables exist before querying
      try {
        const sourcesCount = await db.get('SELECT COUNT(*) as count FROM sources');
        console.log(`Sources: ${sourcesCount.count}`);
        const segmentsCount = await db.get('SELECT COUNT(*) as count FROM segments');
        console.log(`Segments: ${segmentsCount.count}`);

        // Show total tracked time
        const totalTime = await db.get(`
          SELECT SUM(duration_minutes) as total FROM segments WHERE status = 'pending'
        `);
        if (totalTime && totalTime.total) {
          const hours = Math.floor(totalTime.total / 60);
          const mins = totalTime.total % 60;
          console.log(`Total tracked time: ${hours}h ${mins}m`);
        }
      } catch (err) {
        console.log('Database not initialized. Run "npm run migrate" first.');
      }
      break;

    case 'parse':
      const SessionProcessor = require('../lib/session-processor');
      const processor = new SessionProcessor(db, logger, config);

      // Get Claude projects directory
      const claudeDir = flags[0] || path.join(process.env.HOME, '.claude', 'projects');

      logger.info('Discovering session files', { claudeDir });
      console.log(`Discovering session files in: ${claudeDir}\n`);

      const sessionFiles = await processor.discoverSessionFiles(claudeDir);
      logger.info('Found session files', { count: sessionFiles.length });
      console.log(`Found ${sessionFiles.length} session files\n`);

      // Process each file
      let processed = 0;
      let skipped = 0;
      let totalDuration = 0;

      for (const file of sessionFiles) {
        try {
          const result = await processor.processSessionFile(file);
          if (result.skipped) {
            skipped++;
            console.log(`⊘ ${path.basename(file)} - ${result.reason}`);
          } else if (result.success) {
            processed++;
            totalDuration += result.totalDuration || 0;
            console.log(`✓ ${path.basename(file)} - ${result.segmentCount} segments (${result.totalDuration}m)`);
          }
        } catch (err) {
          logger.error('Failed to process session file', {
            file,
            error: err.message,
            stack: err.stack
          });
          console.error(`✗ ${path.basename(file)} - ERROR: ${err.message}`);
        }
      }

      const hours = Math.floor(totalDuration / 60);
      const mins = totalDuration % 60;

      console.log(`\n✓ Processed ${processed} sessions, skipped ${skipped}`);
      console.log(`Total time tracked: ${hours}h ${mins}m`);
      break;

    case 'sync-projects':
      const ActiveCollabSync = require('../lib/activecollab-sync');
      const sync = new ActiveCollabSync(config, db, logger);

      console.log('Syncing ActiveCollab projects...\n');
      const count = await sync.syncProjects();
      console.log(`✓ Synced ${count} projects to database`);
      break;

    case 'attribute':
      const Attributor = require('../lib/attributor');
      const attributor = new Attributor(db, logger, config);

      console.log('Running project attribution...\n');
      const result = await attributor.attributeSegments();

      console.log(`✓ Attributed: ${result.attributed} segments`);
      if (result.ambiguous > 0) {
        console.log(`⚠ Ambiguous: ${result.ambiguous} segments (multiple matches)`);
      }
      if (result.noMatch > 0) {
        console.log(`✗ No match: ${result.noMatch} segments`);
      }
      break;

    case 'detect':
      const TaskDetector = require('../lib/task-detector');
      const detector = new TaskDetector(config, logger);

      console.log('Running task detection...\n');

      // Get all pending segments without task descriptions
      const segments = await db.all(`
        SELECT * FROM segments
        WHERE status = 'pending' AND (task_description IS NULL OR task_description = '')
      `);

      logger.info('Found segments to detect', { count: segments.length });
      console.log(`Found ${segments.length} segments to detect\n`);

      let detected = 0;
      let lowConfidence = 0;

      for (const segment of segments) {
        const detection = detector.detectTaskType(segment);

        // Only update if confidence is above threshold
        if (detection.confidence >= 0.6) {
          await db.run(`
            UPDATE segments
            SET task_description = ?,
                confidence_score = CASE
                  WHEN confidence_score IS NULL THEN ?
                  ELSE confidence_score
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [detection.description, detection.confidence, segment.id]);

          detected++;
          logger.debug('Task detected', {
            segmentId: segment.id,
            type: detection.type,
            description: detection.description,
            confidence: detection.confidence
          });
        } else {
          lowConfidence++;
          logger.debug('Low confidence detection', {
            segmentId: segment.id,
            type: detection.type,
            confidence: detection.confidence
          });
        }
      }

      console.log(`✓ Detected: ${detected} segments`);
      if (lowConfidence > 0) {
        console.log(`⚠ Low confidence: ${lowConfidence} segments (manual review needed)`);
      }
      break;

    case 'link-tasks':
      const TaskLogAnalyzer = require('../lib/task-log-analyzer');
      const taskAnalyzer = new TaskLogAnalyzer(db, logger, config);

      console.log('Analyzing task logs and linking to segments...\n');

      const linkResult = await taskAnalyzer.analyzeAndLink();

      console.log(`\n✓ Task Analysis Complete:`);
      console.log(`  Total tasks found: ${linkResult.totalTasks}`);
      console.log(`  Task-to-project matches: ${linkResult.taskMatches}`);
      console.log(`  Segments linked: ${linkResult.segmentsLinked}`);
      break;

    case 'adjust-durations':
      const DurationAdjuster = require('../lib/duration-adjuster');
      const adjuster = new DurationAdjuster(db, logger, config);

      // Parse flags
      const force = flags.includes('--force');
      const showSummaryAdj = flags.includes('--summary');

      if (showSummaryAdj) {
        const summaryAdj = await adjuster.getAdjustmentSummary();
        console.log('\n=== Duration Adjustment Summary ===\n');
        console.log(`Total segments: ${summaryAdj.totalSegments}`);
        console.log(`Original time: ${summaryAdj.originalHours}h`);
        console.log(`Adjusted time: ${summaryAdj.adjustedHours}h`);
        console.log(`Difference: +${summaryAdj.differenceHours}h`);
        console.log(`Unadjusted: ${summaryAdj.unadjustedCount} segments`);
        break;
      }

      console.log('Adjusting durations to 30-minute increments...\n');
      console.log('Strategy: Round up with 30-minute minimum\n');

      const adjustResult = await adjuster.adjustAllDurations({ force });

      console.log(`\n✓ Duration Adjustment Complete:`);
      console.log(`  Adjusted: ${adjustResult.adjusted} segments`);
      console.log(`  Original total: ${adjustResult.totalOriginal}h`);
      console.log(`  Adjusted total: ${adjustResult.totalAdjusted}h`);
      console.log(`  Difference: +${adjustResult.difference}h (${((parseFloat(adjustResult.difference) / parseFloat(adjustResult.totalOriginal)) * 100).toFixed(1)}%)`);
      break;

    case 'submit-time':
      const TimeSubmitter = require('../lib/time-submitter');
      const submitter = new TimeSubmitter(db, logger, config);

      // Parse flags
      const dryRun = flags.includes('--dry-run');
      const showSummary = flags.includes('--summary');

      if (showSummary) {
        const summary = await submitter.getSubmissionSummary();
        console.log('\n=== Time Submission Summary ===\n');
        console.log(`Total segments: ${summary.totalSegments}`);
        console.log(`Already submitted: ${summary.submitted} (${summary.submittedHours}h)`);
        console.log(`Ready to submit: ${summary.readyToSubmit} (${summary.pendingHours}h)`);
        console.log(`Unattributed: ${summary.unattributed}`);
        break;
      }

      console.log(dryRun ? 'DRY RUN - Time submission preview...\n' : 'Submitting time records to ActiveCollab...\n');

      const submitResult = await submitter.submitTimeRecords({ dryRun });

      console.log(`\n✓ Time Submission Complete:`);
      console.log(`  Submitted: ${submitResult.submitted} records (${submitResult.totalHours}h)`);
      if (submitResult.failed > 0) {
        console.log(`  Failed: ${submitResult.failed} records`);
      }
      if (submitResult.skipped > 0) {
        console.log(`  Skipped (dry run): ${submitResult.skipped} records`);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "smart-work-tracker help" for usage information.');
      process.exit(1);
  }
}

module.exports = { parseArgs, executeCommand };
