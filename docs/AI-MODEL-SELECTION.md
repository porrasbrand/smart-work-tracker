# AI Model Selection Strategy - Cost-Optimized

**Created:** 2026-01-11
**Purpose:** Define which AI models to use for Smart Work Tracker Phase 3B
**Priority:** Minimize costs while maintaining quality

---

## Smart Work Tracker AI Tasks (Phase 3B)

Our AI needs are **SIMPLE** - not complex reasoning:
1. **Project attribution** - Simple classification (match session to 1 of 30 projects)
2. **Task description** - Simple summarization (200-500 chars)
3. **Work summary** - Simple summarization (1-2 paragraphs)

**None of these require expensive, intelligent models.**

---

## Pricing Analysis (Per 1M Tokens)

### Gemini Models (Google)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| **Gemini 2.5 Flash-Lite** ✅ | $0.10 | $0.40 | **CHEAPEST OPTION** |
| Gemini 2.5 Flash | $0.30 | $2.50 | 3x more expensive |
| Gemini 3 Flash Preview | $0.50 | $3.00 | 5x more expensive |

**Batch Processing:** 50% discount (not needed for real-time use)

---

### Anthropic Models (Claude)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| **Claude Haiku 3** ✅ | $0.25 | $1.25 | **2nd CHEAPEST** |
| Claude Haiku 3.5 | $0.80 | $4.00 | 3x more expensive |
| Claude Haiku 4.5 | $1.00 | $5.00 | 4x more expensive |
| Claude Sonnet 4.5 | $3.00 | $15.00 | 12x more expensive |
| Claude Opus 4.5 | $5.00 | $25.00 | 20x more expensive |

**Batch Processing:** 50% discount (could use for batch mode in Phase 6)

---

### OpenAI Models (GPT)

| Model | Input (Est.) | Output (Est.) | Notes |
|-------|--------------|---------------|-------|
| **gpt-4o-mini** ✅ | ~$0.15 | ~$0.60 | **COMPETITIVE** |
| gpt-4o | ~$2.50 | ~$10.00 | 16x more expensive |

**Note:** OpenAI pricing page blocked (403), estimates based on recent public pricing

---

## Recommended Model Selection

### **PRIMARY CHOICE: Gemini 2.5 Flash-Lite**

**Why:**
- ✅ **Absolute cheapest** ($0.10 input / $0.40 output)
- ✅ Sufficient for simple classification/summarization
- ✅ Fast responses
- ✅ Free tier available for testing

**Cost Example:**
- Average session: 2,000 input tokens + 500 output tokens
- Cost per session: (2,000 × $0.10 / 1M) + (500 × $0.40 / 1M) = **$0.0004**
- 100 sessions: **$0.04**
- 1,000 sessions: **$0.40**

