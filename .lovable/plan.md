# Widows Register — Phase 2 (Gift tracking + Almoner's report)

## What I found

**Charity Steward collections log** (`charity_collections`): one row per collection with date, optional link to the meeting (`lodge_event_id`), type (`charity_column`, `raffle`, `ad_hoc`, `relief_chest`, `other`), gross, costs, net (auto-calculated), banked date/by and a journal link. There are currently 6 rows (4 raffles, 2 charity column), all from 15 Oct 2025. There is no "Christmas raffle" type — the Christmas meeting raffle is simply a `raffle` row linked to that meeting.
Important: only Charity Steward viewers can read this table. The Almoner, Secretary and WM generally cannot, so a direct link would show them nothing.

**Existing Almoner Reports panel** (`ReportPanel.tsx`, table `almoner_reports`): pick a date range, it gathers welfare log, correspondence, referrals, absences, amber/red board and life events into a frozen snapshot, builds a written report plus PDF, adds the Almoner's optional advice, and saves as draft or final. No AI is used today. The Minutes Generator uses a backend function calling the Lovable AI gateway and returns structured JSON.

## Module 3 — Annual gift tracking

- New table `almoner_widow_gifts`: widow, officer (lodge) year, gift type (hamper / cheque / voucher / other + free-text description), amount (only for cheque/voucher/other, must be positive), date sent, optional funding collection, notes, logged by.
- Funding link: optional reference to a `charity_collections` row. Because Almoner users can't read that table, a narrow read-only lookup will list only **raffle** collections (date, meeting title, net amount, and total already allocated to gifts) to anyone who can view the Almoner portal. No change to Charity Steward access rules. Raffles are pre-sorted with the Christmas/December meeting raffles first; others still selectable.
- Access: view via `can_view_almoner`, add/edit/delete via `can_edit_almoner` (gifts are deletable for correcting mistakes, like contacts).
- UI: a "Gifts" section on each widow's record, under Next of kin / Contact log, with a one-line history ("Hamper 2024 · Cheque £50 2025") and the list in date order. WM sees it read-only.

## Module 4 — Almoner's report: widows section

Extends the existing Reports panel, not a new tool:
- New "Widows" step in the same panel, using the report's existing date range. Default "from" date = end of the last **final** Almoner report, falling back to the last meeting date; still editable.
- "Draft widow updates" button sends that period's contact log entries (and gifts sent in the period) to a new backend function `almoner-widow-report`, which checks `can_view_almoner`... and actually `can_edit_almoner` (drafting is for those who save reports; WM can still read saved reports). It uses the Lovable AI gateway, returning one short line/paragraph per widow with something new; widows with no entries in the window are never sent to the AI and never listed.
- The Almoner can edit the draft lines; they're saved inside the report's snapshot and appear as a "Widows & Dependants" section in the written report and PDF.
- Only first names/preferred address and contact notes go to the AI; no addresses, phone numbers, dates of birth or next-of-kin details.

## Checks

- Rolled-back tests as Almoner, Secretary, admin (read/write), WM-only (read-only, save/draft refused), IPM and ordinary member (refused), including the raffle lookup and the drafting function.
- Unit tests for gift history formatting and the "since last report" date; 320px checks for the gifts form, the WM read-only view and the widows report step; full suite.

## Technical details

- Migration: `almoner_widow_gifts` (+ GRANTs to authenticated/service_role, RLS, updated_at trigger, CHECKs on type/amount); `get_almoner_raffle_collections()` SECURITY DEFINER, gated by `can_view_almoner(auth.uid())`, raffle rows only.
- Edge function `almoner-widow-report`: JWT validated in code, RPC `can_edit_almoner`, fetch widows + contacts + gifts in range server-side, structured JSON output, 30s timeout, handle 402/429.
- `almoner_reports.snapshot` gains a `widows` array; older reports without it render unchanged.
- Daily Almoner digest email unchanged.
