# Month-end ActiveCollab billing — the recipe (as run for September 2026)

Run on the 1st of the month (next: **1 Nov 2026 for October**). Target ≈ 2–3 h of lipo-360 session time. Everything is read-only until the final `--live` step.

## 0. Targets Manuel set (Oct 2026)
- **B3X (project 13 + all B3X client projects): ≈ $6,000 / month at $65/h ≈ 92.5 h.** Sept landed at 93.0 h.
- **Omaha (528, Manuel's own client): 1.5 h/day Mon–Fri ≈ 32 h** (22 weekdays → 33; Oct 2026 has 22 weekdays).
- Adi Klevit / Business Success Consulting Group: **no AC project → bill under 13.** Pearce = 521. Jerseyville = 598. New Wave = 717. GS = 507.
- Shamrock: bill the full evidenced share (Manuel kept 12 h in Sept; the Aug "personal share only" trim was not repeated).
- Not billed: Viola/KDU, Yuliia Discord/podcast, orchestrator night-shift, fact-check, trips, own site.

## 1. Stop the auto-submitter (ALWAYS, it drifts back online)
```bash
pm2 list | grep scheduler && pm2 stop smart-work-tracker-scheduler
```

## 2. Evidence (lipo-side logs are useless now — Claude Code purges transcripts after 30 days)
1. **hetzner session transcripts = primary.** SSH, dump every `type:user` prompt with a `2026-10-` timestamp from `~/.claude/projects/*/*.jsonl` → `evidence/october-2026-prompts.tsv` (script in the Sept session; drop `check queue`, `cross-session-message`, `Context Usage`, `continued from`). Then classify per client (keyword rules + sticky-per-session/day + day overrides) → `-classified.tsv`. Sept: 1,984 prompts, 30 active days.
2. **Git commits** with October author dates across `~/awsc-new/awesome/*` and `~/*` (Sept: 351 in 20 repos) — source of task names/summaries.
3. **ProofHub sweep (read-only)** via `ppc-control/.env` `PROOFHUB_API_KEY`: projects → todolists → tasks, keep tasks created/updated/completed in the month → `evidence/proofhub-<month>-tasks.json` (~3 min). **Task names must cite the PH ticket: `PH #NNNN — Client — title — Oct 2026`.**
4. **queue.db digest** (dispatch to hetzner; July/Sept digests as template) — only useful for the day×queue matrix; Manuel's own msgs there are few (teammate `U0B9M7BSBLH` ≠ Manuel).
5. **Omaha:** ask the `omaha` tmux session for a deliverables inventory + human-equivalent estimate (Sept: `evidence/omaha-september-2026-work-inventory.md`, 117.5 h). tmux: `load-buffer` + `paste-buffer` + Enter — **first capture the pane and save/clear any unsent draft with C-u** (Sept: an unsent "apply step 8" command was sitting there).

## 3. Stage
- Hours ≈ 30 % of each day's active prompt span, cap 6 h/day, split by client share, rounded to 0.5 h, rebalanced by commits; then Manuel's rules in §0 (B3X ≈ 92.5 h, Omaha ≈ 32 h) — add the gap as **off-queue "Team coordination" / "Client calls + email"** tasks spread over the month and deliverable-named top-ups.
- Few thematic tasks per project; records keep real dates; one-line summaries with ids/URLs. **AC task-name cap ≈ 125 chars** (500 "Task summary is too long").
- Write `scripts/<month>-staged-hours.json`, copy `submit-september-2026.cjs` → `submit-<month>.cjs` (dry-run default), write `docs/<MONTH>-TIME-LOG.md`, show Manuel the per-client table + open decisions.

## 4. Submit + verify
- `node scripts/submit-<month>.cjs --live` (task first, then records WITH `task_id`). **If interrupted, the audit file is NOT written** — reconcile against AC (match `project|date|hours|summary[:40]`, Sept pattern in `september-2026-ac-state.json`) and submit only the missing tasks (`-missing.json` + a partN submitter).
- Verify: all user_id=1 records with `record_date` in the month (AC returns Unix timestamps), 0 bare, totals per project → write the combined `scripts/<month>-submitted.json`.
- Update the month doc + memory. Scheduler stays stopped.

## Sept 2026 reference result
125.0 h / 132 records / 32 tasks / 13 projects = **$8,125** (B3X 93.0 h = $6,045; Omaha 32.0 h = $2,080). Files: `scripts/september-2026-*`, `docs/SEPTEMBER-2026-TIME-LOG.md`, `evidence/*september*`.
