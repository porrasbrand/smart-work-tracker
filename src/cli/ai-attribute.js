/**
 * AI-Powered Attribution Command
 *
 * Uses Claude API to intelligently parse user messages and extract:
 * - Explicit project mentions
 * - Task descriptions
 * - High-confidence attributions
 */

async function aiAttributeCommand({ db, logger, config }) {
  const AITaskParser = require('../lib/ai-task-parser');
  const parser = new AITaskParser(config, logger);

  logger.info('Starting AI-powered attribution');
  console.log('Running AI-powered task attribution...\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY not found in environment');
    console.log('   Set it in .env file to enable AI parsing\n');
    console.log('   Falling back to rule-based attribution...');
    return { attributed: 0, skipped: 0 };
  }

  // Get unattributed segments with user messages
  const segments = await db.all(`
    SELECT * FROM segments
    WHERE project_id_final IS NULL
    AND task_context IS NOT NULL
    AND status = 'pending'
    ORDER BY start_time DESC
  `);

  if (segments.length === 0) {
    console.log('✓ No unattributed segments with user messages');
    return { attributed: 0, skipped: 0 };
  }

  logger.info('Found segments for AI parsing', { count: segments.length });
  console.log(`Found ${segments.length} unattributed segments with user messages\n`);

  // Get all projects
  const projects = await db.all('SELECT * FROM projects_map');

  if (projects.length === 0) {
    console.log('⚠️  No projects in database. Run sync-projects first.');
    return { attributed: 0, skipped: segments.length };
  }

  console.log(`Analyzing with AI (using ${projects.length} projects)...`);
  console.log('This may take a moment...\n');

  // Parse with AI
  const results = await parser.batchParseSegments(segments, projects);

  console.log(`\n=== AI Parsing Results ===\n`);

  let attributed = 0;
  let highConfidence = 0;

  for (const result of results) {
    const segment = segments.find(s => s.id === result.segmentId);

    console.log(`Segment ${result.segmentId}:`);
    console.log(`  Task: ${result.taskDescription}`);
    console.log(`  Project: ${result.project || 'None detected'}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`  Reasoning: ${result.reasoning}`);

    // Update segment if confidence is high enough
    if (result.projectId && result.confidence >= 0.7) {
      await db.run(`
        UPDATE segments
        SET project_id_final = ?,
            task_description = ?,
            confidence_score = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [result.projectId, result.taskDescription, result.confidence, result.segmentId]);

      attributed++;
      if (result.confidence >= 0.9) highConfidence++;

      console.log(`  ✓ Attributed!\n`);
    } else {
      console.log(`  ⊘ Skipped (low confidence or no project)\n`);
    }
  }

  console.log(`\n=== Summary ===\n`);
  console.log(`✓ Attributed: ${attributed} segments`);
  console.log(`  High confidence (90%+): ${highConfidence}`);
  console.log(`  Medium confidence (70-90%): ${attributed - highConfidence}`);
  console.log(`⊘ Skipped: ${segments.length - attributed} segments`);
  console.log(`\n💡 Tip: Review high-confidence attributions first\n`);

  return { attributed, skipped: segments.length - attributed, highConfidence };
}

module.exports = aiAttributeCommand;
