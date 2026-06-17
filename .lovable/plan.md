## LOI Register — Build Plan

A new feature inside the members portal (Trestle section) to record Lodge of Instruction sessions, attendance, and parts taken — feeding the existing LOI KPI chart with real data.

---

### 1. Database (Supabase migration)

Three new tables in `public`:

**`loi_sessions`**
- `id` uuid PK
- `session_date` date (not null)
- `focus` text (not null) — one of: `first_degree`, `second_degree`, `third_degree`, `installation`, `general`, `other`
- `focus_other` text (nullable, used when focus = other)
- `kpi_category` text (nullable) — manual override tag: `oct_inst_prep`, `dec_degree_prep`, etc. Auto-derived if null.
- `notes` text (nullable)
- `created_by` uuid → auth.users
- `created_at`, `updated_at`

**`loi_attendance`**
- `id` uuid PK
- `session_id` uuid → `loi_sessions(id)` on delete cascade
- `member_id` uuid → `profiles(id)`
- `part` text (not null) — enum-like: `candidate`, `inner_guard`, `junior_deacon`, `senior_deacon`, `junior_warden`, `senior_warden`, `worshipful_master`, `director_of_ceremonies`, `ipm`, `chaplain`, `observing`, `other`
- `part_other` text (nullable, used when part = other)
- `created_at`
- UNIQUE (session_id, member_id) — one row per member per session
- UNIQUE (session_id, part) WHERE part NOT IN ('observing','other','candidate') — prevents two members assigned the same office (candidate/observing/other can repeat)

**RLS / GRANTs**
- `loi_sessions`: all active members can SELECT; INSERT/UPDATE/DELETE restricted to admins, secretaries, worshipful_masters, plus a new `director_of_ceremonies` role.
- `loi_attendance`: members can SELECT their own rows + any row if active member (we'll allow all active members to see attendance, matching directory transparency); write access matches sessions.
- GRANT statements for `authenticated` and `service_role`.

**New role**: add `director_of_ceremonies` to the `app_role` enum so DC can manage the register without being a full admin.

---

### 2. Auth hook update

Add `isDC` / extend `canManageProgression`-style flag `canManageLOI = isAdmin || isSecretary || isWorshipfulMaster || isDC` in `useAuth.tsx`.

---

### 3. New routes (under `/members/trestle/loi-register`)

- `LoiRegister.tsx` — list of past sessions (date, focus, attendance count). "New Session" button for managers.
- `LoiSessionForm.tsx` — create/edit form: date picker, focus dropdown (+ "Other" text), optional KPI category dropdown, notes, then a table of active members with attendance checkbox + part dropdown. Validates one-part-per-member and one-member-per-office.
- `LoiSessionDetail.tsx` — read-only detail view showing all attendees and parts; "Edit" button for managers.

Plus a "My LOI Attendance" panel on the member Dashboard / Profile showing the logged-in member's sessions attended this Masonic year (Oct–Sep) with parts taken and a running total.

Register route added to the Trestle nav inside `MembersLayout`.

---

### 4. KPI wiring

Update `src/lib/kpis.ts` to derive LOI attendance from `loi_sessions` + `loi_attendance` instead of estimated figures:
- Auto-categorise sessions: if `kpi_category` set, use it; otherwise bucket by month proximity to nearest scheduled degree/installation meeting from `lodge_events`.
- Compute attendance % per session and per category.
- Per-member breakdown rolls up parts taken.

`AttendanceCharts.tsx` (or the LOI-specific chart) consumes the new query.

---

### 5. Style

Match existing members portal: navy/gold tokens, shadcn `Card`, `Table`, `Checkbox`, `Select`, `Calendar` (with `pointer-events-auto`). No new colors.

---

### Technical notes
- Default KPI auto-grouping uses `lodge_events` (already in DB) — find nearest meeting within ±21 days and tag accordingly.
- Edit access shown only to users with manage permission; everyone else sees read-only.
- Form uses react-hook-form + zod for validation.
- Migration is a single call; code that reads new tables is written after the migration runs and types regenerate.

---

### Out of scope for this pass
- Bulk import of historical LOI sessions (can add a CSV import later).
- Email reminders / push notifications for upcoming LOI.
- Exporting attendance to PDF.

Shall I proceed?
