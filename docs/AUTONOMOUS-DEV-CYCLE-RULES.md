# Autonomous Development Cycle Rules

**Created:** 2026-01-11
**Purpose:** Define how Claude Code will autonomously develop Smart Work Tracker from Phase 0 through completion
**User Directive:** "Take control of development and complete it until the end (including test cycles)"

---

## Core Principle

**Claude Code operates AUTONOMOUSLY** with minimal user intervention. The user does NOT need to be present or control each step. Claude Code will:
- Make implementation decisions independently
- Consult remote AI when needed for validation
- Self-course-correct based on learnings
- Complete all phases through to production-ready state

---

## Development Cycle for Each Phase

### Phase Workflow (7 Stages)

```
📝 DOCUMENT → 🤖 REVIEW → 💻 IMPLEMENT → 🧪 TEST → 🔍 CONSULT → ✅ APPROVE → 🏷️ RELEASE
```

### Detailed Breakdown

#### **Stage 1: Document Next Phase** (Autonomous)
**When:** AFTER completing previous phase, BEFORE starting implementation

**Process:**
1. **Review completed phase learnings:**
   - What worked well?
   - What didn't work as expected?
   - Any new insights or challenges discovered?
   - Technical debt or refactoring needed?

2. **Course-correct if needed:**
   - Adjust next phase scope based on learnings
   - Update approach if better pattern discovered
   - Revise estimates or dependencies
   - Document deviations from original framework

3. **Create detailed phase documentation:**
   - File: `docs/phases/phase-N-NAME.md`
   - Use the template from `00-DEVELOPMENT-FRAMEWORK.md`
   - Include:
     - Objective (what this phase delivers)
     - Scope (in/out)
     - Risks & Assumptions (with mitigations)
     - Requirements (functional & non-functional)
     - Implementation Plan (files, functions, data structures)
     - Test Plan (unit, integration, golden fixtures, property tests)
     - Migration Plan (if DB changes)
     - Success Criteria (definition of done)

4. **Document is DETAILED - ready for immediate implementation**
   - No placeholders or TBDs
   - Specific file names and function signatures
   - Pseudo-code for complex algorithms
   - Test cases enumerated
   - Migration scripts outlined

---

#### **Stage 2: Review Phase Doc with Remote AI** (When Required)

**Consultation Triggers (REQUIRED consultations):**
- ✅ Phase 0: Architecture/foundation review
- ✅ Phase 1: Stream parser algorithm review
- ✅ Phase 2: Attribution engine logic review
- ✅ Phase 3A: ActiveCollab integration security review
- ✅ Phase 3B: Privacy/AI analysis review
- ✅ Phase 4: Sync ledger/idempotency review
- ✅ Phase 6: Batch processing strategy review
- ✅ Phase 7: Final security/privacy audit

**Consultation Triggers (OPTIONAL - skip if trivial):**
- ❌ Simple CRUD operations
- ❌ UI refinements
- ❌ Documentation updates

**Action:**
```bash
@remote consult-openai: phase-N-review [file:docs/phases/phase-N-NAME.md]
  -> Review implementation plan for issues, edge cases, and improvements
```

**Wait for response, then:**
- Incorporate feedback into phase doc
- Update approach if significant issues found
- Document AI recommendations in consultation log

**Decision:** Claude Code decides autonomously whether feedback requires major revision or minor adjustment

---

#### **Stage 3: Implement** (Autonomous)

**Process:**
1. **Create TodoWrite task list** from phase doc
2. **Implement step-by-step:**
   - Follow phase doc implementation plan
   - Write code with inline documentation
   - Apply immutability rules
   - Implement structured logging
   - Create migrations if DB changes
   - Handle errors per error taxonomy
3. **Mark todos as completed** as each step finishes
4. **Commit frequently** with clear messages
5. **Self-check against success criteria** as you go

**Autonomy:**
- Make all technical decisions independently
- Choose libraries/approaches based on best practices
- Refactor if cleaner approach discovered mid-implementation
- Document deviations from plan in comments

---

#### **Stage 4: Test** (Autonomous)

**Process:**
1. **Write all test types:**
   - Unit tests (individual functions)
   - Integration tests (phase deliverables)
   - Golden fixture tests (if applicable)
   - Property tests (if applicable)
   - Snapshot tests (for UI)
   - Manual test checklist

2. **Run all tests:**
   ```bash
   npm test
   ```

3. **Fix all failures:**
   - Debug failing tests
   - Fix implementation bugs
   - Update tests if requirements changed
   - Re-run until ALL tests pass

