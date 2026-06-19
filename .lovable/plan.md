## Goal

Extend the existing Member Development Module to deliver a lodge-wide Ritual Skills Matrix (DC/WM view), Preceptor's Notes, mentoring exemptions, an LoI Part Assignment Helper, and the two specified PDF exports — while reusing existing tables (`profiles`, `officer_appointments`, `loi_sessions`, `member_*`) rather than duplicating data.

## What already exists (keep & reuse)

- `member_development_records`, `member_checklist_items`, `member_ritual_records`, `member_external_appointments` tables + RLS
- `ProfileSection`, `MentoringChecklist`, `RitualRecord`, `OfficesRecord`, `ExportPdfButton` components
- `MemberDevelopmentPage` (individual record) and stub `MentorDashboard`
- Catalogues in `src/lib/development/catalogues.ts`
- `can_edit_member_development` and `can_edit_member_ritual` SQL helpers

## What changes

### 1. Database (one migration)

- Add column `member_ritual_records.preceptor_notes text` (visible only to DC/WM/Admin — enforced in app + via a SECURITY DEFINER read function).
- Add columns to `member_development_records`:
  - `mentoring_exempt boolean default false`
  - `exemption_reason text` (`joining_member` | `senior_member` | null)
  - `exemption_note text`
  - `last_checkin_date date`
- New table `module_settings` (single-row key/value): stores `mentoring_threshold_date` (default `2025-10-01`). Editable by Secretary/Admin only.
- New table `loi_part_assignments`:
  - `loi_session_id` (FK `loi_sessions`), `ritual_group`, `piece`, `member_id` (FK profiles), `assigned_by`, `notes`
  - RLS: read = active members; write = DC/WM/Admin/Secretary
- RPC `lodge_skills_matrix()` returns one row per `(ritual_group, piece, member_id)` with highest achieved level (`learned`/`assessed`/`loi`/`lodge`) computed from `member_ritual_records`, restricted to active members. SECURITY DEFINER.
- RPC `update_preceptor_notes(_row_id uuid, _notes text)` — restricted to DC/WM/Admin.
- All new tables get the standard GRANT + RLS + policies block.

### 2. Catalogue updates (`src/lib/development/catalogues.ts`)

- Replace ritual catalogue with the exact list from the brief (Opening/Closing, Initiation, Passing, Raising, Installation, LoI Roles, Lodge Traditions) — pieces tagged with degree (`1`, `2`, `3`, `installation`, `loi`, `tradition`).
- Replace checklist catalogue with the exact stages/items in the brief.
- A safe re-seed: `ensureSeeded` already inserts only missing `(stage, topic)` / `(ritual_group, piece)` pairs, so existing rows stay intact and new ones are added.

### 3. New pages & components

```
src/pages/members/development/
  SkillsMatrix.tsx          (DC Dashboard — default for DC/WM)
  LoiAssignmentHelper.tsx   (Section 4)

src/components/members/development/
  SkillsMatrixGrid.tsx      (members × pieces grid, R/A/G highlighting, filters)
  PiecePeopleDrawer.tsx     (per-piece breakdown: delivered / candidates / not started)
  PreceptorNotesField.tsx   (DC/WM only, inline editor inside RitualRecord)
  ExemptionPanel.tsx        (Secretary/Mentor toggles in ProfileSection)
  LoiAssignmentTable.tsx    (suggestions per piece with override dropdown)
  GapReportPdfButton.tsx
```

### 4. Routing & nav (`App.tsx`, `MembersLayout.tsx`)

- `/members/admin/skills-matrix` → `SkillsMatrix` (DC/WM/Admin)
- `/members/admin/loi-helper` → `LoiAssignmentHelper`
- Existing `/members/admin/development` stays as the mentor/admin member list, with a tab switcher: **Skills Matrix · Members · LoI Helper**.
- Sidebar: rename "Member Development" group; DC/WM see Skills Matrix link, Mentors see Mentor Dashboard, all members see "My Development".

### 5. Component behaviour

- **SkillsMatrixGrid**: fetches `lodge_skills_matrix()` once, pivots client-side. Renders sticky first column (piece) and sticky header (member initials). Cell shows highest level letter; per-piece row aggregate drives Red/Amber/Green tint of the piece label. Filters: degree multi-select, gap-type radio.
- **PiecePeopleDrawer**: opens via row click; three lists with member chips → click chip jumps to that member's Development Record.
- **Member column header click** → `/members/development/:memberId`.
- **PreceptorNotesField**: only rendered if `isDC || isWM || isAdmin`; PDF for member excludes it.
- **ExemptionPanel**: when set, MentoringChecklist component is hidden and replaced by a labelled badge.
- **LoiAssignmentHelper**: pick LoI session → pick pieces → for each piece show suggested member (highest priority = `learned`/`assessed` and not yet delivered) plus override; save to `loi_part_assignments`.

### 6. PDFs (`src/lib/development/pdf.ts` + new `gapReportPdf.ts`)

- Extend existing `buildDevelopmentPdf` to:
  - Skip mentoring checklist section when exempt (show exemption note instead).
  - Never include Preceptor's Notes.
- New `buildGapReportPdf(matrix)`: lodge crest header, gold section headings, two tables (Red pieces, Amber pieces) sorted by risk; footer "Confidential — DC / WM only".

### 7. Access control summary

| Capability | Admin | WM | DC | Secretary | Mentor | Member |
|---|---|---|---|---|---|---|
| Skills Matrix / Gap Report | ✓ | ✓ | ✓ | – | – | – |
| Edit Preceptor's Notes | ✓ | ✓ | ✓ | – | – | – |
| Edit any member's checklist/ritual | ✓ | ✓ | – (ritual ✓) | – (ritual ✓) | own mentees | – |
| Set exemption / threshold | ✓ | ✓ | – | ✓ | – | – |
| Save LoI assignments | ✓ | ✓ | ✓ | ✓ | – | – |
| View own record | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 8. Out of scope

- No edits to existing Almoner or Officers Tracker modules (Officers Tracker is read-only source).
- No email / notification triggers.
- No mobile-specific redesign beyond responsive grid.

### Deliverable order

1. Migration (DB + RPCs + grants + policies)
2. Catalogue rewrite + small `queries.ts` additions
3. SkillsMatrix page + grid + drawer
4. Preceptor's Notes + Exemption + threshold setting
5. LoI Assignment Helper
6. PDF updates + Gap Report PDF
7. Routes, sidebar, role gating
