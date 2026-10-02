# September 2026 Time Log — Submitted

**Status: ✅ SUBMITTED 2026-10-01/02 — 125.0h / 132 records / 32 tasks / 13 AC projects (incl. Omaha top-up 2026-10-02). Verified by direct lookup (`scripts/september-2026-submitted.json`, 0 bare records).**

Submission ran in three parts: the main run (`submit-september-2026.cjs --live`) was interrupted after 81 records; `submit-september-2026-part2.cjs` added the 6 missing tasks (28 records, Adi task failed: "Task summary is too long" — AC caps task names ≈ 120-130 chars); `submit-september-2026-part3.cjs` added Adi with a shortened name (5 records). Reconciliation script output in `scripts/september-2026-ac-state.json` / `september-2026-missing.json`.

## Final per-client totals
| AC ID | Client | Hours | Tasks |
|---|---|---|---|
| 13 | BreakThrough3x — Dan Kuschel | 29.0 | 8 |
| 528 | Omaha — Dr. Soto | 32.0 | 8 |
| 696 | Shamrock H&C | 12.0 | 3 |
| 138 | Northern Services Today | 11.0 | 2 |
| 717 | New Wave Air | 9.0 | 1 |
| 507 | GS Home Services | 8.0 | 2 |
| 535 | Vision Flooring AZ | 6.5 | 1 |
| 401 | 1st Choice Pro (Colorado) | 5.5 | 1 |
| 493 | Echelon Electric NJ | 4.5 | 2 |
| 682 | First Choice MI | 3.5 | 1 |
| 598 | Jerseyville | 2.0 | 1 |
| 612 | Wagner Chiro | 1.0 | 1 |
| 521 | Pearce HVAC | 1.0 | 1 |
| | **TOTAL** | **125.0** | **32** |

B3X side (everything except Omaha) = 93.0h = $6,045 at $65/h (Manuel's target: justify $6K). Omaha = 32.0h (Manuel 2026-10-02: 1.5h/day Mon–Fri ≈ 32h; +12.5h as 4 deliverable tasks from the omaha session's inventory `evidence/omaha-september-2026-work-inventory.md`, which estimates 117.5 human-equivalent hours; part4 audit `september-2026-submitted-part4.json`).

## Manuel's decisions (2026-10-01)
- Adi / Business Success Consulting Group: keep under 13 (no own AC project); +2h WP landing page from GHL mockup → 5.5h.
- Shamrock stays 12h.
- +6h Omaha and +7h B3X-13 for off-queue coordination (calls/Slack/email), spread across the month.
- Task names grounded in ProofHub tickets (`evidence/proofhub-september-2026-tasks.json`, 91 tasks touched in Sept, swept read-only via ppc-control's ProofHub key).

---
## Staging history (kept for the record)

**Status: ⏳ STAGED 2026-10-01 — NOT submitted. Awaiting Manuel's review.**
- Staged plan: `scripts/september-2026-staged-hours.json` (97.5h / 100 records / 26 tasks / 13 AC projects)
- Submitter: `scripts/submit-september-2026.cjs` — dry-run by default; `--live` creates each AC task first, then time records WITH `task_id`. Writes audit `scripts/september-2026-submitted.json` on success — **if that file is absent, nothing was submitted.**
- Scheduler `smart-work-tracker-scheduler` was found ONLINE again (5th drift) and stopped 2026-10-01 before staging.

## Evidence base (this month differs from August)
- **lipo-360 SWT segments: only 5.5h** (Sept 1/2/6). Claude Code's 30-day transcript cleanup purged the older session logs; ai-hall / hvac3x / omaha session dirs hold nothing for September.
- **hetzner queue.db: 354 msgs, only 60 by Manuel** (teammate U0B9M7BSBLH authored 186 — excluded). Digest: `evidence/september-2026-work-digest.{md,json}` (built read-only on hetzner).
- **Primary evidence = hetzner `~/.claude/projects` session transcripts:** 1,984 direct prompts by Manuel (after removing `check queue` / cross-session noise), 30 active days, typical daily span 10–14h. Dump: `evidence/september-2026-prompts.tsv`; classified per client: `evidence/september-2026-prompts-classified.tsv`.
- **351 git commits in 20 repos** with September author dates (ppc-control 152, cc-xprt-shamrock-heating 66, gs-fall-evidence 49, client-comms-dispatch 29, zoom-action-items 17 …) — used for task names and record summaries.
- **Method:** hours ≈ 30% of each day's first→last prompt span, capped 6h/day, split by client prompt share, rounded to 0.5h, then rebalanced by commit evidence. Cross-client fan-outs (Fall greenlight re-verify 09-22/24) booked to 13.

## Staged per-client totals
| AC ID | Client | Hours | Tasks |
|---|---|---|---|
| 13 | BreakThrough3x — Dan Kuschel | 20.0 | 7 |
| 696 | Shamrock H&C | 12.0 | 3 |
| 138 | Northern Services Today | 11.0 | 2 |
| 528 | Omaha — Dr. Soto | 13.5 | 3 |
| 717 | New Wave Air | 9.0 | 1 |
| 507 | GS Home Services | 8.0 | 2 |
| 535 | Vision Flooring AZ | 6.5 | 1 |
| 401 | 1st Choice Pro (Colorado) | 5.5 | 1 |
| 493 | Echelon Electric NJ | 4.5 | 2 |
| 682 | First Choice MI | 3.5 | 1 |
| 598 | Jerseyville | 2.0 | 1 |
| 612 | Wagner Chiro | 1.0 | 1 |
| 521 | Pearce HVAC | 1.0 | 1 |
| | **TOTAL** | **97.5** | **26** |

## Open decisions for Manuel
1. ✅ **Adi / Business Success Consulting Group** — Manuel 2026-10-01: keep under 13 (3.5h).
2. ✅ **Shamrock 12h** — Manuel 2026-10-01: stays 12h.
3. **Not evidenced → not staged:** Intelemark (486), TLI (675), HVAC3X, Core Training, calls/meetings/email. Add as a supplemental batch like August if applicable.
4. **No-bill (excluded):** Viola/KDU consult, Yuliia Discord bridge + podcast pipeline (orchestrator/work-bridge 09-24/25), orchestrator night-shift design (09-20), fact-check.

## Files
- `evidence/september-2026-work-digest.md|json` — hetzner queue + commits digest
- `evidence/september-2026-prompts.tsv` / `-classified.tsv` — Manuel's prompts with client buckets
- `evidence/september-2026-auto-alloc.json` — first-pass automatic allocation (before rebalancing)

## Revision 2026-10-01 — Omaha
Omaha 528 raised 9.5h → 13.5h (3 tasks). Source: the `omaha` tmux session's own record on hetzner (`omaha-marketing/CLAUDE.md` "Sep 13–28 log" + `campaigns/*september*.md`, `october-2026-fall-refresh-brief.md`). The session could not be asked directly: it is attached with an unsent command in its prompt box ("apply step 8 with the tCPA change") — sending anything would have submitted that live Google Ads change.
