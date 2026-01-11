# Required User Data & Credentials

**Created:** 2026-01-11
**Purpose:** Gather all necessary access credentials and configuration before implementation
**Status:** 🟡 Awaiting user input

---

## 🔴 CRITICAL - Needed for Phase 0-1 (Foundation & Parser)

### 1. Claude Code Session Logs Access
**What:** Confirm access to session log locations
**Location:** `~/.claude/projects/`

**Questions:**
- [x] Which project directories should we monitor?
  - **ANSWER:** ALL projects in `~/.claude/projects/`
- [x] Any project directories to EXCLUDE from tracking?
  - **ANSWER:** None - monitor all
- [x] Permission to read these logs?
  - **ANSWER:** ✅ YES - Full permission granted
- [x] Permission to use real session logs for testing (will be anonymized)?
  - **ANSWER:** ✅ YES - Approved

**Status:** ✅ **CONFIRMED** (2026-01-11)

---

## 🟠 HIGH PRIORITY - Needed for Phase 2-3 (Attribution & ActiveCollab)

### 2. ActiveCollab API Access
**What:** Credentials to connect to your ActiveCollab instance

**Required Information:**

**A) Account URL:**
- [x] **Your ActiveCollab Instance URL:** `https://app.activecollab.com/180377`

**B) API Token:**
- [x] **API Token Generated:** `1-21MNnN4Bw0GKuZ7OV8ffjC4HXnUvm4L6hzeoFcNe`
  - ✅ Stored in `.env` file (not committed to git)
  - ✅ Token successfully tested - API access working

**C) Two-Factor Authentication:**
- [x] **2FA Status:** Not enabled
  - ✅ Standard token auth works

**API Test Results:**
- ✅ Authentication successful
- ✅ Projects list retrieved (30 active projects)
- ✅ API fully operational

**Status:** ✅ **CONFIRMED & TESTED** (2026-01-11)

---

### 3. ActiveCollab Project Structure
**What:** Information about your existing ActiveCollab projects

**Retrieved via API (2026-01-11):**

**Option B Selected:** ✅ Automatic fetch via API

**Project Data:**
- ✅ **Total Projects:** 30 active projects
- ✅ **Projects Retrieved:** Full list stored in `docs/ACTIVECOLLAB-PROJECTS.md`
- ✅ **All projects billable** with time tracking enabled
- ✅ **Industries:** Medical, Home Services, Business Consulting, Real Estate, Technology

**Additional Context:**
- [x] How many ActiveCollab projects? **30 active projects**
- [ ] Do you use task IDs in your work (e.g., "Task #789")?
  - **TO ASK:** Do you reference task IDs when working?
- [x] Track ALL projects or only specific ones? **ALL projects**

**Notable Project Groups:**
- **Dr. Hall projects:** 3 projects (Phoenix, Phoenixweightloss, Algonamarine)
- **Intelemark:** 2 projects (main + development)
- **Dan Kuschell clients:** 2 projects

**Status:** ✅ **RETRIEVED VIA API** (2026-01-11)
**Reference:** See `docs/ACTIVECOLLAB-PROJECTS.md` for full list

---

## 🟡 MEDIUM PRIORITY - Needed for Phase 3B (AI Analysis)

### 4. AI Provider Access
**What:** API credentials for AI-assisted analysis (project detection, task descriptions)

**Status:** ✅ **DEFERRED - Can decide later**

**AI Integration Knowledge:**
- ✅ Retrieved code patterns from standalone-sales-prediction project
- ✅ All 3 providers documented (OpenAI, Anthropic, Gemini)
- ✅ Unified AI client wrapper designed
- ✅ Error handling and retry logic defined
- ✅ Privacy redaction patterns established
- ✅ Reference: `docs/AI-API-INTEGRATION-REFERENCE.md`

**Provider Options (for Phase 3B):**
- **Option A:** OpenAI (GPT-4o-mini) - Fast, cheap, excellent JSON mode
- **Option B:** Anthropic (Claude Haiku) - Fast, cheap, privacy-focused
- **Option C:** Gemini (Flash) - Fast, cheap, large context
- **Option D:** None - Skip AI, use rules-based attribution only

**Decision Timeline:**
- Can decide when reaching Phase 3B (after Phase 0, 1, 2, 3A)
- Can start with "none" (rules-based only) and add AI later
- Can test all 3 providers and choose best performer

**Cost Estimate:**
- ~$0.001-$0.005 per session analysis (using cheap models)
- ~$0.10-$0.50 for 100 sessions/month

**Status:** ⏸️ **DEFERRED to Phase 3B** (not blocking Phase 0-2 development)

---

## 🟢 LOW PRIORITY - Preferences & Configuration

### 5. Privacy Preferences
**What:** Your privacy and data handling preferences

**Preferences:**
- [ ] **Exclude thinking blocks?** (Recommended: No - extract summary only)
  - [ ] Yes - completely exclude
  - [ ] No - extract sanitized summary intent
  - [ ] Ask me each time

- [ ] **Exclude code content?** (Recommended: Yes)
  - [ ] Yes
  - [ ] No

- [ ] **Redact secrets automatically?** (Recommended: Yes)
  - [ ] Yes - detect API keys, passwords, tokens
  - [ ] No - I don't have secrets in my sessions

