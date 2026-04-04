#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function check() {
  const db = new Database(config.database.path);
  await db.connect();

  // Check Intelemark project
  const intelemark = await db.get(`
    SELECT id, activecollab_project_id, activecollab_project_name, cwd_patterns, keywords
    FROM projects_map
    WHERE activecollab_project_name LIKE '%Intelemark%'
  `);

  console.log('\n=== Intelemark Project ===');
  if (intelemark) {
    console.log('ID:', intelemark.id);
    console.log('AC ID:', intelemark.activecollab_project_id);
    console.log('CWD Patterns:', JSON.parse(intelemark.cwd_patterns));
    console.log('Keywords:', JSON.parse(intelemark.keywords));
  } else {
    console.log('Not found');
  }

  // Check northernservicestoday.com project
  const northern = await db.get(`
    SELECT id, activecollab_project_id, activecollab_project_name, cwd_patterns, keywords
    FROM projects_map
    WHERE id = 12
  `);

  console.log('\n=== Project ID 12 (northernservicestoday.com) ===');
  if (northern) {
    console.log('ID:', northern.id);
    console.log('AC ID:', northern.activecollab_project_id);
    console.log('Name:', northern.activecollab_project_name);
    console.log('CWD Patterns:', JSON.parse(northern.cwd_patterns));
    console.log('Keywords:', JSON.parse(northern.keywords));
  }

  await db.close();
}

check().catch(console.error);