4. **Verify success criteria:**
   - Check each item in phase doc success criteria
   - Performance benchmarks (if specified)
   - Manual verification steps

**Autonomy:**
- Fix bugs independently
- Decide when implementation is "done"
- Add extra tests if gaps discovered
- Refactor for better testability if needed

**Rule:** Phase is NOT complete until ALL tests pass

---

#### **Stage 5: Consult on Implementation** (When Required)

**Consultation Triggers (REQUIRED):**
- ✅ Phase 1: Parser performance/robustness review
- ✅ Phase 3B: Privacy redaction verification
- ✅ Phase 4: Idempotency verification
- ✅ Phase 6: Batch processing stress test review
- ✅ Phase 7: Final code review before production

**Consultation Triggers (OPTIONAL):**
- ❌ Straightforward implementations
- ❌ Already consulted in Stage 2

**Action:**
```bash
@remote consult-openai: phase-N-code-review [file:src/phase-N-module.js]
  -> Review implementation for bugs, security issues, edge cases, optimizations
```

**Wait for response, then:**
- Fix any bugs identified
- Implement recommended optimizations
- Add missing error handling
- Re-run tests after changes

---

#### **Stage 6: Self-Approve or Request User Approval** (Mixed)

**Self-Approval Criteria (Claude Code approves autonomously):**
- ✅ All tests pass
- ✅ Success criteria met
- ✅ No blocking issues from AI consultations
- ✅ Code follows best practices
- ✅ Documentation complete

**User Approval Required (stop and ask user):**
- ⚠️ Major deviation from original framework
- ⚠️ Significant scope creep discovered
- ⚠️ Performance issues can't be resolved easily
- ⚠️ Security vulnerability found that needs discussion
- ⚠️ Phase 7 completion (final sign-off before production)

**Process:**
1. **Update phase doc completion section:**
   - Mark all checkboxes as complete
   - Note completion date
   - Document deviations
   - Note lessons learned

2. **If self-approving:**
   - Proceed directly to Stage 7
   - Note in commit: "Phase N self-approved - all criteria met"

3. **If user approval needed:**
   - Stop and present summary
   - Ask for approval
   - Wait for user response

---

#### **Stage 7: Release & Tag** (Autonomous)

**Process:**
1. **Git operations:**
   ```bash
   git add .
   git commit -m "Complete Phase N: [Name]

   - [List of deliverables]
   - All tests passing
   - Success criteria met

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

   git tag phase-N-complete
   git push
   git push --tags
   ```

2. **Update documentation:**
   - Mark phase complete in `docs/01-ROADMAP.md`
   - Update `README.md` if user-facing changes
   - Update `docs/00-DEVELOPMENT-FRAMEWORK.md` status

3. **Clean up:**
   - Archive temporary files
   - Clean up debug logs
   - Remove unused code

4. **Prepare for next phase:**
   - Review what's next
   - Identify any blockers
   - Note dependencies completed

---

## When to Create Next Phase Documentation

**Timing:** IMMEDIATELY after completing Stage 7 (Release & Tag) of previous phase

**Process:**
1. Complete Phase N → Stage 7 (Release & Tag)
2. **IMMEDIATELY** create Phase N+1 detailed documentation (Stage 1)
3. Consult remote AI on Phase N+1 doc (Stage 2)
4. Begin Phase N+1 implementation (Stage 3)

**Rationale:**
- Fresh context from just-completed phase
- Learnings are top-of-mind
- Course corrections can be applied immediately
- No context switching delays

**Exception:** User explicitly requests pause or review

---

## Remote AI Consultation Strategy

### When to Consult (Decision Tree)

```
New Phase Documentation Created?
  ├─ Phase is complex/risky? → YES → @remote consult-openai
  ├─ Phase is security-sensitive? → YES → @remote consult-openai
  ├─ Phase is simple CRUD? → NO → Skip consultation
  └─ Unsure? → Default to consulting (better safe than sorry)

Implementation Complete?
  ├─ Complex algorithm implemented? → YES → @remote consult-openai
  ├─ Privacy/security feature? → YES → @remote consult-openai
  ├─ Straightforward implementation? → NO → Skip consultation
  └─ Unsure? → Default to consulting
```

### Consultation Format

**For Phase Planning:**
```bash
@remote consult-openai: phase-N-NAME-review [file:docs/phases/phase-N-NAME.md]
  -> Review implementation plan for [specific concerns]. Identify edge cases, suggest improvements.
```

**For Code Review:**
```bash
@remote consult-openai: phase-N-NAME-code-review [file:src/module-name.js]
  -> Review implementation for bugs, security issues, performance, best practices.
```

