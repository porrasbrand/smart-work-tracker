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
      } catch (err) {
        console.log('Database not initialized. Run "npm run migrate" first.');
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "smart-work-tracker help" for usage information.');
      process.exit(1);
  }
}

module.exports = { parseArgs, executeCommand };
