# Single sources for officers, representatives and meeting pattern (Summons Builder area)

Principle: one source per fact, unit-aware, nothing lodge-specific in code, SQL or migrations. Plan only; nothing changed.

## What I found (code + live data, read 22 Oct 2026)

**1. Officer Roll dashes**
- `src/pages/members/SummonsBuilder.tsx` `loadOfficers()` (~line 403) selects `officer_appointments` with `.eq("lodge_year", fetchOfficerYear())` only, and its own hard-coded list of 25 keys. No carry-forward, no projection filter (it would also pick up projected rows).
- Live: `current_officer_year()` = 2026 (Installation 21 Oct 2026). Year 2026 has 4 confirmed rows (WM, JW, SD, JD) plus 8 projected ones; all non-progressive confirmed rows are 2025. So IPM, Chaplain, Treasurer, Secretary, Asst Sec, DC, ADC, Almoner, Charity Steward, Mentor, MO, Tyler, Asst Tyler and SW/IG/Senior Steward show blank.
- The same roll feeds the Print Preview and the generated summons PDF (`src/lib/summonsPdf.tsx`, `SummonsPrintPreview.tsx`), so those inherit the gap.
- `src/lib/installationReturn.ts` `resolveContinuingOffice()` (this year, else latest earlier row with a member; Almoner stays vacant if its latest row is empty) and `resolveLadderOffice()` already exist; `src/lib/provincialReturn.ts` uses both. The database `current_officer_holder()` follows the same "latest confirmed, carried forward" rule.
- Year labelling: 2025 vs 2026 is not a bug in itself. `lodge_year` is the Installation year; 2025 rows are the officers installed Oct 2025 and they correctly carry forward until 2026 rows are confirmed. The only wrong result is the Summons screen's exact-year match. One caution: confirmed 2026 WM/JW/SD/JD exist but SW does not (only projected), so after the change SW would show the 2025 holder carried forward unless a ladder rule is used (see open question 1).
- `installationReturn.ts` itself hard-codes `LODGE_NAME`, `LODGE_NUMBER`, `LODGE_EMAIL_DOMAIN`; `provincialReturn.ts` falls back to a literal consecration date and builds `secretary@<domain>`. Flagged here; fixed in step 7.

**2. Meeting pattern**
- Typed text: `lodge_template.regular_meeting_pattern` = "3rd Wednesday in February, 2nd Wednesday in May, 3rd Wednesday in October (Installation) and 2nd Wednesday in December."
- `meeting_series` is empty (0 rows). Its admin UI already exists: Members > Admin > Meeting Diary (`/members/admin/diary`, `src/pages/members/admin/MeetingDiary.tsx`, "Per-month schedule" panel, `saveSchedule()` writes one active row with `schedule` jsonb of `{month, ordinal, weekday, meeting_type}`). It currently shows an inferred schedule from existing meetings (`inferSchedule` in `src/lib/meetingDiary.ts`) until saved.
- Readers of the typed text: `summonsPdf.tsx` ("Regular Meetings" block), `provincialReturn.ts` (`meetingPattern`). Public site `src/pages/LodgeProfile.tsx` lines 12-23 hard-codes the four meetings and "Meeting Day: Wednesday". `InstallationReturn.tsx` line 237 hard-codes "(3rd Wednesday in October)".

**3a. Representatives typed names**
- `lodge_template.lodge_representatives`: Petitions has member + typed name; Sports (member linked) and Halls (member linked) both have empty names. `royal_arch_rep` text + `royal_arch_rep_member_id` (same member as Petitions).
- Correction to the premise: the Provincial return (`buildRepRow`) already prefers the linked member, so Sports/Halls rows print there. The blank is on the Summons (`summonsPdf.tsx` ~line 622 prints `r.name` only) and the Royal Arch line prints typed `royal_arch_rep`.
- `honorary_members` is typed text ("W Bro C.G. Burgess PPAGReg") while `profiles.is_honorary_member` exists and is true for one member. Same duplication; included.