**Model ID:** `gemini-2.5-flash-lite` (or similar - check Google's docs)

---

### **SECONDARY CHOICE: Claude Haiku 3**

**Why:**
- ✅ 2nd cheapest ($0.25 input / $1.25 output)
- ✅ Proven reliability
- ✅ Good for privacy-conscious users (Anthropic policies)
- ✅ Available now (not deprecated)

**Cost Example:**
- Average session: 2,000 input tokens + 500 output tokens
- Cost per session: (2,000 × $0.25 / 1M) + (500 × $1.25 / 1M) = **$0.001125**
- 100 sessions: **$0.11**
- 1,000 sessions: **$1.13**

**Model ID:** `claude-haiku-3`

**Cost vs Gemini:** ~2.8x more expensive, but still very cheap

---

### **TERTIARY CHOICE: gpt-4o-mini**

**Why:**
- ✅ Excellent JSON mode (structured output)
- ✅ Competitive pricing (~$0.15 / $0.60)
- ✅ Fast and reliable
- ✅ Good ecosystem support

**Cost Example (estimated):**
- Average session: 2,000 input tokens + 500 output tokens
- Cost per session: (2,000 × $0.15 / 1M) + (500 × $0.60 / 1M) = **$0.0006**
- 100 sessions: **$0.06**
- 1,000 sessions: **$0.60**

**Model ID:** `gpt-4o-mini`

**Cost vs Gemini:** ~1.5x more expensive

---

### **AVOID THESE MODELS** ❌

**Too expensive for simple tasks:**
- ❌ Claude Haiku 4.5 ($1.00 / $5.00) - 10x more than Gemini Flash-Lite
- ❌ Claude Sonnet 4.5 ($3.00 / $15.00) - 30x more than Gemini Flash-Lite
- ❌ Claude Opus 4.5 ($5.00 / $25.00) - 50x more than Gemini Flash-Lite
- ❌ Gemini 3 Flash Preview ($0.50 / $3.00) - 5x more than Flash-Lite
- ❌ gpt-4o ($2.50 / $10.00) - 16x more than gpt-4o-mini

**Why avoid?**
These are powerful models designed for complex reasoning, creative writing, advanced analysis. Our tasks are simple classification and summarization - we'd be wasting 90% of their capabilities and paying premium prices for features we don't need.

---

## Implementation Strategy

### Phase 3B Configuration

**config.js:**
```javascript
module.exports = {
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',  // gemini|anthropic|openai|none

    // Model selection (use cheapest by default)
    models: {
      gemini: 'gemini-2.5-flash-lite',     // $0.10/$0.40
      anthropic: 'claude-haiku-3',         // $0.25/$1.25
      openai: 'gpt-4o-mini',               // ~$0.15/$0.60
    },

    // Cost tracking
    costTracking: {
      enabled: true,
      warnThreshold: 1.00,  // Warn if monthly cost exceeds $1
      maxMonthlyBudget: 5.00, // Stop at $5/month
    },

    enabled: process.env.AI_ENABLED !== 'false',
  }
};
```

### Default Model Selection Logic

```javascript
class AIClient {
  constructor(provider = 'gemini') {
    this.provider = provider;

    // Use cheapest models by default
    this.modelMap = {
      gemini: 'gemini-2.5-flash-lite',
      anthropic: 'claude-haiku-3',
      openai: 'gpt-4o-mini',
    };

    // Cost tracking
    this.costPerToken = {
      'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
      'claude-haiku-3': { input: 0.25, output: 1.25 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
    };
  }

  calculateCost(inputTokens, outputTokens, model) {
    const pricing = this.costPerToken[model];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }
}
```

---

## Cost Projections

### Conservative Estimate (100 sessions/month)

| Provider | Model | Monthly Cost |
|----------|-------|--------------|
| **Gemini** | Flash-Lite | **$0.04** ✅ |
| Anthropic | Haiku 3 | $0.11 |
| OpenAI | gpt-4o-mini | $0.06 |

### Moderate Estimate (500 sessions/month)

| Provider | Model | Monthly Cost |
|----------|-------|--------------|
| **Gemini** | Flash-Lite | **$0.20** ✅ |
| Anthropic | Haiku 3 | $0.56 |
| OpenAI | gpt-4o-mini | $0.30 |

### Heavy Estimate (1,000 sessions/month)

| Provider | Model | Monthly Cost |
|----------|-------|--------------|
| **Gemini** | Flash-Lite | **$0.40** ✅ |
| Anthropic | Haiku 3 | $1.13 |
| OpenAI | gpt-4o-mini | $0.60 |

**Conclusion:** Even at 1,000 sessions/month, Gemini Flash-Lite costs **less than $0.50/month**

---

## Testing Strategy

### Phase 3B Implementation:

1. **Start with Gemini 2.5 Flash-Lite** (cheapest)
2. **Test quality on 10-20 sample sessions**
3. **If quality insufficient:**
   - Try gpt-4o-mini (1.5x more, better JSON)
   - Try Claude Haiku 3 (2.8x more, better privacy)
4. **If still insufficient:** Upgrade to better models only if needed

### Quality Benchmarks:

- **Project attribution accuracy:** >90% on test set
- **Task description quality:** Readable, accurate, concise
- **Work summary quality:** Captures key accomplishments

**Hypothesis:** Flash-Lite will be sufficient for all our tasks.

---

## Cost Monitoring

### Track in database:

```sql
CREATE TABLE ai_usage (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Monthly cost report:

```javascript
function generateMonthlyCostReport() {
  const stats = db.query(`
    SELECT
      provider,
      model,
      COUNT(*) as requests,
      SUM(input_tokens) as total_input,
      SUM(output_tokens) as total_output,
      SUM(cost_usd) as total_cost
    FROM ai_usage
    WHERE timestamp >= date('now', '-30 days')
    GROUP BY provider, model
  `);

  console.log('AI Usage Report (Last 30 Days):');
  stats.forEach(s => {
    console.log(`${s.provider}/${s.model}: ${s.requests} requests, $${s.total_cost.toFixed(4)}`);
  });
}
```

---

## Decision Matrix

| Factor | Gemini Flash-Lite | Claude Haiku 3 | gpt-4o-mini |
|--------|-------------------|----------------|-------------|
| **Cost** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **JSON Mode** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Privacy** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Availability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Winner for Smart Work Tracker:** Gemini 2.5 Flash-Lite

---

## Final Recommendation

### **USE: Gemini 2.5 Flash-Lite**

**Reasons:**
1. ✅ **Cheapest option** by far ($0.10/$0.40 per 1M tokens)
2. ✅ **Sufficient quality** for simple classification/summarization
3. ✅ **Cost projection:** <$0.50/month even at 1,000 sessions
4. ✅ **Low risk:** If it doesn't work, easy to upgrade
5. ✅ **Fast responses** for good UX

### **Fallback Plan:**

If Flash-Lite quality is insufficient:
1. **First upgrade:** gpt-4o-mini (better JSON, 1.5x cost)
2. **Second upgrade:** Claude Haiku 3 (better reasoning, 2.8x cost)
3. **Last resort:** More expensive models (only if absolutely needed)

### **Implementation:**

- Default to Gemini 2.5 Flash-Lite in config
- Make provider/model easily configurable
- Track costs in database
- Alert if monthly cost exceeds $1
- User can override to different provider/model if needed

---

**Status:** Ready for Phase 3B implementation
**Expected Monthly Cost:** $0.04 - $0.50 (depending on usage)
**Maximum Budget:** $5/month (hard stop)

---

## Sources

- Gemini Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Anthropic Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- OpenAI Pricing: https://platform.openai.com/docs/pricing (estimated)