**For Alternative Perspectives:**
```bash
@remote consult-gemini: phase-N-NAME-cross-validation [file:...]
  -> Cross-validate OpenAI recommendations, identify missed risks.
```

### Handling Consultation Results

1. **Read response** from `tasks/responses/new/[id].json`
2. **Evaluate recommendations:**
   - Critical issues (security, bugs) → Implement immediately
   - Optimization suggestions → Evaluate cost/benefit, implement if worthwhile
   - Alternative approaches → Consider for future phases
3. **Update documentation** if approach changes
4. **Re-test** after implementing changes
5. **Archive response** for future reference

---

## Self-Course-Correction Protocol

### After Each Phase, Evaluate:

**1. What Worked Well?**
- Techniques to repeat
- Patterns to standardize
- Documentation accuracy

**2. What Didn't Work?**
- Problems encountered
- Incorrect assumptions
- Technical debt created

**3. Adjustments for Next Phase:**
- Scope changes needed?
- Approach refinements?
- Dependencies changed?
- Timeline adjustments?

### Course Correction Triggers

**Minor Adjustments (autonomous):**
- Better library discovered
- Simpler approach found
- Edge case handling improved
- Performance optimization needed

**Major Adjustments (notify user):**
- Fundamental architecture change needed
- Significant scope creep
- Blocker discovered
- Security issue requires redesign

### Documentation of Changes

**File:** `docs/decisions/NNN-decision-title.md` (Architecture Decision Record)

**Template:**
```markdown
# ADR NNN: [Decision Title]

## Context
[What situation led to this decision?]

## Decision
[What did we decide to do?]

## Rationale
[Why this approach over alternatives?]

## Consequences
- Positive: ...
- Negative: ...
- Neutral: ...

## Alternatives Considered
1. Alternative A: Rejected because...
2. Alternative B: Rejected because...

## Status
Accepted | Superseded by ADR XXX

## Date
2026-01-XX
```

---

## Autonomous Operation Rules

### What Claude Code DOES Autonomously:

✅ **Planning:**
- Create detailed phase documentation
- Break down into implementation tasks
- Estimate complexity
- Identify dependencies

✅ **Decision-Making:**
- Choose libraries and tools
- Select algorithms and patterns
- Decide on data structures
- Determine error handling approaches
- Refactor when beneficial

✅ **Implementation:**
- Write all code
- Create all tests
- Run all tests and fix failures
- Commit and tag
- Update documentation

✅ **Quality Assurance:**
- Write comprehensive tests
- Fix bugs
- Optimize performance
- Ensure security best practices
- Verify success criteria

✅ **AI Consultation:**
- Decide when to consult (based on triggers)
- Queue consultations via @remote
- Incorporate feedback
- Re-test after changes

✅ **Course Correction:**
- Adjust plans based on learnings
- Refactor for better design
- Update documentation with changes
- Document decisions in ADRs

### What Requires User Approval:

⚠️ **Major Changes:**
- Significant scope changes
- Fundamental architecture revisions
- Removing planned features
- Adding major new dependencies

⚠️ **Blockers:**
- Unresolvable technical issues
- Security vulnerabilities requiring discussion
- Performance issues with no clear solution
- External dependency failures

⚠️ **Final Approval:**
- Phase 7 completion (production readiness)
- Any deployment or release

### How to Handle User Approval Needs:

1. **Stop current work**
2. **Document the issue clearly:**
   - What's the problem/decision?
   - What options are available?
   - Recommended approach and why?
   - Implications of each option
3. **Present to user** in clear, concise format
4. **Wait for user response**
5. **Proceed** based on user decision

---

## Progress Reporting

### Automatic Reporting (No User Action Needed)

**At Phase Completion:**
```
✅ Phase N: [Name] - COMPLETE

Deliverables:
- [List of what was built]

Tests: X passing, 0 failing
Success Criteria: All met
Duration: [time taken]
Commits: [number] commits
Consultations: [number] remote AI consultations

Notable Learnings:
- [Key insights for future phases]

Next: Beginning Phase N+1 - [Name]
```

**During Long Phases:**
- TodoWrite updates show progress
- Git commits show incremental work
- User can check anytime without interruption

### User Can Monitor Via:

```bash
# Check current todos
cat ~/.claude/todos/current.json

# Check recent commits
git log --oneline -10

# Check phase documentation status
cat docs/phases/phase-*.md | grep "Status:"

# Check consultation log
ls docs/consultations/
```

---

## Exception Handling

### If Claude Code Gets Stuck:

