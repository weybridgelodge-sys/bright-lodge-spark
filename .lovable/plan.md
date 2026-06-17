# Festive Board Attendance Register

A new Trestle section module mirroring the LOI Register pattern, replacing the mock Festive Board KPI data with live records.

## Scope

In: manual + historical entry, member multi-select, visitor repeater (name + lodge + number), auto/override headcount, attendance status per booking, late "paid on night" entries, KPI wiring to Attendance Analytics.

Out (this iteration): Stripe live booking auto-population (placeholder hook only — table schema supports it so the future Stripe webhook can insert rows directly), Treasurer/Accounts view (data is there, dedicated screen later).

## Database (one migration)

**`festive_board_meetings`** — one row per Festive Board occurrence
- `meeting_date` (date)
- `meeting_type` enum: `regular` | `installation` | `emergency`
- `notes` (text, nullable)
- `headcount_override` (int, nullable) — when set, supersedes computed total
- `created_by`, timestamps

**`festive_board_attendance`** — one row per attendee (member or visitor)
- `meeting_id` → cascade
- `member_id` (nullable, → profiles) — set for member rows
- `visitor_name`, `visitor_lodge_name`, `visitor_lodge_number` (nullable) — set for visitor rows
- `attendance_status` enum: `booked` | `attended` | `no_show` | `cancelled_refunded` (default `booked`)
- `payment_method` enum: `stripe` | `paid_on_night_cash` | `paid_on_night_card` | `complimentary` | `unknown`
- `booking_id` (nullable, → bookings) — links Stripe-originated rows
- `amount_pence` (int, default 0) — for Treasurer totals
- `created_by`, timestamps
- CHECK: exactly one of `member_id` OR `visitor_name` set
- UNIQUE (meeting_id, member_id) where member_id not null

**RLS / GRANTs**
- All active members can SELECT both tables (matches LOI transparency).
- INSERT/UPDATE/DELETE restricted via `has_role` to `admin`, `secretary`, `worshipful_master`, `director_of_ceremonies` (same `canManageLOI` set; rename the flag to `canManageRegisters` or add a parallel `canManageFestiveBoard` mirror — leaning toward reusing `canManageLOI` since the role set is identical).
- `service_role` full access (future Stripe webhook).

## Frontend

**New route** `/members/festive-register` (`src/pages/members/FestiveBoardRegister.tsx`)
- Personal "My Festive Board attendance" panel (matches LOI page style)
- Meetings list, collapsible, with headcount + attended count
- Manager-only "New Meeting" dialog:
  - Date picker, meeting type select, notes
  - Members grid (active, non-honorary) with attendance status dropdown per checked row
  - Visitors repeater (name / lodge / number / status / payment method / amount)
  - Headcount override input (placeholder = computed)
- Per-meeting "Mark attendance" mode for post-meeting reconciliation: bulk-toggle Booked → Attended / No Show
- Late booking entry: "Add walk-in" button inside meeting detail → adds member or visitor row with payment_method = paid_on_night_*

**Navigation**
- Add "Festive Board" sidebar link in `MembersLayout.tsx` under LOI Register.

**Auth**
- Reuse existing `canManageLOI` (same role set). No new role.

## KPI wiring

Update `src/components/members/AttendanceCharts.tsx` — `festive` tab:
- New `useLiveFestive()` hook fetching `festive_board_meetings` + `festive_board_attendance`
- For each meeting compute: subscribing = COUNT(member_id where attended), visitors = COUNT(visitor rows where attended), total = headcount_override ?? (subscribing + visitors)
- Label format: existing `Mon YY (Inst.)` derived from `meeting_date` + `meeting_type`
- Last 6 meetings shown (consistent with current chart)
- Fall back to `regularMeetingsData` mock only when zero rows exist
- Stat banners (Avg member dining, Total guest diners, Peak covers) recompute from live rows
- Drop the "Mock data — visual placeholder" caption when live data is present

## Files

Created
- `supabase/migrations/<ts>_festive_board_register.sql`
- `src/pages/members/FestiveBoardRegister.tsx`
- `src/lib/festiveBoard.ts` (enums, label helpers, computeHeadcount)

Edited
- `src/App.tsx` — route
- `src/components/members/MembersLayout.tsx` — sidebar link
- `src/components/members/AttendanceCharts.tsx` — live festive hook + render
- `src/integrations/supabase/types.ts` — regenerated after migration

## Open question

Confirm: reuse `canManageLOI` (admin / secretary / WM / DC) for Festive Board management, or restrict to admin + secretary + WM only (excluding DC, since the brief names "Secretary or DC" for attendance marking but doesn't mention DC for record creation)? Default plan: **reuse `canManageLOI`** for simplicity.
