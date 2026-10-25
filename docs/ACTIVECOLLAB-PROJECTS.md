# ActiveCollab Projects (Fictional Example)

> Sanitized public version: the real project list has been replaced with fictional examples.
> Use `node scripts/show-activecollab-structure.js` to list the projects of your own instance.

**Account:** YOUR_INSTANCE_ID
**Total Active Projects:** 8 (example)

---

## Project List

| ID | Name | Tasks | Description |
|----|------|-------|-------------|
| 13 | Agency Internal - Jordan | 18 | Agency-internal work (tooling, coordination) |
| 570 | Acme HVAC | 4 | acme-hvac.example.com |
| 493 | beta-plumbing.example.com | 2 | |
| 451 | delta-plumbing.example.com | 2 | |
| 521 | epsilon-hvac.example.com | 4 | |
| 507 | Zeta Home Services | 4 | |
| 1 | Springfield & Gammaclinic / Dr. Taylor | 26 | Multi-location medical client |
| 352 | GammaWeightloss.example.com / Dr. Taylor | 10 | Same client as project 1 |

---

## Notes

- All projects have `is_tracking_enabled: true` (time tracking enabled)
- All projects are billable (`is_billable: true`)
- Some projects are grouped by client (e.g., multiple Dr. Taylor projects)

---

## For Attribution Engine

### Common Keywords to Watch:
- **Medical/Health:** clinic, weight loss
- **Home Services:** hvac, plumbing, electric
- **Agency-internal:** agency, tooling

### Project Groups:
- **Dr. Taylor projects:** 1, 352 (Springfield & Gammaclinic, GammaWeightloss)

---

**API Token:** Stored in `.env`
