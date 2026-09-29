# Year End stage 4: annual accounts sent with a summons

## Checks against existing summons behaviour (please answer 1–4)

I read the member summons sender and the summons link resolver. Nothing needs changing in the summons email log or in how summonses are marked sent. There are four places where behaviour could clash:

1. **Resending a summons that was already sent.** Each member's email has a fixed duplicate-guard key (`summons-{id}-{email}`). If you tick "attach accounts" on a summons that already went out, the email service treats every member's email as a repeat and quietly skips it, so the accounts never arrive. **Proposal:** show the toggle only on summonses that haven't been sent yet. The alternative is a separate duplicate-guard key when accounts are attached, but that would email every member the summons a second time.
2. **"Resend to selected members".** This path doesn't mark the summons as sent. **Proposal:** it includes the accounts link only if the summons originally went out with the accounts. It never records the accounts as sent, and it never sends accounts that the full send didn't include.
3. **Test sends.** **Proposal:** a test email includes the accounts link whenever the toggle is on, so the Treasurer sees exactly what members will get. It's still marked TEST and records nothing. I'm asking rather than deciding, as you asked.
4. **The branded link and the live site.** The new link would be `weybridgelodge.org.uk/accounts/{year}?k={uuid}`. That page only exists once the site is published. The main address also sits behind the four-hour Cloudflare cache. Before publishing, my round-trip test will call the link resolver directly and open the preview copy of the page. The real address will work after you publish.

## What gets built

- **Accounts link resolver.** A copy of the summons link resolver. The key is the approval record's unguessable ID, and each click creates a fresh download link valid for 7 days. It works in both JSON and redirect mode. It resolves only when the year is approved and the certified pack is stored. Otherwise it returns `not_ready` (409) with a plain message, in the same format as the summons one. The download is named `Weybridge-Lodge-Accounts-FY2025-26.pdf`.
- **Public page** `/accounts/:year`, mirroring the existing summons redirect page.
- **Summons Builder.** An "Attach FY2025/26 accounts, certified 15 Oct 2026" toggle. It appears only when a year is approved, its certified pack is stored, and it hasn't been sent yet. If more than one year qualifies, you pick the year from a list. The toggle is off by default.
- **Send confirmation.** When the toggle is on, the "Email to all members" confirmation names the summons number and meeting date, the accounts year and the certification date.
- **Email.** The summons email gets an optional second block below the summons button. It reads "Annual accounts: FY2025/26, certified [date]", with its own button, in the same navy and gold style as the summons block. It appears only when the accounts are attached.
- **Recording.** After a real full send with at least one delivery, the approval record stores when the accounts were sent and which summons they went with. This happens on the server, alongside the existing step that marks the summons as sent. Once recorded, it can't be overwritten.
- **Year End tab.** Each approved year shows "Accounts sent with Summons #N on [date]" or "Not yet sent — target: February [year+1] meeting". After February it shows a soft amber note. After May it shows a stronger red note. The due months are fixed from your meeting cycle (Feb, May, Oct, Dec).

## Verification

- Deploy both functions.
- Send a test email to julientidmarsh@pm.me with the accounts attached. This needs a real approved and stored pack. None exists yet (no year is approved), so the test will use a copy made for the trial and then removed. I won't touch the real approval data or email any members.
- Check that both links resolve, and that a year that isn't ready returns `not_ready`.
- Check the Year End tab's "sent" display by applying the recording step to that trial copy.
- Run the full tests, type check and build. Nothing will be published.

## Technical details

- Migration: `treasurer_year_approvals.accounts_sent_at timestamptz`, `accounts_sent_with_summons_id uuid references summonses(id)`. The server function `record_accounts_sent` is called by the send function using its service role, and is write-once.
- `send-summons-email` accepts `accounts_approval_id`. The server re-checks that the year is approved, the pack is stored and it hasn't been sent. The template data gets `accountsUrl`, `accountsYearLabel` and `accountsCertifiedLabel`.
- New function `accounts-link`, with `verify_jwt = false` like `summons-link`.
- Pure helpers in `yearAudit.ts`: `accountsDistributionStatus(year, sentAt, today)` returns `sent`, `on_track`, `past_feb` or `past_may`, plus the list of years eligible to attach. Both have unit tests.
