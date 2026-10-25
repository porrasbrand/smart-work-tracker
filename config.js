const dotenv = require('dotenv');
const { expand } = require('dotenv-expand');

// Load .env file and expand variables
const env = dotenv.config();
expand(env);

module.exports = {
  database: {
    path: process.env.DB_PATH || './data/smart-work-tracker.db',
  },
  activeCollab: {
    apiUrl: process.env.AC_API_URL,
    apiToken: process.env.AC_API_TOKEN,
    userId: parseInt(process.env.AC_USER_ID) || 1,
    jobTypeId: parseInt(process.env.AC_JOB_TYPE_ID) || 1,
    billableByDefault: process.env.AC_BILLABLE_BY_DEFAULT !== 'false',
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'none',
    apiKey: process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || 'auto',
    enabled: process.env.AI_ENABLED !== 'false',
    maxRetries: 3,
    timeout: 120000,
  },
  privacy: {
    excludeThinking: process.env.EXCLUDE_THINKING === 'true',
    extractThinkingSummary: process.env.EXTRACT_THINKING_SUMMARY !== 'false',
    excludeCode: process.env.EXCLUDE_CODE !== 'false',
    redactSecrets: process.env.REDACT_SECRETS !== 'false',
    redactPII: process.env.REDACT_PII !== 'false',
  },
  attribution: {
    idleGapMinutes: parseInt(process.env.IDLE_GAP_MINUTES) || 15,
    minSessionMinutes: parseInt(process.env.MIN_SESSION_MINUTES) || 5,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    directory: './logs',
  },
  parser: {
    useByteOffsets: true,
    validateContentHash: true,
  },
};