- [ ] **Redact PII automatically?** (Recommended: Yes)
  - [ ] Yes - detect emails, phone numbers
  - [ ] No

- [ ] **Review condensed data before AI calls?** (Recommended: Yes for first few)
  - [ ] Yes - show me what will be sent
  - [ ] No - trust the redaction

**Status:** ⏳ Awaiting preferences (defaults available)

---

### 6. Attribution & Tracking Preferences
**What:** How you want sessions attributed and time tracked

**Time Tracking:**
- [ ] **Idle gap threshold:** How long of inactivity = new work block?
  - Recommended: 15 minutes
  - Your preference: `_____ minutes`

- [ ] **Minimum session duration to track:**
  - Recommended: 5 minutes (skip very short sessions)
  - Your preference: `_____ minutes`

- [ ] **Work hours:**
  - Do you want to exclude sessions outside work hours? (Yes/No)
  - If yes, work hours: `_____` to `_____` (e.g., 9am to 6pm)

**Project Attribution:**
- [ ] **Confidence threshold for auto-approval:**
  - High confidence (>90%): Auto-approve? (Yes/No)
  - Medium confidence (70-90%): Manual review? (Yes/No)
  - Low confidence (<70%): Always manual review? (Yes/No)

**Keywords for Attribution:**
- [ ] Do you have specific keywords for your projects? (fill in #3 above)

**Status:** ⏳ Awaiting preferences (defaults available)

---

### 7. Notification Preferences (Phase 7)
**What:** How to notify you when processing completes

**Future Feature - Not needed now:**
- [ ] Email notifications? (Yes/No)
  - Email address: `___________________________`
- [ ] Slack notifications? (Yes/No)
  - Webhook URL: `___________________________`
- [ ] Desktop notifications only? (Yes/No)

**Status:** ⏸️ Deferred to Phase 7

---

## 📋 Environment Variables Template

Once you provide the credentials, we'll create a `.env` file like this:

```bash
# ActiveCollab
AC_API_URL=https://app.activecollab.com/YOUR_INSTANCE_ID
AC_API_TOKEN=your_activecollab_api_token_here

# AI Provider (choose one)
AI_PROVIDER=openai  # or anthropic, local, none
OPENAI_API_KEY=your_openai_key_here
# ANTHROPIC_API_KEY=your_anthropic_key_here

# Privacy Settings
EXCLUDE_THINKING=false
EXTRACT_THINKING_SUMMARY=true
EXCLUDE_CODE=true
REDACT_SECRETS=true
REDACT_PII=true

# Attribution
IDLE_GAP_MINUTES=15
MIN_SESSION_MINUTES=5

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Optional: Work Hours (24-hour format)
# WORK_HOURS_START=09:00
# WORK_HOURS_END=18:00
```

---

## 🔐 Security Notes

**How we'll handle your credentials:**

1. **Storage:**
   - All credentials in `.env` file (NOT committed to git)
   - `.gitignore` will exclude `.env`
   - Config file references env vars via `process.env.VARIABLE_NAME`

2. **Logging:**
   - Credentials NEVER logged
   - API responses logged without tokens
   - Session data redacted per privacy settings

3. **Testing:**
   - Test suite uses MOCK credentials
   - Real credentials only for manual testing
   - Mock ActiveCollab server for automated tests

4. **Encryption (Optional):**
   - For extra security, we can encrypt the config file
   - Would you like encrypted config? (Yes/No)

---

## ✅ Quick Start Checklist

**To begin Phase 0-1 (Foundation & Parser):**
- [ ] Confirm Claude Code session log access (#1)

**To begin Phase 2-3 (Attribution & ActiveCollab):**
- [ ] Provide ActiveCollab URL & API token (#2)
- [ ] List your ActiveCollab projects (#3)

**To begin Phase 3B (AI Analysis):**
- [ ] Choose AI provider & provide API key (#4)

**Optional (can use defaults):**
- [ ] Privacy preferences (#5)
- [ ] Attribution preferences (#6)

---

## 📝 How to Fill This Out

**Option A) Fill in this document:**
- Edit this file directly
- Replace `___________` with your values
- Check [ ] boxes with [x]

**Option B) Provide in conversation:**
- Just tell me the values in order
- I'll create the `.env` file

**Option C) Partial now, rest later:**
- Provide critical items (#1-2) now
- We'll start Phase 0-1
- Provide AI keys (#4) before Phase 3B

---

## 🎯 Recommended Approach

**Start with minimal credentials:**
1. ✅ Confirm Claude Code log access (#1) - **NEEDED NOW**
2. ⏭️ ActiveCollab credentials (#2) - **Before Phase 3A**
3. ⏭️ AI provider choice (#4) - **Before Phase 3B**
4. ⏭️ Everything else - **Use defaults, adjust later**

**This allows us to:**
- Start Phase 0 (Foundation) immediately
- Begin Phase 1 (Parser) and test with your real session logs
- Pause before Phase 3A to get ActiveCollab access
- Pause before Phase 3B to get AI credentials

---

## ❓ Questions?

If you're unsure about any item:
- Ask me to explain what it's used for
- Ask me to show you where to find it
- Ask me for recommended defaults

**Ready to provide credentials?** Just say "Here's my info:" and list them, or check the boxes above.
