const winston = require('winston');
const path = require('path');
const fs = require('fs');

function createLogger(config) {
  const logDir = config.logging.directory || './logs';

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Custom format to redact secrets
  const redactSecrets = winston.format((info) => {
    const secretPatterns = [
      /apiToken["']?\s*:\s*["']([^"']+)["']/gi,
      /apiKey["']?\s*:\s*["']([^"']+)["']/gi,
      /password["']?\s*:\s*["']([^"']+)["']/gi,
      /token["']?\s*:\s*["']([^"']+)["']/gi,
    ];

    let message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);

    secretPatterns.forEach(pattern => {
      message = message.replace(pattern, (match, secret) => {
        return match.replace(secret, '***REDACTED***');
      });
    });

    info.message = message;
    return info;
  });

  const logger = winston.createLogger({
    level: config.logging.level || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      redactSecrets(),
      winston.format.json()
    ),
    defaultMeta: { service: 'smart-work-tracker' },
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
    ],
  });

  // Also log to console in dev
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }));
  }

  return logger;
}

module.exports = { createLogger };
