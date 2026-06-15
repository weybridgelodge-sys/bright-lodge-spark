## Progressive Officers Tracker

A new section inside the existing member portal at `/members/officers-tracker`, restricted to members holding the new `secretary` or `worshipful_master` roles (admins also allowed). Styled with the existing dark navy + gold + Playfair Display + cream theme.

### Backend (Lovable Cloud)

New role values added to `app_role` enum: `secretary`, `worshipful_master` (alongside existing `member`, `admin`).

New tables (all RLS-protected; only `secretary` / `worshipful_master` / `admin` may read or write):

1. **`officer_positions`** — the six progressive offices, ordered:
   - `key` (text PK): `inner_guard`, `junior_deacon`, `senior_deacon`, `junior_warden`, `senior_warden`, `worshipful_master`
   - `label`, `order_index`
   - Seeded once.

2. **`officer_appointments`** — who holds which office, and for which lodge year:
   - `position_key`, `member_id` (FK profiles), `lodge_year` (int, e.g. 2026), `appointed_on`, `is_projection` (bool), `override_reason` (text, nullable), `override_by` (FK profiles, nullable), `created_at/updated_at`.
   - Unique on `(position_key, lodge_year)`.
   - Current year rows have `is_projection = false`; projections for years +1…+6 have `is_projection = true`.

3. **`member_progression_status`** — readiness tagging:
   - `member_id` (PK FK profiles), `readiness` enum (`ready`, `needs_experience`, `non_progressive`), `seniority_initiation_date` (date, nullable — override for joining members whose UGLE initiation was elsewhere), `seniority_tiebreaker` (int, nullable — manual precedence when two brothers share an initiation date), `notes`, `updated_by`, `updated_at`.

4. **`profiles` additions** — add `initiation_date date` column (nullable). Form in Profile + Admin lets the Secretary edit it.

Helper SQL function `effective_initiation_date(profile_id)` returns `coalesce(seniority_initiation_date, profiles.initiation_date)` for seniority sorting.

### Frontend

New menu link "Officers Tracker" appears in `MembersLayout` only when the user has Secretary, WM, or Admin role.

Page `src/pages/members/OfficersTracker.tsx` with three tabs:

1. **Current Year Board** — six office cards in progression order showing holder name, year appointed, years in office. Vacant offices rendered with an amber-outlined card and a "Vacant" badge.

2. **Progression Ladder** — a 7-column table (Current Year + Years +1…+6). Rows are the six offices. Each cell shows the projected holder. Algorithm: starting from the current year board, each subsequent year advances every officer one step up (Inner Guard → JD → SD → JW → SW → WM → off the top), with the bottom slot (Inner Guard) filled from the readiness panel queue (members tagged `ready`, sorted by effective initiation date, oldest first, then tiebreaker). Manual overrides (a row in `officer_appointments` for a future year) lock that cell and display a gold flag with the reason + Secretary name. Warnings render at the top: vacant feeder offices, duplicate initiation dates among ready members, gaps in projection. Export-to-PDF button (`@react-pdf/renderer` or the existing reportlab-style approach via `pdf-lib` in the browser) produces a styled landscape PDF with the lodge crest, all 7 years, names, overrides, and warnings.

3. **Member Readiness Panel** — list of all active members NOT currently holding a progressive office, sorted strictly by effective initiation date ascending. Columns: full name, initiation date, current rank, years of membership, readiness tag (editable select). A "Promote to ladder" action lets the Secretary insert a `ready` member into the next available Inner Guard slot for a chosen year (drag-and-drop via `@dnd-kit/core`, with a click-fallback select). Inserting respects seniority — the UI warns if the chosen position violates initiation-date order.

All mutations capture `updated_by = auth.uid()` so overrides display the Secretary's name.

### Technical Details

- Migration order: enum extension → `profiles.initiation_date` column → new tables with GRANTs (authenticated only; no anon) → RLS policies using `has_role(auth.uid(), 'secretary' | 'worshipful_master' | 'admin')` → seed `officer_positions` → `effective_initiation_date` SQL function → updated_at triggers.
- Reuse existing `useAuth` hook; extend it to expose `isSecretary` / `isWorshipfulMaster` booleans derived from `user_roles`.
- Projection logic lives in a single pure function `computeProjection(currentBoard, readyQueue, overrides, years=7)` so it's unit-testable and used by both the Ladder view and the PDF export.
- PDF: use `@react-pdf/renderer` (works in-browser, easy to style with Playfair Display via Google Fonts, matches existing brand).
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`.

### Out of scope

- No changes to existing public site or other member pages beyond the nav link and an `initiation_date` field on Profile/Admin edit forms.
- No email notifications.
- No historic year archive view (current + 6 future years only, per spec).

### Confirmations needed before build

1. The six offices listed are the complete progressive ladder for Weybridge Lodge — no Chaplain, Almoner, DC, or Stewards included in the *progressive* path? (They can still appear in the Officers public page; they just don't form part of this projection.)
2. OK to add `initiation_date` to the `profiles` table (Secretary fills it in for existing members)? Otherwise we can't compute seniority.
3. Should the Worshipful Master have **edit** rights, or **read-only** access to the tracker? (Spec says "accessible to" both — I'll default to both can edit unless you'd prefer WM read-only.)
