# AI API Integration Reference

**Created:** 2026-01-11
**Source:** standalone-sales-prediction project + ai-consult project (via remote)
**Purpose:** Code patterns for Phase 3B AI-assisted analysis

---

## Overview

Smart Work Tracker will support 4 AI provider options in Phase 3B:
1. **Anthropic (Claude)** - Recommended for production
2. **OpenAI (GPT)** - Alternative option
3. **Gemini (Google)** - Alternative option
4. **None** - Skip AI, use rules-based attribution only

---

## 1. Anthropic (Claude) API

### Installation
```bash
npm install @anthropic-ai/sdk
```

### Environment Variable
```bash
ANTHROPIC_API_KEY=your_key_here
```

### Code Pattern
```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 120000, // 2 minute timeout
});

// Basic call
async function callClaude(prompt, systemPrompt = null) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast & cheap
      // model: 'claude-opus-4-5-20251101', // Powerful but expensive
      max_tokens: 8000,
      system: systemPrompt || 'You are a helpful assistant.',
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text.trim();
  } catch (error) {
    console.error('Anthropic API Error:', error.message);
    if (error.status) console.error('HTTP Status:', error.status);
    throw error;
  }
}
```

### Models Available
- `claude-3-5-haiku-20241022` - Fast, cheap, good for simple tasks
- `claude-sonnet-4-5-20250929` - Balanced, good default
- `claude-opus-4-5-20251101` - Most powerful, expensive

