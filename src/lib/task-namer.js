/**
 * TaskNamer — builds CLIENT-FACING ActiveCollab task names and sanitized
 * time-record summaries from raw session prompts.
 *
 * Why: task_description holds the user's raw prompt. Using it verbatim produced
 * AC task names like "So did you do all changes? -- is this Omaha Marketing? (st)"
 * and leaked credentials (a CallRail API key, Slack tokens, OAuth codes) into
 * client-visible tasks and invoice line items (2026-08-03 incident). AC's WAF
 * also 403s time-record POSTs whose body contains OAuth-code URLs.
 *
 * Strategy: always sanitize deterministically; when ANTHROPIC_API_KEY is set,
 * ask a small model for a proper work-outcome name; otherwise (or on any API
 * error) fall back to "<Project> — work session <date>" style names.
 */

let Anthropic = null;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (e) { /* optional */ }

const SECRET_PATTERNS = [
  /ctrk_\w+/gi,                        // CallRail keys
  /xox[abposr]-[\w-]+/gi,              // Slack tokens
  /sk-[\w-]{20,}/g,                    // OpenAI-style keys
  /AIza[\w-]{30,}/g,                   // Google API keys
  /[?&](code|token|key|apikey|api_key|access_token)=[\w./-]+/gi, // creds in URLs
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,     // long base64-ish blobs
];

function sanitizeText(text) {
  let t = String(text || '');
  t = t.replace(/<command-name>[\s\S]*?(<\/command-args>|$)/g, ' ');   // slash-command captures
  t = t.replace(/<[^>]{1,60}>/g, ' ');                                  // stray XML-ish tags
  for (const re of SECRET_PATTERNS) t = t.replace(re, '[redacted]');
  t = t.replace(/https?:\/\/\S+/g, '[url]');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// Heuristic: does this text read like a raw prompt rather than a work label?
function looksLikeRawPrompt(t) {
  if (t.length < 15) return true;
  if (/[?]{1,}\s*$|^\s*(ok|yes|no|great|so|wait|check|why|what|how|do|can|lets|let's)\b/i.test(t)) return true;
  if (/\[(redacted|url)\]/.test(t)) return true;
  if (/--|\.\.\.|\bplease\b|\byou\b/i.test(t)) return true;
  return false;
}

class TaskNamer {
  constructor(logger) {
    this.logger = logger || console;
    this.model = process.env.AC_TASK_NAMER_MODEL || 'claude-haiku-4-5-20251001';
    this.client = (Anthropic && process.env.ANTHROPIC_API_KEY)
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  fallbackName(segment) {
    const project = (segment.activecollab_project_name || 'Project').split(/[-/]/)[0].trim();
    const date = String(segment.start_time || '').slice(0, 10);
    return `${project} — work session ${date}`;
  }

  /**
   * Returns a client-facing task name WITHOUT the (st) suffix (caller appends it).
   * Never throws; never returns raw prompts or secrets.
   */
  async clientFacingName(segment, summaryText) {
    const clean = sanitizeText(summaryText || segment.task_description);

    // Too little real content (slash-command captures, bare URLs/codes) — the
    // model would just ask for clarification; go straight to the fallback.
    const substance = clean.replace(/\[(redacted|url)\]/g, '').trim();
    if (substance.length < 25) return this.fallbackName(segment);

    if (this.client) {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 60,
          temperature: 0,
          system: 'You write short, professional task names for a marketing agency\'s client-facing project tracker. ' +
            'Given a raw work-session note, output ONLY the task name: 5-12 words, describing the work performed ' +
            '(outcome-oriented, e.g. "Google Ads — competitor negative keywords applied"). ' +
            'Never quote the note, never include questions, URLs, file paths, credentials, or names of other clients.',
          messages: [{
            role: 'user',
            content: `Project: ${segment.activecollab_project_name}\nWork-session note: ${clean.slice(0, 500)}\n\nTask name:`,
          }],
        });
        const name = sanitizeText(response.content[0].text).replace(/^["'\s]+|["'\s]+$/g, '');
        if (name.length >= 10 && name.length <= 120 && !looksLikeRawPrompt(name)) return name;
        this.logger.warn && this.logger.warn('TaskNamer: model output rejected, using fallback', { segmentId: segment.id, name });
      } catch (err) {
        this.logger.warn && this.logger.warn('TaskNamer: AI naming failed, using fallback', { segmentId: segment.id, error: err.message });
      }
    }

    // No AI (or AI failed): use the sanitized text only if it reads like a label.
    if (!looksLikeRawPrompt(clean)) return clean.slice(0, 100);
    return this.fallbackName(segment);
  }

  /** Sanitized time-record summary (shows up on invoice line items). */
  recordSummary(summaryText, segment) {
    const clean = sanitizeText(summaryText || segment.task_description);
    return (clean.length >= 10 ? clean : this.fallbackName(segment)).slice(0, 250);
  }
}

module.exports = { TaskNamer, sanitizeText, looksLikeRawPrompt };
