const Anthropic = require('@anthropic-ai/sdk');

class AITaskParser {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.anthropic = null;

    // Only initialize if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  async parseUserMessages(messages, projects) {
    // If no API key, fall back to rule-based parsing
    if (!this.anthropic || !messages || messages.length === 0) {
      return null;
    }

    // Combine messages for context
    const userContext = messages
      .filter(m => m && typeof m === 'string')
      .slice(0, 10) // Limit to first 10 messages to save tokens
      .join('\n\n');

    if (userContext.length < 20) {
      return null; // Not enough context
    }

    // Build project list for Claude
    const projectList = projects
      .map(p => `- ${p.activecollab_project_name} (ID: ${p.activecollab_project_id})`)
      .join('\n');

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Fast & cheap model
        max_tokens: 300,
        temperature: 0,
        system: `You are a work time tracking assistant. Analyze user messages to extract:
1. Project name (which project they're working on)
2. Task description (what they're doing)
3. Confidence (0.0-1.0)

Return JSON only. If project is mentioned explicitly (URL, name, "Project: X"), use high confidence (0.95+).
If inferred from context, use medium confidence (0.6-0.8).`,
        messages: [{
          role: 'user',
          content: `User messages from work session:
${userContext}

Available projects:
${projectList}

Extract: {"project": "project name or null", "projectId": id or null, "taskDescription": "concise description", "confidence": 0.0-1.0, "reasoning": "why you chose this"}

Rules:
- If message explicitly says "Project: X" or mentions a URL/domain, use that project (confidence 0.95+)
- If no explicit mention, try to infer from keywords/context (confidence 0.6-0.8)
- Task description should be user's actual request (50-150 chars)
- If completely unclear, return null for project

Return only valid JSON, no explanation.`
        }]
      });

      const content = response.content[0].text.trim();

      // Try to parse JSON response
      let result;
      try {
        result = JSON.parse(content);
      } catch (e) {
        // Sometimes Claude wraps in markdown
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          this.logger.warn('Failed to parse AI response', { content });
          return null;
        }
      }

      this.logger.info('AI parsed task', {
        project: result.project,
        projectId: result.projectId,
        confidence: result.confidence,
        reasoning: result.reasoning
      });

      return result;

    } catch (error) {
      this.logger.error('AI task parsing failed', {
        error: error.message,
        code: error.code
      });
      return null;
    }
  }

  /**
   * Batch process multiple segments with AI parsing
   * Uses intelligent batching to save API costs
   */
  async batchParseSegments(segments, projects) {
    const results = [];

    // Only process segments with good user messages
    const eligibleSegments = segments.filter(seg => {
      if (!seg.task_context) return false;
      try {
        const messages = JSON.parse(seg.task_context);
        return Array.isArray(messages) && messages.length > 0;
      } catch {
        return false;
      }
    });

    this.logger.info('AI batch parsing', {
      total: segments.length,
      eligible: eligibleSegments.length
    });

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < eligibleSegments.length; i += BATCH_SIZE) {
      const batch = eligibleSegments.slice(i, i + BATCH_SIZE);

      for (const segment of batch) {
        try {
          const messages = JSON.parse(segment.task_context);
          const parsed = await this.parseUserMessages(messages, projects);

          if (parsed && parsed.confidence >= 0.7) {
            results.push({
              segmentId: segment.id,
              ...parsed
            });
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          this.logger.warn('Failed to parse segment', {
            segmentId: segment.id,
            error: error.message
          });
        }
      }
    }

    return results;
  }
}

module.exports = AITaskParser;
