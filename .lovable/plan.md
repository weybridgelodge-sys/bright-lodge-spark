# Almoner digest: daily checks, weekly email

## What stays daily (6am UK, unchanged)
- Tier 1 / Tier 2 automatic Welfare Log entries are still created the same morning.
- The Welfare Board "worth a call?" badge and "System flag" marker are live on the page, so they don't depend on the email at all.
- Birthday / anniversary push notifications still go out on the day, because a birthday message sent days late is pointless.

## What changes
The summary email is sent **only on Mondays at 6am UK time**. On other days the check runs but sends no email.

## What the Monday email contains
1. **Still open now.** This is a snapshot taken on Monday morning:
   - overdue follow-ups
   - missed-last-two-meetings lines
   - "worth a call?" lines

   It uses the same rules as today, including the rule that a real welfare contact silences them. Anything already dealt with during the week won't appear.
2. **New system entries since the last email.** These are all automatic entries created after the previous digest was sent, not just today's. Entries the Almoner has already dismissed are left out. Each entry shows the date it was created.
3. **Memorable dates.** This lists birthdays and anniversaries since the last email, plus the coming 7 days. The push still covers each one on the day itself.
4. The email is skipped if all three sections are empty.

## How "since the last email" is decided
- The date of the last email is taken from the existing record of sent emails: the most recent successful send of the Almoner digest.
- **First run, or no record found:** look back 7 days.
- **Look-back cap:** if a week's email failed, the next one still covers everything since the last one that actually went out, up to a 35-day limit.
- **Duplicate protection:** a key based on the week is used, so a rerun on the same Monday can't send the email twice.
- **Manual sends:** a manual "send now" is still available for ops, and it uses the same "since last email" window.

## Day of the week
Monday is the default. The day is a single setting in the check, so Julien can name a different day and it's a one-line change.

## Checks
- Unit tests:
  - the "since last" window: no record, normal week, a failed week, and the 35-day cap
  - the email is sent only on the chosen weekday
  - dismissed entries are excluded
- A dry run against live data, with no inserts and no email.
- Email preview check of the updated template.
- No portal screens change, so a 320px check is only needed if the template wording shown in the portal changes. The existing mobile suite still runs anyway.
- Full test suite.

## Technical section
- `almoner-overdue-check/index.ts`:
  - The detection and insert flow stays as it is.
  - Add a `DIGEST_WEEKDAY = 1` gate, worked out from the Europe/London date, wrapped around the email send.
  - Read `email_send_log` (template `almoner-overdue-digest`, status sent, latest `created_at`) to find the start of the window.
  - Query `welfare_log_entries` where `is_system`, `deleted_at is null` and `created_at >= window start`.
- `celebrations.ts`: add range detection (window start through today + 7).
- `almoner-overdue-digest.tsx`:
  - Change the heading to "Weekly Almoner summary".
  - Add a "New since last summary (date)" section with the date of each entry.
  - Add an "Upcoming dates" list.
- Pure window/weekday helpers go in `_shared/` with tests in `src/test/`.
- Update the Almoner `AGENTS.md` rule: daily detection, weekly email.
