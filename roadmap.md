- [x] Build dedicated Committee Agenda editor and verify the 11 January 2027 PDF.

## Three degrees article SEO
- [x] Update search metadata and static head without changing existing article copy; add closing links and inline cross-link.
- [x] Verify headings, schema, raw HTML generator, 320/1280px layout and both links; 188 unit and 60 browser tests passed, preview build OK.

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
- [x] Almoner two-tier access: Almoner/Secretary/admin edit, current WM read-only, IPM removed.
- [x] Secretary "missing Grand Lodge number" digest (secretary-ugle-reminder): monthly 07:00 UK on the 1st (hourly cron `10 * * * *` + Europe/London guard), active initiated members with blank ugle_reg_number, oldest first; recipient = current Secretary (role fallback); skips when empty; ?dry_run=1 previews, ?force=1 sends now. Links to /members/admin#member-<id>, where admin/Secretary/WM edit the number inline.

## Dietary requirements + bulk import (Oct 2026)
- [x] Private profile dietary field (My Profile, Member Admin, Festive Board table-plan fallback, booking pre-fill)
- [x] CSV member import (admin + Secretary), fill-blanks only, preview first

- [x] MMH Number field
- [x] Rose Croix Number field

## Public content consistency (part 3a)
- [x] Update public member ages, ballot sequence and degree timings only; report changed lines and CMS/ambiguous findings.
- [x] Verify six public pages; 159 unit tests and 60 browser tests passed; preview build OK.

## Member Admin portrait names
- [x] Replace fragile mobile table boxes with ordinary stacked elements, wrap actions and constrain the portal header; populated touch-emulated 320/360/390px rows and desktop visually verified, 221 unit and 64 browser tests passed (1 existing skip); no backend changes or publishing. Physical installed-app rendering remains unverified.
- [x] Fix stacked narrow-screen member rows without changing permissions
- [x] Add populated admin/Secretary name-readability regressions and inspect portrait/desktop
- [x] Run the full suite and check preview errors (119 unit, 58 browser; build OK)
- [x] Almoner Auto-Log: per-meeting Disengagement Risk fix + automatic system Welfare Log entries (Tier 1/Tier 2) in digest
- [x] Almoner contact acknowledges "worth a call?", missed-meetings digest line and Tier 1/2 auto-log until a fresh miss
- [x] Almoner digest email weekly (Mondays); detection stays daily
- [x] Welfare Board sort: worth-a-call badge, then RAG worst-first, then surname/first name
- [x] KPI Summary PDF: keep sections 1–7 together; visually checked regenerated long-Outstanding and RA-boundary exports; 155 unit and 60 phone-width checks passed
- [x] KPI Summary PDF header: centred crest, dashboard title/year subtitle and spacing; actual export regenerated with 22 synthetic members, all 3 pages visually checked (no overlap/clipping), 155 unit and 60 phone-width tests passed. Live signed-in verification unavailable because session minting could not match the requesting account.
- [x] KPI Summary PDF: centred navy Page X of Y with gold rule; regenerated all 3 pages and visually checked (no overlap/clipping); 155 unit and 60 phone-width tests passed, build OK.

- [x] Event Accounts subledger: fixed budget lines, booking-driven actuals, real Stripe fees (incl refund/dispute), events payouts + allocations, events Stripe balance, tie-out (cash awaiting banking), remove 4120 wording

## Public event calendar integration
- [x] Tidy public event address wrapping without changing stored values; checked 360/390/430px, landscape and desktop.
- [x] Include upcoming published public events once in website calendar and member ICS/calendar, preserving overnight times and existing matching UIDs.
- [x] Verify December 19 links at 390px (live public reads; isolated member identity and actual handler output), 320px portal regression; 228 unit and 67 browser tests passed, preview build OK. Calendar feed deployed; no real record writes or website publication.

## Dinner & Festival stage 2
- [x] Migration: event_type/modules/payment/fee/SEO columns, five content tables, read/write helpers, duplicate_event_content()
- [x] event-content-images bucket (private, 5 MB, public read for published events) and write policies
- [x] Admin module panels in the Public Events editor
- [x] Duplicate copies module fields and content atomically
- [x] Hide back-to-top on /events/:slug
- [x] Rolled-back permission checks (anon, member, Treasurer, Secretary, Admin) and tests