**Autonomous Resolution Attempts:**
1. Consult remote AI for help
2. Review similar patterns in codebase
3. Try alternative approach
4. Simplify implementation
5. Add TODO for future optimization

**If Still Stuck After Attempts:**
- Stop and report to user
- Present the problem clearly
- List what was tried
- Ask for guidance or approval to skip/defer

### If Tests Keep Failing:

**Autonomous Resolution:**
1. Debug systematically
2. Add more logging
3. Simplify test case
4. Review test assumptions
5. Consult remote AI for debugging help

**If Still Failing:**
- Document the issue
- Present to user with test output
- Request guidance

### If Remote AI Consultation Fails:

**Fallback:**
1. Proceed with best judgment
2. Add extra tests for safety
3. Document the decision in ADR
4. Note in phase doc for future review
5. Continue with implementation

---

## What Claude Code Has (Checklist)

### ✅ Access & Permissions
- [x] Claude Code session logs access (all projects)
- [x] ActiveCollab API credentials
- [x] ActiveCollab project list (30 projects)
- [x] Permission to use real data for testing
- [x] @remote consultation system working

### ✅ Documentation
- [x] Development framework (OpenAI + Gemini validated)
- [x] All 8 phases planned
- [x] Phase document template
- [x] Testing strategy defined
- [x] Privacy/security guidelines
- [x] Error taxonomy
- [x] Autonomous dev cycle rules (this document)

### ✅ Technical Setup
- [x] Project structure created
- [x] .env file with credentials
- [x] .gitignore configured
- [x] ActiveCollab projects documented
- [x] CLAUDE.md updated with permissions

### ✅ AI Consultation Access
- [x] @remote consult-openai working
- [x] @remote consult-gemini working
- [x] Consultation templates defined
- [x] Feedback incorporation process defined

### ❓ Pending (for later phases)
- [ ] AI provider choice (Phase 3B) - can decide later or skip
- [ ] User preferences (can use defaults)

---

## Confirmation Questions for User

Before beginning autonomous development, confirm:

1. **Autonomy Level:**
   - ✅ Claude Code operates independently through all phases?
   - ✅ Only stop for major decisions/blockers/final approval?
   - ✅ Make technical decisions without asking?

2. **Consultation Strategy:**
   - ✅ Consult @remote for complex phases (as defined)?
   - ✅ Incorporate AI feedback autonomously?
   - ✅ Skip consultations for trivial work?

3. **Course Correction:**
   - ✅ Adjust plans based on learnings from previous phase?
   - ✅ Document changes in ADRs?
   - ✅ Notify user only for major deviations?

4. **Testing:**
   - ✅ Write comprehensive tests for all phases?
   - ✅ Don't proceed if tests fail?
   - ✅ Fix bugs independently?

5. **Completion:**
   - ✅ Continue through ALL phases until production-ready?
   - ✅ Final approval requested only for Phase 7 completion?
   - ✅ Deploy/release only with explicit user approval?

---

## Summary: Autonomous Development Process

**For Each Phase:**

```
AFTER Previous Phase Completes:
1. ✍️ Create detailed Phase N+1 doc (immediate, autonomous)
2. 🤖 Consult @remote if complex/security-sensitive (autonomous decision)
3. 📥 Incorporate feedback (autonomous)
4. ✅ Self-approve plan or request user approval (based on criteria)

BEGIN Implementation:
5. 📋 Create TodoWrite task list (autonomous)
6. 💻 Implement step-by-step (autonomous)
7. 🧪 Write & run all tests (autonomous)
8. 🔧 Fix all bugs until tests pass (autonomous)
9. 🤖 Consult @remote for code review if needed (autonomous decision)
10. 📥 Incorporate feedback and re-test (autonomous)
11. ✅ Self-approve completion (based on criteria)
12. 🏷️ Commit, tag, release (autonomous)
13. 📊 Report completion to user (automatic)

REPEAT for Next Phase (autonomous)
```

**User Role:**
- Monitor progress (optional)
- Approve major deviations (only when requested)
- Approve final Phase 7 completion (required)
- Approve deployment/release (required)

---

## Ready to Begin?

If user confirms understanding and agreement:

✅ **Claude Code will:**
- Start Phase 0 immediately
- Create detailed phase documentation
- Consult @remote when needed
- Implement autonomously
- Test thoroughly
- Course-correct as needed
- Continue through all phases until production-ready
- Report progress automatically
- Stop only for major decisions or final approval

**User can leave and return anytime** - Claude Code will continue working autonomously based on these rules.

---

**Status:** Awaiting user confirmation to begin autonomous development