**3b. Officer positions**
- `officer_positions` columns: `key, label, order_index, is_progressive` (no unit_id, no group). Non-progressive list is also hard-coded in `src/lib/officersProgression.ts` `NON_PROGRESSIVE_ORDER`, used by `OfficersTracker.tsx` and the Summons roll. Other readers of `officer_positions`: `src/lib/kpis.ts`, `Directory.tsx`, `development/queries.ts`, `submit-enquiry`, `send-booking-emails`, `db-backup`.
- No "officer appointment letter" code found in `src/` or functions; if one exists outside, it must adopt the include rule below.

## Proposal

### Data model (additive only)
- `officer_positions`: add `category text not null default 'office'` (`office` | `representative`), `unit_id text null` (null = shared default list; a unit can add its own rows), `print_label text null` (short label for returns, e.g. "PET'NS REP"), `active boolean default true`, and `include_in jsonb default '{}'` per-consumer opt-in for representatives (keys: `summons`, `provincial_return`, `ugle_return`, `roll_ranking`, `progression`, `letters`).
- Include rule (one helper `positionsFor(consumer)` in `src/lib/officerPositions.ts`): offices are included everywhere they are today; representatives only where `include_in[consumer]` is true. Defaults for new representative rows: `summons` and `provincial_return` true, all others false.
- Representatives appointments live in `officer_appointments` like any office (yearly rows, history, carry-forward via `resolveContinuingOffice`). Non-member holder: add nullable `officer_appointments.display_name text` used only when `member_id` is null.
- `lodge_template.regular_meeting_pattern` stays as manual override; add `regular_meeting_pattern_override boolean default false` so an empty or stale text never silently wins.
- `honorary_members` text: derived from `profiles.is_honorary_member`; text kept as non-member fallback only.
- Deprecation comments on `lodge_template.lodge_representatives`, `royal_arch_rep`, `royal_arch_rep_member_id` once readers switch (columns kept, never dropped).

### Shared derivations (one function each)
- `resolveOfficeRoll(year, consumer)` in `src/lib/officerRoll.ts`, wrapping the existing `resolveContinuingOffice` / `resolveLadderOffice` (moved, not copied; `installationReturn.ts` re-exports). Returns provenance `confirmed | carried | planned | computed | vacant` and `fromYear`.
- `memberDisplayName(profile, style)` reusing `formatMemberLineFormal` / Provincial `firstNames`/`surnameUpper`; typed name only when no member.
- `meetingPatternSentence(schedule)` in `src/lib/meetingDiary.ts`: sorted by month from the Installation month or by calendar (open question 3), "Nth Weekday in Month", "(Installation)" after installation months, commas and final "and", trailing full stop. With the inferred schedule it produces exactly: "3rd Wednesday in February, 2nd Wednesday in May, 3rd Wednesday in October (Installation) and 2nd Wednesday in December." "last" renders as "Last".
- A public read RPC `get_meeting_pattern()` (security definer, unit-scoped, returns sentence parts only) so the public Lodge Profile can read it without exposing `meeting_series`.

### Consumers that change
- Summons Builder Officer Roll tab, Print Preview, summons PDF: use `resolveOfficeRoll(year,'summons')`; carried rows show "(carried forward from 2025)" on screen; PDF prints the name normally (open question 2). Never blank when a previous confirmed holder exists; Almoner exception kept. Representatives block prints derived names.
- Summons Builder Template tab: pattern box becomes "Manual override" with a toggle and a live preview of the generated sentence; representatives and Royal Arch fields replaced with a link to the Officers screen; honorary members shows derived list.
- `provincialReturn.ts`: pattern from shared sentence; rep rows from `positionsFor('provincial_return')` matched by `print_label`; ORG (G) stays `key: null` (always blank); MO and LMO both keep `membership_officer`.
- `installationReturn.ts` (UGLE): uses `positionsFor('ugle_return')`, so representatives never appear; hard-coded "(3rd Wednesday in October)" text derived from the installation rule.
- `OfficersTracker.tsx`: non-progressive list from `officer_positions` (category office), plus a "Representatives" group at the bottom with add/rename/deactivate, yearly appointment, history and member link or non-member name. `NON_PROGRESSIVE_ORDER` kept only as ordering fallback.
- `kpis.ts`, `Directory.tsx`, `development/queries.ts`, roll ranking and progression: filter `category = 'office'` unless explicitly opted in.
- `LodgeProfile.tsx`: meetings list and "Meeting Day" from `get_meeting_pattern()`, with the current text as loading fallback only from the RPC (no literals).
- Meeting Diary: no behaviour change; adds the sentence preview next to Save.

