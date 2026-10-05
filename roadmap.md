- [x] Build dedicated Committee Agenda editor and verify the 11 January 2027 PDF.

- [x] Optimize 15 flagged web images, correct APGM formats, update Thames social image, and report size results.

- [x] Treasurer reports: monthly periods (I&E, Balance Sheet) + account drill-down to journal entry

## Subscriptions split (Sep 2026)
- [x] Retire Master's Fund; Relief Chest share to 2200
- [x] Direct Receipt three modes
- [x] Treasurer Preview→Post accrual tool + exemption lookup (latest holder)
- [x] Fund-code picker on General Journal
- [x] Under-25 correction everywhere (dues calc, JoinUs, FAQ, others)
- [x] Restructure #128 credits per member (debits untouched); age check report

## Treasurer mobile layout audit (Sep 2026)
- [x] Verify and fix Direct Receipt at 320px across all five modes
- [x] Verify and fix New Member Fees at 320px
- [x] Verify and fix Year End at 320px
- [x] Verify and fix General Journal at 320px
- [x] Run the full test suite and confirm a clean preview build

## Enforced portal mobile regression standard
- [x] Add the 320px verification rule to AGENTS.md
- [x] Add route-driven automated browser overflow coverage for Treasurer and Secretary tools
- [x] Establish or document the safest reliable authenticated test-session mechanism
- [x] Include the browser check in the normal test command
- [x] Run the full suite and confirm a clean build

## Provincial Installation Return restyle
- [x] Match the supplied Province form's typography, tables, spacing, and three-page structure
- [x] End page 1 immediately after the Organist and Tyler notes
- [x] Start page 3 with the Past Masters section
- [x] Validate and visually inspect both Word and PDF output
- [x] Run the full unit and 320px portal test suite

## Automated officer digests
- [x] Almoner overdue digest: daily 06:00 UK (hourly cron `0 * * * *` + Europe/London guard), recipient = current Almoner, ?force=1 to re-send.
- [x] Secretary "missing Grand Lodge number" digest (secretary-ugle-reminder): monthly 07:00 UK on the 1st (hourly cron `10 * * * *` + Europe/London guard), active initiated members with blank ugle_reg_number, oldest first; recipient = current Secretary (role fallback); skips when empty; ?dry_run=1 previews, ?force=1 sends now. Links to /members/admin#member-<id>, where admin/Secretary/WM edit the number inline.

## Dietary requirements + bulk import (Oct 2026)
- [x] Private profile dietary field (My Profile, Member Admin, Festive Board table-plan fallback, booking pre-fill)
- [x] CSV member import (admin + Secretary), fill-blanks only, preview first
