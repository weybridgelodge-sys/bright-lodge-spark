## Member Development Module

A complete development record per member, viewable by the member (read-only) and editable by Mentors / Worshipful Master / Admin. Styled to match the existing members portal (navy/gold, Playfair headings, semi-transparent cards).

### Roles & access

- Add new role `mentor` to the existing `app_role` enum.
- Editing: `admin`, `worshipful_master`, `mentor` (only for members assigned to them).
- Viewing: each member can view their own record only.
- Admin / WM see all records.

### Section 1 — Member Profile

Pulled live from `profiles` (no duplication): name, initiation_date, passed_date (new), raised_date (new), royal_arch_date (new), grand_lodge_number (mapped from existing `ugle_reg_number` if present; otherwise added), proposer (new).

Two new editable fields stored on the development record itself:

- `assigned_mentor_id` — dropdown of active members.
- `previous_masonic_experience` — free text.

Where dates already exist on `profiles` they are reused; missing ones are added as nullable columns so the existing Members admin page can populate them.

### Section 2 — Mentoring Checklist

One row per checklist item per member. Items are seeded from a fixed catalogue (stage + topic, ordered), so every member auto-gets the full list on first open. Each row stores: target_date, completed_date, status (`not_started` | `in_progress` | `complete`), mentor_notes.

Stages and items use the exact wording from the brief (Pre-Initiation, EA, FC, MM, Royal Arch, Lodge Knowledge, General Masonic Development). Rendered as an accordion of stages with a progress bar per stage and overall %.

### Section 3 — Ritual Learning & Delivery Record

One row per ritual piece per member, seeded from a fixed catalogue (group + piece). Columns: date_first_learned, date_assessed, date_delivered_loi, date_delivered_lodge, notes.

Groups: Opening & Closing, Initiation, Passing, Raising, Installation, LoI Roles, Lodge Traditions — exact pieces from brief.

Editable only by `mentor` / `director_of_ceremonies` / `admin` / `worshipful_master`. Member sees read-only table.

### Section 4 — Offices & Appointments

Two sources, merged in the UI:

1. Live read from `officer_appointments` joined with `officer_positions` for the member — shown as auto rows (not editable here; managed via the existing Officers Tracker).
2. A new `member_external_appointments` table for Provincial / UGLE / other appointments added manually: office, masonic_year, date_appointed, date_installed, level (`lodge` | `province` | `ugle`), notes.

### Mentor Dashboard

New tab inside Admin → Member Development for users with `mentor` role (or admin/WM seeing all). Table of assigned members: name, current degree, checklist % complete, last check-in date (most recent `completed_date` across checklist), overdue items count (target_date < today and not complete) highlighted amber. Row click → full record.

### PDF Export

"Export PDF" button on each record. Uses the same layout primitives as the Almoner Report (`SummonsPrintPreview` / `summonsPdf` patterns): lodge crest header, gold section headers, confidentiality footer. Sections: Profile, Mentoring Checklist (grouped by stage with status icons), Ritual Record table, Offices table.

### Routes & navigation

- `/members/development` — for the current member, shows their own record.
- `/members/development/:memberId` — admin/WM/mentor view of a specific member.
- `/members/admin/development` — mentor dashboard + member picker.
- Links added to `MembersLayout` sidebar (member sees "My Development", staff see "Member Development").

### Files to create

```
src/pages/members/development/MyDevelopment.tsx
src/pages/members/development/MemberDevelopment.tsx      // by :memberId
src/pages/members/development/MentorDashboard.tsx
src/components/members/development/ProfileSection.tsx
src/components/members/development/MentoringChecklist.tsx
src/components/members/development/RitualRecord.tsx
src/components/members/development/OfficesRecord.tsx
src/components/members/development/ExportPdfButton.tsx
src/lib/development/catalogues.ts                        // checklist + ritual seed lists
src/lib/development/queries.ts                           // typed Supabase reads/writes
src/lib/development/pdf.tsx                              // react-pdf document
```

### Database (single migration, with GRANTs + RLS)

```text
ALTER TYPE app_role ADD VALUE 'mentor';

ALTER TABLE profiles
  ADD COLUMN passed_date date,
  ADD COLUMN raised_date date,
  ADD COLUMN royal_arch_date date,
  ADD COLUMN proposer text;

CREATE TABLE member_development_records (
  member_id uuid PK -> profiles.id,
  assigned_mentor_id uuid -> profiles.id,
  previous_masonic_experience text,
  created_at, updated_at
);

CREATE TABLE member_checklist_items (
  id uuid PK, member_id uuid, stage text, topic text, order_index int,
  target_date date, completed_date date,
  status text check in (not_started,in_progress,complete),
  mentor_notes text, updated_at, updated_by uuid,
  UNIQUE(member_id, stage, topic)
);

CREATE TABLE member_ritual_records (
  id uuid PK, member_id uuid, ritual_group text, piece text, degree text, order_index int,
  date_first_learned date, date_assessed date,
  date_delivered_loi date, date_delivered_lodge date,
  notes text, updated_at, updated_by uuid,
  UNIQUE(member_id, ritual_group, piece)
);

CREATE TABLE member_external_appointments (
  id uuid PK, member_id uuid, office text, masonic_year text,
  date_appointed date, date_installed date,
  level text check in (lodge,province,ugle), notes text,
  created_at, updated_at
);

-- helper: can_edit_development(_editor, _member)
--   admin OR worshipful_master OR (mentor AND assigned_mentor_id = _editor)
```

RLS:

- SELECT: own record OR `can_edit_development(auth.uid(), member_id)`.
- INSERT/UPDATE/DELETE: `can_edit_development(...)` only.
- Ritual record UPDATE also allows `director_of_ceremonies`.

GRANTs: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role` on all new tables.

Seeding on first access is done client-side via upsert of the catalogue (idempotent thanks to UNIQUE constraints) so we never duplicate rows.

### Out of scope

- No new email infra or auth changes.
- No edits to existing Officers Tracker behaviour — only read from it.
- No changes to Almoner module; only its PDF style is reused.

Ready to build on approval.