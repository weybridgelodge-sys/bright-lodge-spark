# Festive Board — Booking-to-Register Auto-Sync

## Goals

- One canonical meeting record per Lodge meeting, with explicit status (Draft / Published / Completed) driving what's visible on `/bookings` and what auto-syncs into `/members/festive-board`.
- Bookings made on the public form appear automatically as draft attendance rows in the Register, classified as Members or Visitors using the Lodge Name & No. field — without overwriting any manual edits the Secretary has made.
- A per-meeting **white table** override that disables sync for the rare non-Masonic event.
- Apologies stay out of the Register entirely.

## Answer to §1 (single meeting entity?)

Today there is no single meeting entity. `festive_board_meetings` exists for the Register, but bookings are attributed only by a free-text `event_key`/`event_label`, and the Summons Builder / calendar use their own data. Unifying all three is a much bigger refactor than this brief warrants.

Recommendation: **keep `festive_board_meetings` as the canonical record for this loop**, extend it with the status + booking-window fields below, and have the public Bookings page read from it. Summons / calendar unification can come later without changing the contract this brief establishes.

## Answers to §8 open questions

1. **Completed auto-closes Bookings page** — yes, the public Bookings page will only show the meeting whose status is `published`. Setting `completed` removes it immediately, no extra step.
2. **Manual transition to Completed** — manual, by the Secretary, matching Summons "Finalised". No date-based auto-flip.

---

## Build steps

### 1. Schema changes (one migration)

`festive_board_meetings` — add:
- `status` enum `meeting_status` ∈ `draft | published | completed`, default `draft`.
- `is_white_table` boolean, default `false`.
- `dining_price_pence` integer, default `3500` (editable per meeting; used to fill the synced Amount).
- `event_key` text — stable slug the public Bookings page submits with each booking (e.g. `festive-board-2026-11-13`). Unique.
- Partial unique index ensuring at most one row has `status = 'published'` at any time.

`bookings` — add:
- `meeting_id uuid REFERENCES festive_board_meetings(id) ON DELETE SET NULL`, nullable (pre-existing rows have no meeting).
- Index on `(meeting_id)`.

`festive_board_attendance` — add:
- `source` enum `attendance_source` ∈ `manual | booking`, default `manual`.
- `source_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL`, unique when present (partial unique index `WHERE source_booking_id IS NOT NULL`) so the same booking can't sync twice.

GRANT/RLS unchanged for existing tables; new columns inherit. Migration also backfills `event_key` for any existing `festive_board_meetings` rows.

### 2. Public Bookings page (`src/pages/Bookings.tsx`)

- Load the single `published` meeting from `festive_board_meetings` instead of the current hardcoded/inferred date. If none is published, show "No meeting currently open for booking — check back soon."
- Add a per-guest **Lodge Name & No.** field to the "Are You Bringing Any Guests?" step, mandatory, matching the respondent's field styling.
- Submit the meeting's `id` and `event_key` to `save-meeting-response`.

### 3. Edge function (`supabase/functions/save-meeting-response/index.ts`)

- Accept `meeting_id` in the payload, validate it points to a `published` row, and store it on the booking via the new `meeting_id` column.
- Continue to write `event_key` / `event_label` for backward compatibility.

### 4. Register sync (`src/pages/members/FestiveBoardRegister.tsx`)

On opening a meeting:

1. If `is_white_table` is true → no sync (current behaviour).
2. Otherwise, fetch all `bookings` for `meeting_id` where `payment_status != 'apologies'` AND meeting_option != `apologies` AND no `festive_board_attendance` row exists with that `source_booking_id`.
3. For each missing booking, build a draft row in local state (not yet persisted) tagged `source = 'booking'`:
   - **Classification** — match the respondent's `details.lodgeName`/`lodgeNumber` against `/weybridge/i` or `/\b6787\b/`. If matched, search `profiles` by name/email and pre-select the member; otherwise create a Visitor row pre-filled with name, email, lodge name/number.
   - For each guest, repeat the same classification using the new per-guest Lodge field.
   - **Amount**: `meeting-and-festive-board` → `dining_price_pence / 100`; `meeting-only` → `0.00`.
   - **Status**: `booked` (the existing pre-meeting default).
   - **Payment method**: copy from booking if confirmed online, else leave blank for Secretary to set.
4. Synced rows render with a small "Synced from booking" badge (gold outline) next to the name.
5. Sync is **additive only** — once a `festive_board_attendance` row exists for a `source_booking_id`, the booking is skipped on subsequent opens regardless of what changed in the booking.

Manual "Add member" / "Add visitor" remain untouched.

### 5. Meeting management UI

In the existing meeting editor (top of `FestiveBoardRegister.tsx`):
- Status dropdown: Draft / Published / Completed (with a guard: switching to Published will move any other Published meeting to Draft via a confirmation toast).
- "Open to non-Masons (white table)" checkbox.
- "Dining price (£)" number input.
- "Public booking slug" text input (`event_key`), auto-suggested from the date.

### 6. Out of scope

- Apologies handling (separate Masonic Secretary Assistant project).
- Attendance Analytics — automatically benefits once data flows; no code change.
- Unifying Summons / calendar onto the same meeting entity.

## Technical notes

- New enums: `meeting_status`, `attendance_source`. Created via `CREATE TYPE` in the migration.
- Partial unique index for the single-published rule:
  ```sql
  CREATE UNIQUE INDEX one_published_meeting
    ON public.festive_board_meetings ((status))
    WHERE status = 'published';
  ```
- Partial unique index preventing duplicate sync:
  ```sql
  CREATE UNIQUE INDEX uniq_attendance_per_booking
    ON public.festive_board_attendance (source_booking_id)
    WHERE source_booking_id IS NOT NULL;
  ```
- Weybridge classification is a single helper in `src/lib/festiveBoard.ts` (`isWeybridgeLodge(lodgeName, lodgeNumber)`) reused for respondent and each guest.
- No changes to existing RLS — the Register page already requires active member; bookings table already allows authenticated SELECT.

## Order of work

1. Migration (schema + enums + indexes + backfill).
2. Edge function update.
3. Public Bookings page (published-meeting load + per-guest Lodge field).
4. Register: meeting editor controls (status, white table, dining price, slug).
5. Register: sync-on-open with classification + synced-row badge.
