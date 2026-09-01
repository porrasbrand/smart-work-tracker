# August 2026 Time Log — Staging & Revision Notes

**Status: ✅ SUBMITTED 2026-09-01 in two batches — 73.5h total.**
- Main batch: 47.5h / 55 records / 21 tasks. Audit: `scripts/august-2026-submitted.json`.
- Supplemental batch (same day, per Manuel — off-queue work not captured by queue.db/SWT evidence): +26h / 26 records / 8 tasks. Staged: `scripts/august-2026-supplemental-hours.json`, audit: `scripts/august-2026-supplemental-submitted.json`.
- Both verified by direct ID lookup in AC (note: AC returns `record_date` as Unix timestamp in GET responses).

## Final per-client totals (both batches)
| AC ID | Client | Hours |
|---|---|---|
| 13 | BreakThrough3x — Dan Kuschel | 17.5 |
| 528 | Omaha — Dr. Soto | 14.0 |
| 696 | Shamrock H&C | 8.0 |
| 682 | First Choice MI | 7.0 |
| 507 | GS Home Services | 4.0 |
| 717 | New Wave Air | 4.0 |
| 138 | Northern Services Today | 4.0 |
| 486 | Intelemark - Development | 4.0 |
| 612 | Wagner Chiro | 3.5 |
| 401 | 1st Choice Pro (Colorado) | 3.5 |
| 535 | Vision Flooring AZ | 2.0 |
| 675 | TLI | 1.5 |
| 493 | Echelon Electric NJ | 0.5 |
| | **TOTAL** | **73.5** |

## Files
- **Staged plan:** `scripts/august-2026-staged-hours.json` (revised 2026-09-01)
- **Submitter:** `scripts/submit-august-2026.cjs` — dry-run by default; `--live` creates AC tasks first, then time records WITH `task_id` (parent only settable at create). On success writes audit `scripts/august-2026-submitted.json` — **if that file is absent, nothing was submitted.**

## Totals
**47.5h · 55 records · 21 tasks · 12 ActiveCollab projects**

| AC ID | Project | Hours | Tasks |
|---|---|---|---|
| 696 | Shamrock Heating & Cooling | 6.0 | 4 |
| 13 | BreakThrough3x.com — Dan Kuschel | 9.5 | 5 |
| 528 | Omaha — OL & OCC — Dr. Soto | 14.0 | 3 |
| 507 | gshomeservices.com | 4.0 | 1 |
| 717 | newwaveair.com | 4.0 | 1 |
| 682 | First Choice H&C — Michigan | 3.0 | 1 |
| 535 | visionflooringaz.com | 2.0 | 1 |
| 138 | northernservicestoday.com | 2.0 | 1 |
| 612 | wagnerchiro.com — Dr. Wagner | 1.5 | 1 |
| 675 | Phoenix — TheLipedemaInstitute.com | 0.5 | 1 |
| 493 | echelonelectricnj.com | 0.5 | 1 |
| 401 | 1stchoiceproservices.com | 0.5 | 1 |

## Revision decisions (2026-09-01, per Manuel)
1. **Shamrock (696) trimmed 19.5h → 6h.** Manuel reports only his *personal* share — other operative members also work that account. Kept 0.5h per touch-day on the most Manuel-specific work.
2. **Big monthly tasks split into topical tasks** (instead of one catch-all task per project per month):
   - **Shamrock → 4 tasks:** FB Leads→ServiceTitan & Hatch integration (1.5h: Aug 4/7/13) · Lead attribution & data review (2h: Aug 3/11/19/24) · Call audit (1h: Aug 14/15) · Campaigns, LPs & CallRail migration (1.5h: Aug 18/23/31)
   - **B3X (13) PPC Ops → 4 tasks:** Roster reporting & budget (1.5h) · LP quality checklist & dev handoff (1.5h) · Core Training prospect review (1.5h) · Fall/September planning (2h). HVAC3X mail batches (3h) remains its own task.
3. **Omaha (528) raised 5h → 14h** per Manuel (staging was too conservative for this account), split into 3 tasks and **spread across the month** (per Manuel — not clustered in week 1): Campaign strategy & client communication (4h: Aug 3/6/17/25) · Arm Lipo landing page build (4.5h: Aug 4/11/13) · Ad creatives & pre-launch review (5.5h: Aug 7/14/20/27).

## Evidence basis
hetzner `queue.db` — 521 Aug messages (Manuel = U059SDDNCJ1: 307) + lipo SWT segments; conservative ~25–35% of daily message spans.

## Gotchas (see memory `swt-scheduler-and-attribution`)
- The pm2 `smart-work-tracker-scheduler` **drifts back online** via `pm2 resurrect` (4th occurrence found 2026-09-01, re-stopped). Always `pm2 list | grep scheduler` and stop it before touching time data — it auto-submits approved segments with no human gate.
- AC protocol: task first, then time record with `task_id`. Billed records lock (status 2, writes 404) while any invoice references them.

## How this month was built (reusable month-end recipe)
1. **Stop the scheduler first**: `pm2 stop smart-work-tracker-scheduler` (it drifts back online via pm2 resurrect).
2. **Gather evidence**: hetzner `~/awsc-new/awesome/slack-app/queue.db` — messages per queue for the month; plus lipo SWT `segments`. Stage conservatively (~25–35% of daily message spans) into a JSON like `scripts/august-2026-staged-hours.json`.
3. **Separate people**: split queue traffic by `user_id`. Manuel = `U059SDDNCJ1`; `U0B9M7BSBLH` is a teammate — never bill their expert traffic as Manuel's. Watch for automation too (e.g. ppc-control's daily 14:00 cron message).
4. **Read real message text** past the Slack wrapper: `substr(query, instr(query,'do not mention it.]')+20)`.
5. **Review with Manuel**: split big blocks into topical tasks (not one catch-all per project); adjust shares (accounts with multiple operatives get only Manuel's share); spread raised hours across the month, not clustered.
6. **Supplemental batch** for off-queue work (calls, meetings, email) is directed by Manuel — queue evidence is a floor, not a ceiling.
7. **Submit** via the dry-run-first script (task first, then records with `task_id`); **verify by direct record-ID GETs** (list-endpoint `record_date` is a Unix timestamp). Keep the audit JSONs — they hold every AC id for later moves/deletes.
8. Routing constants: Intelemark → AC **486** (never 12); 1st Choice **Michigan = 682** vs **Colorado = 401** — never mix; TLI → 675.

## Next time (September)
Copy the two staging JSONs + submit scripts as templates, rename month, repeat the recipe.
