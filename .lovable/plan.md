## Lodge KPI Dashboard

A new admin-section page that pulls live figures from `profiles` plus a handful of new fields, broken into 7 always-visible sections (collapsible on mobile), with two PDF exports.

### Access

- Visible to users with `admin` role OR `secretary` role OR currently appointed Worshipful Master (via `officer_appointments` for the current Masonic year, position_key = `wm`).
- New nav entry "KPIs" inside the members portal, between Meetings and Admin.
- Route: `/members/kpis`, guarded by `ProtectedRoute` with a role check.

### Database changes (one migration)

Add to `public.profiles`:

- `is_ugle_portal_registered boolean NOT NULL DEFAULT false`
- `passing_date date` (FC)
- `raising_date date` (MM)
- `joined_lodge_date date` (date joined Weybridge from another lodge — distinct from initiation)
- Extend `profile_status` enum with `year_out`, `resigned`, `excluded`, `deceased` (keep existing `pending`, `active`, `suspended`).

New tables (all with grants + RLS, admin/secretary write, members read):

- `member_wm_terms(id, member_id, year_started int, year_ended int, notes)` — supports repeat Masters.
- `succession_risks(id, role_key text, note text, flagged_by, flagged_at)` — Secretary free-text flag per critical role (`secretary`, `treasurer`, `almoner`, `dc`).
- `app_role` enum: add `secretary`.

Admin > Members form gains inputs for: UGLE Portal registered, passing date, raising date, joined-lodge date, status dropdown (full set), and a "WM terms" sub-section (year list).

### Computation (client-side, single fetch)

One `useKpis()` hook does a single `select *` from profiles plus joins for `member_wm_terms`, `officer_appointments` (current Masonic year), `user_roles`, `succession_risks`. Derives:

- Subscribing = status `active` AND not honorary.
- Average age from `date_of_birth`.
- Age bands: <30, 30-39, 40-49, 50-59, 60-69, 70-79, 80+.
- Last Initiation: max `initiation_date`; group same-date count → "double / triple / quadruple…".
- Royal Arch %: `is_royal_arch` over subscribing.
- Light Blues: subscribing AND not Royal Arch.
- Movement (rolling 12 months from today):
  - In: initiations (initiation_date in range), joiners (joined_lodge_date in range AND initiation_date outside range or null).
  - Out: status changes — derived from a new `profile_status_history` table written by a trigger so we can date `resigned/excluded/deceased`. Year Out shown as separate line, not counted in net.
- UGLE %: registered over Active subscribing (excludes year_out/resigned/excluded/deceased). List of unregistered Active members.
- RA conversion: Light Blues with `raising_date <= today - 1 month`, sorted oldest raising_date first, with months-eligible computed.
- Milestones (current Masonic year = Oct→Sep):
  - Initiation anniversaries 10/25/30/40/50.
  - WM anniversaries 25/30/40 (from earliest `member_wm_terms.year_started`).
  - Birthdays in next 30 days (uses date_of_birth month/day).
- Officers & succession:
  - Pull existing progressive positions from `officer_positions` + current-year `officer_appointments` → filled vs vacant counts.
  - Critical roles (`secretary`, `treasurer`, `almoner`, `dc`): show successor flag from `succession_risks` with editable note (Secretary inline edit).
- Pipeline:
  - Candidates = a new `candidates` table? No — keep scope tight: re-use `profiles.status = 'pending'` AND no `initiation_date` as "Candidate awaiting Initiation".
  - EA not Passed = degree `entered_apprentice` AND `passing_date IS NULL`.
  - FC not Raised = degree `fellow_craft` AND `raising_date IS NULL`.
  - Funnel = horizontal stepped bar.

### UI

- File: `src/pages/members/Kpis.tsx`, uses `MembersLayout`.
- Sections rendered as cards on dark navy with gold-border accents, Playfair Display headings, Inter body — matches existing portal pages.
- Bar/funnel charts via lightweight SVG (no extra deps) to stay consistent with current bundle.
- `<details>` collapsible wrappers on `md:` and below; always-open on desktop.
- Two buttons in the header: **Export VO Report** and **Export Full KPI Summary**.

### PDF export

- Use `jspdf` + `jspdf-autotable` (add deps).
- VO Report: replicates the Surrey St Andrew Group "Membership Snapshot" table — single page, header with Lodge name & number (6787), date, and the Section 1 rows in their original table layout.
- Full KPI Summary: multi-page, all 7 sections with tables and the funnel rendered as text bars; footer with generation timestamp and Secretary's name.
- Both saved client-side via `doc.save(...)`.

### Files

Created:
- `src/pages/members/Kpis.tsx`
- `src/lib/kpis.ts` (data fetch + derivations, pure functions for testability)
- `src/lib/kpiExports.ts` (PDF builders)
- One new migration

Edited:
- `src/App.tsx` (route)
- `src/components/members/MembersLayout.tsx` (nav link, role gate)
- `src/components/members/ProtectedRoute.tsx` (allow secretary/wm)
- `src/pages/members/Admin.tsx` (new profile fields in form + status dropdown + WM terms editor)
- `supabase/functions/admin-invite-member/index.ts` (accept the new fields)

### Out of scope (flag for follow-up)

- A dedicated `candidates` table with full prospect tracking — using `profiles.status='pending'` for now.
- Email reminders for milestones/RA conversion — dashboard only.
- Historical movement before today (relies on trigger going forward; back-fill needs a one-off script if you want full 12 months from go-live).