### Migration approach (no data loss, no hard-coded values)
1. Additive columns above; mark existing rows `category='office'`.
2. Insert the four representative positions as shared defaults (generic labels only: "Royal Arch Representative", "Provincial Petitions Representative", "Masonic Sports Association Representative", "Masonic Halls Fund Representative", with return print labels). These are UGLE/Provincial form concepts, not lodge data; open question 4 if the WM wants these unit-owned instead.
3. Backfill appointments by query, not literals: for each unit's `lodge_template` row, read `lodge_representatives[*]` and `royal_arch_rep*`, match role text to position by keyword, insert `officer_appointments` for `current_officer_year()` with `member_id` or `display_name`, `on conflict do nothing`. Dry-run SELECT shown to the WM before applying.
4. Meeting series: not seeded by migration. The WM opens Meeting Diary, checks the inferred schedule and presses Save.
5. Readers switch; then deprecation comments.

## Order of work (small safe steps)
1. Extract shared resolver + tests; Summons roll uses it (fixes the dashes). No DB change.
2. `meetingPatternSentence` + tests; Summons/Provincial use series when saved, else override text; Template tab preview. WM saves the schedule.
3. Derived representative/Royal Arch/honorary names on the Summons (fixes blank Sports/Halls lines) using existing `member_id`s. No DB change.
4. Migration: position category/include/unit columns, appointment `display_name`; consumers filter by category.
5. Representatives group on Officers screen; dry-run then backfill; Provincial/Summons read appointments.
6. Public Lodge Profile and UGLE wording from shared sources; deprecation comments.
7. Remove remaining hard-coded lodge name/number/domain/consecration fallback from the return libraries (read from `lodge_template`/unit settings).

## Tests
- Unit: resolver carries 2025 non-progressive holders into 2026; ignores projections for continuing offices; Almoner empty-latest stays vacant; representatives excluded from UGLE/progression/ranking/letters and included in Provincial/Summons; sentence wording exact for the four-month case, single month, "last", installation marker; derived name prefers member over typed; ORG always blank; MO/LMO both filled; backfill keyword mapping; no lodge literals (grep test on touched files).
- RLS: ordinary member cannot write `officer_positions`/representative appointments; Secretary/admin can; `get_meeting_pattern()` returns only the sentence parts to anon.
- Browser 320px + axe (contrast on), 44px targets: Summons Builder Officer Roll and Template tabs, Officers Tracker with Representatives group, Meeting Diary, public Lodge Profile, Provincial Return page. Synthetic e2e identity only.

## What could break
- Summons layout grows if carried names fill previously blank rows (overflow plan in `summons.ts`).
- SW and stewards: carried vs ladder choice changes names shown before 2026 confirmations.
- Rep role text matching during backfill (keywords); dry-run mitigates.
- KPIs/Directory counting representatives as offices if a filter is missed.
- Public page shows nothing useful until the schedule is saved (fallback to override text).

## Open questions for the WM
1. Progressive offices on the Summons roll: show confirmed only, carried forward, or the Progression Ladder plan (as the returns do)?
2. Should "carried forward" appear on the printed summons, or only on screen?
3. Pattern order: calendar (Feb, May, Oct, Dec) as today, or Masonic year from Installation?
4. Representative positions: shared defaults for all lodges, or each lodge creates its own list?
5. Honorary members: always derived from member records, or allow non-member honorary text?
6. Who may edit representatives: same as officers (Secretary/admin), or also the WM?

## Technical details
- AGENTS.md: replace the existing officer-access rule's wording to add "representatives are officer_positions with category 'representative'; consumers opt in via positionsFor()" in the same line; no new lines.
- No changes to financial, register, PTP, booking or signature areas.
