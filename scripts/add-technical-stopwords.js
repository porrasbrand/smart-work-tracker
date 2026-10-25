#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function addStopwords() {
  const db = new Database(config.database.path);
  await db.connect();

  // Get all projects
  const projects = await db.all('SELECT id, activecollab_project_id, activecollab_project_name, keywords FROM projects_map');

  // Technical stopwords to filter out
  const technicalStopwords = [
    // Generic tech terms
    'development', 'dev', 'service', 'services', 'server', 'client',
    'session', 'connection', 'test', 'testing', 'build', 'deploy',
    'production', 'staging', 'admin', 'system', 'platform', 'app',
    // Common business terms
    'group', 'company', 'inc', 'llc', 'corp', 'team',
    // Generic location/descriptors
    'today', 'home', 'work', 'main', 'site', 'website'
  ];

  console.log('\n=== Adding Technical Stopwords Filter ===\n');

  let changedCount = 0;

  for (const project of projects) {
    const keywords = JSON.parse(project.keywords || '[]');
    const filteredKeywords = keywords.filter(k => {
      // Keep keywords that are NOT in technical stopwords
      return !technicalStopwords.includes(k.toLowerCase());
    });

    if (filteredKeywords.length !== keywords.length) {
      console.log(`${project.activecollab_project_name}:`);
      console.log(`  Before: [${keywords.join(', ')}]`);
      console.log(`  After:  [${filteredKeywords.join(', ')}]`);

      await db.run(`
        UPDATE projects_map
        SET keywords = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [JSON.stringify(filteredKeywords), project.id]);

      changedCount++;
    }
  }

  console.log(`\n✓ Updated ${changedCount} project(s) with technical stopwords filter`);

  await db.close();
}

addStopwords().catch(console.error);
