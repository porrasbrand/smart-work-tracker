const REDACTION_PATTERNS = {
  // API Keys & Tokens
  apiKey: /\b[A-Za-z0-9_-]{20,}\b/g,
  awsKey: /AKIA[0-9A-Z]{16}/g,
  githubToken: /ghp_[A-Za-z0-9]{36}/g,

  // Credentials
  password: /password["']?\s*[:=]\s*["']([^"']+)["']/gi,
  token: /token["']?\s*[:=]\s*["']([^"']+)["']/gi,
  apiToken: /api[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/gi,

  // PII
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

class PrivacyRedactor {
  constructor(config) {
    this.config = config;
  }

  redactEvent(event) {
    // Clone event to avoid mutation
    const redacted = JSON.parse(JSON.stringify(event));

    // Redact message content if present
    if (redacted.content) {
      if (Array.isArray(redacted.content)) {
        redacted.content = redacted.content.map(item => this.redactContentItem(item));
      } else if (typeof redacted.content === 'string') {
        redacted.content = this.redactText(redacted.content);
      }
    }

    // Redact thinking blocks specially
    if (redacted.type === 'thinking' && this.config.privacy.extractThinkingSummary) {
      redacted.content = this.extractThinkingSummary(redacted.content);
    }

    // Exclude code content from tool_use events
    if (this.config.privacy.excludeCode && this.isCodeContent(redacted)) {
      if (redacted.params) {
        if (redacted.params.content) redacted.params.content = '[CODE REDACTED]';
        if (redacted.params.new_string) redacted.params.new_string = '[CODE REDACTED]';
        if (redacted.params.old_string) redacted.params.old_string = '[CODE REDACTED]';
      }
    }

    return redacted;
  }

  redactContentItem(item) {
    if (typeof item === 'string') {
      return this.redactText(item);
    } else if (item && typeof item === 'object') {
      const redacted = { ...item };
      if (redacted.text) {
        redacted.text = this.redactText(redacted.text);
      }
      return redacted;
    }
    return item;
  }

  redactText(text) {
    if (!text || typeof text !== 'string') return text;

    let redacted = text;

    // Redact secrets
    if (this.config.privacy.redactSecrets) {
      redacted = this.redactSecrets(redacted);
    }

    // Redact PII
    if (this.config.privacy.redactPII) {
      redacted = this.redactPII(redacted);
    }

    return redacted;
  }

  redactSecrets(text) {
    let redacted = text;

    // Redact password/token patterns
    redacted = redacted.replace(REDACTION_PATTERNS.password, (match) => {
      return match.replace(/["']([^"']+)["']/, '"***REDACTED***"');
    });
    redacted = redacted.replace(REDACTION_PATTERNS.token, (match) => {
      return match.replace(/["']([^"']+)["']/, '"***REDACTED***"');
    });
    redacted = redacted.replace(REDACTION_PATTERNS.apiToken, (match) => {
      return match.replace(/["']([^"']+)["']/, '"***REDACTED***"');
    });

    // Redact specific token formats
    redacted = redacted.replace(REDACTION_PATTERNS.awsKey, '***REDACTED***');
    redacted = redacted.replace(REDACTION_PATTERNS.githubToken, '***REDACTED***');

    return redacted;
  }

  redactPII(text) {
    let redacted = text;

    redacted = redacted.replace(REDACTION_PATTERNS.email, '***EMAIL***');
    redacted = redacted.replace(REDACTION_PATTERNS.phone, '***PHONE***');
    redacted = redacted.replace(REDACTION_PATTERNS.ssn, '***SSN***');

    return redacted;
  }

  isCodeContent(event) {
    // Detect if event contains code (tool_use with Edit/Write)
    return event.type === 'tool_use' &&
           event.tool &&
           ['Edit', 'Write', 'NotebookEdit'].includes(event.tool);
  }

  extractThinkingSummary(thinkingContent) {
    // Extract first line or first 200 chars as summary
    if (!thinkingContent || typeof thinkingContent !== 'string') return '';

    const lines = thinkingContent.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '[THINKING]';

    const firstLine = lines[0].substring(0, 200);
    return `[THINKING: ${firstLine}${lines[0].length > 200 ? '...' : ''}]`;
  }
}

module.exports = PrivacyRedactor;
