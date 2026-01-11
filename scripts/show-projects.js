#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function showProjects() {
  const db = new Database(config.database.path);
  await db.connect();

  const projects = await db.all(`
    SELECT
      id,
      activecollab_project_id,
      activecollab_project_name,
      keywords
    FROM projects_map
    WHERE activecollab_project_name LIKE '%phoenix%'
       OR activecollab_project_name LIKE '%infiniskin%'
       OR activecollab_project_name LIKE '%hall%'
    ORDER BY activecollab_project_name
  `);

  console.log('=== Phoenix/Hall Related Projects ===\n');

  for (const project of projects) {
    console.log(`ID: ${project.id} | AC ID: ${project.activecollab_project_id}`);
    console.log(`Name: ${project.activecollab_project_name}`);
    console.log(`Keywords: ${project.keywords}`);
    console.log();
  }

  await db.close();
}

showProjects().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
