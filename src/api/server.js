/**
 * Express API Server
 * Phase 5: Review Interface
 *
 * Security Configuration:
 * - Bound to 127.0.0.1 only (local access)
 * - Strict CORS policy (localhost:3000 only)
 * - JSON body size limit
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const config = require('../../config');
const { errorHandler, formatError } = require('./middleware/errorHandler');

const app = express();

// Environment configuration
const API_PORT = parseInt(process.env.API_PORT || '3001', 10);
const API_HOST = process.env.API_HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// CORS Configuration - Strict origin restriction
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Initialize database connection
let dbInstance = null;

async function initDatabase() {
  const dbPath = path.resolve(__dirname, '../..', config.database.path);

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode and foreign keys
  await dbInstance.exec('PRAGMA journal_mode = WAL');
  await dbInstance.exec('PRAGMA foreign_keys = ON');

  console.log('Database connected:', dbPath);
  return dbInstance;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbInstance ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/segments', require('./routes/segments'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/submit', require('./routes/submit'));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json(formatError(
    'NOT_FOUND',
    `Route not found: ${req.method} ${req.path}`
  ));
});

// Error Handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database
    const db = await initDatabase();
    app.locals.db = db;

    // Start listening - bound to 127.0.0.1 only
    app.listen(API_PORT, API_HOST, () => {
      console.log(`\n✅ Smart Work Tracker API`);
      console.log(`   Listening on http://${API_HOST}:${API_PORT}`);
      console.log(`   CORS Origin: ${CORS_ORIGIN}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (dbInstance) {
    await dbInstance.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  if (dbInstance) {
    await dbInstance.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});

// Start the server
startServer();