### Best For
- Complex reasoning tasks
- Privacy-conscious users (Anthropic's policies)
- Detailed analysis and recommendations

---

## 2. OpenAI (GPT) API

### Installation
```bash
npm install openai
```

### Environment Variable
```bash
OPENAI_API_KEY=your_key_here
```

### Code Pattern
```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000,
});

// Basic call
async function callGPT(prompt, systemPrompt = null) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast & cheap
      // model: 'gpt-4o', // More capable
      // model: 'gpt-5.2', // Latest (if available)
      max_tokens: 4096, // GPT-4 uses this
      // max_completion_tokens: 16000, // GPT-5 uses this
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const result = response.choices[0].message.content.trim();
    const usage = response.usage; // { prompt_tokens, completion_tokens, total_tokens }

    return result;
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    if (error.status) console.error('HTTP Status:', error.status);
    throw error;
  }
}
```

### JSON Mode
```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  response_format: { type: 'json_object' }, // Force JSON output
  messages: [
    { role: 'system', content: 'You are a helpful assistant. Always respond with valid JSON.' },
    { role: 'user', content: 'Extract project name from this text...' },
  ],
});

const json = JSON.parse(response.choices[0].message.content);
```

### Models Available
- `gpt-4o-mini` - Fast, cheap, good for simple tasks
- `gpt-4o` - Balanced, good default
- `gpt-5.2` - Most powerful (if available)

### Best For
- JSON output (excellent JSON mode)
- Fast responses
- Wide ecosystem and community support

---

## 3. Gemini (Google) API

### Installation
```bash
npm install @google/generative-ai
```

### Environment Variable
```bash
GOOGLE_API_KEY=your_key_here
```

### Code Pattern
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Basic call
async function callGemini(prompt, systemPrompt = null) {
  try {
    const model = client.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      systemInstruction: systemPrompt || 'You are a helpful assistant.',
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const text = response.text();
    const usage = response.usageMetadata; // { promptTokenCount, candidatesTokenCount }

    return text;
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    throw error;
  }
}
```

### JSON Mode
```javascript
const model = client.getGenerativeModel({
  model: 'gemini-3-pro-preview',
  generationConfig: {
    temperature: 0.5,
    maxOutputTokens: 60000,
    responseMimeType: "application/json" // Force JSON output
  }
});

const result = await model.generateContent(prompt);
const json = JSON.parse(result.response.text());
```

### Models Available
- `gemini-3-pro-preview` - Latest, most capable
- `gemini-1.5-flash` - Fast, cheap
- `gemini-1.5-pro` - Balanced

### Best For
- Large context windows
- Multimodal inputs (if needed later)
- Google ecosystem integration

---

## 4. Unified AI Client Pattern (Recommended)

### For Phase 3B, create a unified wrapper:

```javascript
// lib/ai-client.js
class AIClient {
  constructor(provider = 'none') {
    this.provider = provider;
    this.client = null;

    if (provider === 'anthropic') {
      const Anthropic = require('@anthropic-ai/sdk');
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        timeout: 120000,
      });
    } else if (provider === 'openai') {
      const OpenAI = require('openai');
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 120000,
      });
    } else if (provider === 'gemini') {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
  }

  async complete(prompt, systemPrompt = null, options = {}) {
    if (this.provider === 'none') {
      throw new Error('AI provider disabled. Use rules-based attribution only.');
    }

    try {
      if (this.provider === 'anthropic') {
        return await this._callAnthropic(prompt, systemPrompt, options);
      } else if (this.provider === 'openai') {
        return await this._callOpenAI(prompt, systemPrompt, options);
      } else if (this.provider === 'gemini') {
        return await this._callGemini(prompt, systemPrompt, options);
      }
    } catch (error) {
      console.error(`${this.provider} API Error:`, error.message);
      throw error;
    }
  }

  async _callAnthropic(prompt, systemPrompt, options) {
    const response = await this.client.messages.create({
      model: options.model || 'claude-3-5-haiku-20241022',
      max_tokens: options.maxTokens || 8000,
      system: systemPrompt || 'You are a helpful assistant.',
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].text.trim();
  }

  async _callOpenAI(prompt, systemPrompt, options) {
    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-4o-mini',
      max_tokens: options.maxTokens || 4096,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      response_format: options.jsonMode ? { type: 'json_object' } : undefined,
    });
    return response.choices[0].message.content.trim();
  }

  async _callGemini(prompt, systemPrompt, options) {
    const config = {
      temperature: options.temperature || 0.5,
      maxOutputTokens: options.maxTokens || 60000,
    };

    if (options.jsonMode) {
      config.responseMimeType = "application/json";
    }

    const model = this.client.getGenerativeModel({
      model: options.model || 'gemini-3-pro-preview',
      systemInstruction: systemPrompt,
      generationConfig: config,
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

module.exports = AIClient;
```

### Usage in Phase 3B:
```javascript
const AIClient = require('./lib/ai-client');
const config = require('./config');

const ai = new AIClient(config.ai.provider); // 'anthropic', 'openai', 'gemini', or 'none'

// Analyze session for project attribution
const prompt = `Analyze this work session and identify the project:
Session data: ${condensedSession}
Available projects: ${projectsList}
Return JSON: { "project_id": 123, "confidence": 0.95, "reasoning": "..." }`;

const result = await ai.complete(prompt, 'You are a project attribution expert.', {
  jsonMode: true,
  maxTokens: 1000
});

const attribution = JSON.parse(result);
```

---

## Error Handling Pattern

### Robust Error Handling:
```javascript
async function callAIWithRetry(aiClient, prompt, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await aiClient.complete(prompt, options.systemPrompt, options);
    } catch (error) {
      lastError = error;

      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

      // Don't retry on client errors (4xx)
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
```

---

## JSON Parsing Helper

### Handles markdown code blocks:
```javascript
function parseJSONResponse(text) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Try extracting from markdown code block
    const match = text.match(/```(?:json)?\s*({[\s\S]*})\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Failed to parse JSON response');
  }
}
```

---

## Cost Estimation

### Approximate Costs (as of 2026-01):

**Per 1M tokens:**
- Anthropic Haiku: $0.25 input / $1.25 output
- Anthropic Sonnet: $3 input / $15 output
- Anthropic Opus: $15 input / $75 output
- OpenAI GPT-4o-mini: $0.15 input / $0.60 output
- OpenAI GPT-4o: $2.50 input / $10 output
- Gemini Flash: $0.075 input / $0.30 output
- Gemini Pro: $1.25 input / $5 output

**For Smart Work Tracker:**
- Average condensed session: ~2,000 tokens input
- Average response: ~500 tokens output
- Cost per session analysis: $0.001 - $0.005 (using cheap models)
- 100 sessions/month: $0.10 - $0.50

**Recommendation:** Start with cheapest models (Haiku/GPT-4o-mini/Gemini Flash)

---

## Privacy Considerations

### Data Sent to AI APIs:
- ✅ Condensed session metadata (timestamps, file paths, commands)
- ✅ Sanitized summary entries (thinking block summaries)
- ❌ NO code content
- ❌ NO secrets (redacted)
- ❌ NO PII (emails, phone numbers redacted)

### Example Condensed Session:
```json
{
  "session_id": "abc123",
  "duration_minutes": 120,
  "cwd": "/home/mp/awesome/smart-work-tracker",
  "git_branch": "main",
  "files_touched": [
    "src/parser.js",
    "tests/parser.test.js"
  ],
  "commands_run": [
    "npm test",
    "git commit"
  ],
  "summary_intent": "Implementing stream-based JSONL parser with byte-offset indexing for large session files"
}
```

---

## Configuration (config.js)

```javascript
module.exports = {
  ai: {
    provider: process.env.AI_PROVIDER || 'none', // anthropic|openai|gemini|none
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY,
    model: process.env.AI_MODEL || 'auto', // auto selects cheapest model per provider
    enabled: process.env.AI_ENABLED !== 'false',
    maxRetries: 3,
    timeout: 120000, // 2 minutes
  },
  privacy: {
    excludeThinking: false,
    extractThinkingSummary: true,  // Send sanitized summary only
    excludeCode: true,
    redactSecrets: true,
    redactPII: true,
  }
};
```

---

## Testing Strategy

### Mock AI Client for Tests:
```javascript
class MockAIClient {
  async complete(prompt, systemPrompt, options) {
    // Return deterministic responses for tests
    if (prompt.includes('project attribution')) {
      return JSON.stringify({
        project_id: 123,
        confidence: 0.95,
        reasoning: "Mock attribution"
      });
    }
    return "Mock response";
  }
}
```

---

## NPM Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.28.0",
    "openai": "^4.77.3",
    "@google/generative-ai": "^0.21.0"
  }
}
```

**Note:** Install only the provider(s) you plan to use.

---

## Phase 3B Implementation Checklist

- [ ] Create `lib/ai-client.js` unified wrapper
- [ ] Add AI provider to config system
- [ ] Implement session condensation algorithm
- [ ] Add privacy redaction (secrets, PII)
- [ ] Create prompt templates for:
  - [ ] Project attribution
  - [ ] Task description generation
  - [ ] Work summary
- [ ] Implement error handling and retries
- [ ] Add JSON parsing helper
- [ ] Write tests with mock AI client
- [ ] Test with all 3 providers (if keys available)
- [ ] Document usage in README

---

**Status:** Ready for Phase 3B implementation
**Reference Projects:** standalone-sales-prediction, ai-consult
**Last Updated:** 2026-01-11
