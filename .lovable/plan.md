## Goal

Most of the brief is already built (Skills Matrix, individual Development Record with profile / checklist / ritual / offices, Mentor Dashboard, LoI Helper, Preceptor's Notes, exemptions, Dev Record PDF, Gap Report PDF). This iteration adds the missing pieces:

1. **Engagement Tracker** (Section 2e)
2. **Working Groups** module (Section 5)
3. **Working Groups Activity Report PDF** (Section 6)
4. **Beehive philosophy quote** on the public About page
5. Small gaps: Secretary edit access on checklist/profile, threshold-date UI in module settings, member dashboard surfacing of working group assignments.

## 1. Database migration

New tables (all with GRANT + RLS + policies):

- `member_engagement_log`
  - `member_id` (FK profiles), `occurred_on` date, `category` text (`social` | `blog` | `charity` | `working_group` | `mentor_contact` | `visit` | `provincial` | `other`), `summary` text, `logged_by` uuid, timestamps.
  - RLS: member sees own; Mentor of member, Admin, WM, Secretary edit; DC read.

- `working_groups`
  - `slug` text unique, `name`, `remit` text, `founding_statement` text, `lead_member_id` uuid, `is_active` bool, timestamps.
  - RLS: read = active members; write = Admin / WM / Secretary.

- `working_group_members`
  - `working_group_id`, `member_id`, `role` text (`lead` | `member`), `joined_on` date.
  - RLS: read = active members; write = Admin / WM / Secretary / group lead.

- `working_group_activities`
  - `working_group_id`, `activity_date` date, `kind` text (`meeting` | `event` | `outcome`), `title` text, `notes` text, `logged_by` uuid.
  - RLS: read = active members; write = Admin / WM / Secretary / group lead / group members.

Helper functions:
- `is_working_group_lead(_user uuid, _group uuid) returns boolean` (SECURITY DEFINER).
- `last_engagement_date(_member uuid) returns date` (used by Mentor Dashboard).
- Update `can_edit_member_development` to include Secretary.

Seed five working groups (Social Committee, Charity & Fundraising, Community & Volunteering, Lodge Visits & Experiences, Communications & Heritage) with the briefed remits and the founding statement on each group row (also stored as `module_settings.working_groups_philosophy`).

Add `module_settings.mentoring_threshold_date` editable surface (already exists in table — just expose UI).

## 2. Code changes

### New library
- `src/lib/workingGroups.ts` — CRUD + types for groups, members, activities.
- `src/lib/development/engagement.ts` — CRUD + types for engagement log, `daysSinceLastTouchpoint(memberId)`.
- `src/lib/development/activityReportPdf.ts` — `buildWorkingGroupsActivityPdf(masonicYear)`.

### New components
- `src/components/members/development/EngagementTracker.tsx` — table + add-entry form, used inside Member Development Record (sub-section 2e).
- `src/components/members/workinggroups/`
  - `WorkingGroupsList.tsx` — landing grid with gold-serif pull-quote at top.
  - `WorkingGroupCard.tsx`
  - `WorkingGroupDetail.tsx` — remit, lead, members chips, activity log.
  - `ActivityLogTable.tsx` + `AddActivityDialog.tsx`
  - `ManageGroupDialog.tsx` (Admin / WM / Secretary) — name, remit, lead, members.
  - `ActivityReportPdfButton.tsx`
- `src/components/members/development/ModuleSettingsCard.tsx` — Secretary/Admin form for `mentoring_threshold_date`.

### New pages
- `src/pages/members/working-groups/Index.tsx` (list, with quote)
- `src/pages/members/working-groups/Detail.tsx` (`/members/working-groups/:slug`)
- `src/pages/members/working-groups/Admin.tsx` (Secretary/WM/Admin manage groups + run Activity Report PDF)

### Routing & nav
- Add routes in `App.tsx`.
- `MembersLayout.tsx` sidebar: new "Working Groups" group with **Working Groups** (all members), **Manage Groups** (Admin/WM/Secretary), **Activity Report** action.
- Member dashboard widget (`src/pages/members/Dashboard.tsx`): show "My Working Groups" chips + "Open commitments" count, alongside existing mentoring/ritual cards.

### Mentor Dashboard
- Extend existing `MentorDashboard.tsx` row with: `last_touchpoint`, `weeks_since_touchpoint`, amber flag when > 6 weeks AND member is in mentoring period (not exempt).

### Development Record page
- Add **Engagement** tab/section between Ritual and Offices.
- PDF (`pdf.ts`) gains an "Engagement Log" section (member-facing OK; still excludes Preceptor's Notes).

## 3. Public website — beehive quote

- Edit `src/components/About.tsx` to add a gold serif pull-quote block under the lead paragraphs:
  > "Weybridge Lodge operates on the principle of the beehive…"
- Same quote also added to `src/pages/LodgeProfile.tsx` near the top.
- Use existing `font-serif text-gold` tokens; quote rendered inside a left gold border, italic, with attribution "— Lodge philosophy, adopted 2026".

## 4. Out of scope (already done or explicitly skipped)

- Skills Matrix, Gap Report PDF, Preceptor's Notes, exemptions, LoI Helper, individual Development Record PDF — already shipped.
- No edits to Officers Tracker or Almoner modules.
- No email/notification triggers.
- Formal committee minute change is a real-world action, not a code change.

## Deliverable order

1. Migration (engagement + working groups + helpers + seed).
2. Working Groups library + pages + sidebar.
3. Engagement Tracker component + Mentor Dashboard flag.
4. Module settings UI (threshold date).
5. Activity Report PDF + dashboard surfacing.
6. Public About / LodgeProfile pull-quote.
