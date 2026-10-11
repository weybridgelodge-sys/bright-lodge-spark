# Almoner contact acknowledges attendance flags

## What changes for the Almoner
Logging an ordinary (non-system) Welfare Log entry for a member counts as "I've dealt with it". From that point:
- The "worth a call?" badge on the Welfare Board disappears.
- The "missed meetings" and "worth a call?" lines disappear from the daily digest.
- No new automatic (system) entry is created for the gap he has already handled.

They come back only when the member has a new unexplained miss at a meeting dated **after** the contact. No new button or checkbox.

## How "acknowledged" is decided
- **Acknowledgment date** = the `contact_date` of the member's most recent real Welfare Log entry. That means not deleted and not system-generated. Entries in the Widows register don't count.
- A miss at a meeting **on or before** that date is treated as acknowledged. A miss **after** it is fresh.
- **Flag rule:** each mechanism keeps its existing threshold and its existing view of what counts as a miss. The flag shows only if the threshold is met **and** at least one of the misses counted is fresh.
  - The badge still treats an apology as a miss.
  - The digest's "missed meetings" line still treats an apology as excused.
  - Tier 1 and Tier 2 still use the per-meeting rule.
- **Example (Will):** he misses May and Sep, and the Almoner phones him on 15 Sep. He is silent from then on. If he then misses December, the streak is May, Sep, Dec, which includes a fresh miss, so he is flagged again. If he attends in December, the streak is broken and he stays silent.
- A contact logged before any misses doesn't hide later misses, because those misses are after it.

### Assumption to confirm
I'm reading "start nagging again on a NEW unexplained miss" literally: **one** fresh miss brings the flag back if the pattern still meets its threshold.

The other option is to restart counting from the contact date, so two new misses (or three in the year) would be needed. Tell me if you'd rather have that.

## Automatic entries (Tier 1 / Tier 2)
- **Tier 2** (one entry per missed meeting) already works this way. Each fresh miss is a new meeting, so it gets a new entry.
- **Tier 1** has a gap today. An unbroken streak (May, Sep, then Dec) keeps the same key, so a fresh miss after the contact would **not** create a new entry. The fix:
  - Once a contact acknowledges an escalation, the next escalation for that member gets a new key tied to the fresh meeting (`t1c:<start>:<meeting>` and `t1y:<year>:<meeting>`).
  - Existing keys are kept, so nothing that is already logged will be duplicated.
  - Escalations whose triggering misses are all on or before the acknowledgment date are not created at all.
- Dismissing a system entry does **not** count as acknowledgment. Only a real contact does.
- Digest lines about overdue follow-ups are unchanged: a newer contact already clears them.

## Technical section
- `src/lib/almonerAbsencePattern.ts`: `computeCheckInFlags(..., ackByMember?)` applies the fresh-miss rule.
- `supabase/functions/_shared/almonerAutoLog.ts`: `evaluateAutoLog(..., acks?)` handles the ack-aware suppression and re-keying. The KPI Disengagement Risk keeps calling it without acks, so the dashboard still reflects attendance, not Almoner activity.
- `AlmonerPortal.tsx`: passes each member's latest real `contact_date`, which is already loaded.
- `almoner-overdue-check`:
  - Computes the acknowledgment dates from the welfare log rows it already reads.
  - Applies them to the "last two meetings" line, the check-in line and the auto-log.
  - The badge logic is reused from the shared module so the board and the digest can't drift apart.
- **Tests (unit):**
  - The contact clears the badge and the digest lines.
  - A fresh miss after the contact brings them back.
  - Attending after the contact keeps them silent.
  - A Tier 1 re-escalation gets a new key, and no duplicate is created on rerun.
  - System entries and deleted entries don't acknowledge anything.
  - The Widows register is ignored.
- **Other checks:**
  - A dry run against live data, with no inserts.
  - 320px mobile check.
  - Full test suite.
  - Rolled-back role checks: Almoner, Secretary and admin can log the contact; WM, IPM and ordinary members cannot.
