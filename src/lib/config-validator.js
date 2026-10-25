function validateConfig(config, command = 'all') {
  const errors = [];

  // Database path always required
  if (!config.database || !config.database.path) {
    errors.push('CONFIG_ERROR: database.path is required');
  }

  // ActiveCollab credentials only required for push/sync commands (Phase 3A+)
  const needsActiveCollab = ['push', 'sync', 'review'].includes(command);
  if (needsActiveCollab) {
    if (!config.activeCollab || !config.activeCollab.apiUrl) {
      errors.push('CONFIG_ERROR: activeCollab.apiUrl is required for ' + command);
    }
    if (!config.activeCollab || !config.activeCollab.apiToken) {
      errors.push('CONFIG_ERROR: activeCollab.apiToken is required for ' + command);
    }
  }

  // AI provider only required for AI-assisted commands (Phase 3B+)
  const needsAI = ['analyze', 'attribute'].includes(command);
  if (needsAI && config.ai && config.ai.enabled && config.ai.provider !== 'none') {
    if (!config.ai.apiKey) {
      errors.push('CONFIG_ERROR: ai.apiKey required when AI enabled for ' + command);
    }
  }

  // Idle gap must be positive
  if (config.attribution && config.attribution.idleGapMinutes <= 0) {
    errors.push('CONFIG_ERROR: attribution.idleGapMinutes must be > 0');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return true;
}

module.exports = { validateConfig };
