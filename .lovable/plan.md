# Almoner Auto-Log: Disengagement Risk fix + automatic Welfare Log entries

## Part 1 — Fix Disengagement Risk (KPI Dashboard)
- Rewrite `disengagementRisk` so each of the last 3 past meetings is judged on its own: a meeting counts as "unexcused miss" only if the member has no Attended/Booked entry AND no Apologies entry **for that meeting**.
- Flag a member only when all 3 meetings are unexcused misses (welfare-absence cover still applies per meeting, by date overlap).
- Honorary members stay excluded; Active vs Inactive is unchanged.
- The Welfare Board "worth a call?" badge (`computeCheckInFlags`) is not touched.

## Part 2 — Automatic Welfare Log entries

### Shared rule (one implementation, used by app and server)
New pure module `almonerAutoLog` evaluating regular, past meetings with attendance recorded, on or after **18 Feb 2026**:
- **Tier 1 (established members):** 2 consecutive unexplained misses, or 3 unexplained misses in the lodge year (Oct–Sep). "Unexplained" = Part 1 per-meeting definition (apology excuses only its own meeting).
- **Tier 2 (first year after initiation date):** any single missed meeting, apologised or not.
- Honorary members are included (same as the badge — welfare visibility).
- Each trigger produces an **escalation key** (member + tier + rule + the specific meetings that caused it). Same unresolved gap = same key = no new entry. A new miss that extends or re-forms a streak after an attendance creates a new key.

### Database (new migration)
- `welfare_log_entries`: add `is_system boolean default false`, `system_reason text`, `system_key text` with a unique index on `(member_id, system_key)` where not null.
- Block app users from inserting/editing `is_system` rows (trigger: only service role may set `is_system = true`; system rows are not editable by users, but can be soft-deleted/dismissed by Almoner-edit holders).
- Read access unchanged: existing two-tier welfare gates (Almoner/Secretary/admin read-write, current WM read-only, IPM and ordinary members none).

### Server job
- Extend the existing daily `almoner-overdue-check` function: run the evaluator, insert any new system entries (`ON CONFLICT DO NOTHING`), then add a "New system-logged disengagement" section to the existing Almoner daily digest email. No other recipients, no new notification channel. Daily digest's own existing logic otherwise unchanged.
- First run backfills from 18 Feb 2026 automatically (idempotent).
- `dry_run` support kept so it can be verified without sending.

### UI
- Welfare Log: system entries render with a distinct dashed/muted style, "System" badge and text such as "System: missed without apology (13 May, 12 Sep)" — never shown as a contact type; no contact-type/nature implied.
- Welfare Board summary list: a separate marker ("System flag") next to members with an un-dismissed system entry, alongside (not replacing) the existing "worth a call?" badge.
- WM sees them read-only; write controls hidden as today.

## Verification
- Unit tests: per-meeting apology rule (Will's Feb apology → May/Sep misses case), Tier 1 thresholds, Tier 2 single miss incl. apologised, 18 Feb cutoff, idempotent escalation keys.
- Rolled-back DB role tests: Almoner / Secretary / admin read-write; WM read-only; IPM and ordinary member no access; users cannot forge `is_system` rows.
- Dry-run the function against real data and report which members would be logged before enabling inserts.
- 320px mobile tests for Welfare Log and Welfare Board; full suite.

## Assumptions (correct me if wrong)
- "First year of initiation" = within 12 months of the member's initiation date.
- "Almoner only" means routing/notification; the entries remain visible under the existing welfare access matrix (Secretary read-write, WM read-only).
- The Almoner can dismiss a system entry (soft delete) if he judges it not relevant.
