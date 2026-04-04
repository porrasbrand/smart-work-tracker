#!/usr/bin/env node

const config = require('../config');
const { validateConfig } = require('./lib/config-validator');
const { createLogger } = require('./lib/logger');
const Database = require('./lib/database');
const { parseArgs, executeCommand } = require('./cli/commands');

async function main() {
  let db;
  let logger;

  try {
    // Parse command first (before validation)
    const { command, flags } = parseArgs(process.argv);

    // Validate configuration (command-aware)
    validateConfig(config, command);

    // Create logger
    logger = createLogger(config);
    logger.info('Smart Work Tracker starting...', { command });

    // Connect to database
    db = new Database(config.database.path);
    await db.connect();
    logger.info('Database connected', { path: config.database.path });

    // Execute command
    await executeCommand(command, flags, { db, logger, config });

    logger.info('Command completed successfully', { command });
  } catch (error) {
    if (logger) {
      logger.error('Fatal error', { error: error.message, code: error.code, stack: error.stack });
    } else {
      console.error('Fatal error:', error.message);
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

main();
