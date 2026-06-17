# Summons Builder

A new Trestle module for Secretary / Assistant Secretary to assemble, preview, PDF-export and email the lodge's monthly summons. Pulls Members, Officers Tracker, Meeting Events, and Festive Board records so only genuinely new content is entered each month.

## Roles & access

- Add new role `assistant_secretary` to the `app_role` enum.
- New `canManageSummons = isAdmin || isSecretary || isAssistantSecretary`.
- Route `/members/summons` + sidebar entry (gated). Admin user-role assignment already supports new roles via Admin page.

## Database (one migration)

**`lodge_template`** — singleton, one row keyed `id = 'default'`
- Lodge identity: name, number, province, consecration_date
- Logo URL (stored in existing `lodge-docs` bucket)
- Venue address, regular meeting pattern text, LOI day/time/venue text
- Provincial website URL, MCF contact text, dining booking URL
- Static notices: data_protection_text, overseas_attendance_text, progression_notice_text (+ short variants for overflow)
- WM home address/contact, Secretary contact block, Royal Arch Rep name+rank
- Honorary members (text), lodge_representatives (jsonb array of {role, name})

**`summonses`** — one per meeting
- `meeting_number` (int, auto-increment from MAX+1, editable)
- `lodge_event_id` → `lodge_events` (date/time/type pulled from here)
- `dress_code`, `minutes_confirmation_date`, `next_meeting_date`, `officer_night_date`
- `agenda` jsonb: ordered `[{ id, label, kind: 'standing'|'variable'|'candidate' }]`
- `candidates` jsonb: ordered `[{ name, dob, occupation, address, proposer, seconder, date_proposed, ceremony_type }]`
- `dining_enquiry_name`, `dining_enquiry_email`
- `notice_overrides` jsonb (which static blocks were auto/manually trimmed)
- `pdf_storage_path` (set after generation), `sent_at`, `sent_to_count`
- `status`: draft | finalised | sent
- `created_by`, timestamps

**`summons_email_log`** — per-recipient send rows for the archive
- `summons_id`, `recipient_email`, `status`, `error`, `sent_at`

GRANTs + RLS:
- `lodge_template`: SELECT for `authenticated`; ALL via `canManageSummons` roles. `service_role` ALL.
- `summonses` + `summons_email_log`: same pattern. Active members may SELECT finalised/sent rows so future "View past summonses" is possible.

## Frontend

**New files**
- `src/pages/members/SummonsBuilder.tsx` — tabs: **Template**, **Officer Roll**, **New Summons**, **History**
- `src/components/members/summons/TemplateForm.tsx`
- `src/components/members/summons/SummonsEditor.tsx` — agenda DnD, candidate repeater, dining auto-fill, overflow warning
- `src/components/members/summons/SummonsPreview.tsx` — on-screen A4 booklet preview (the same React tree used by the PDF)
- `src/components/members/summons/MembersListPanel.tsx` — two-column auto-balanced list with symbols (+ # ✚ Triple-Tau)
- `src/lib/summons.ts` — standing agenda template, preset variable items, overflow priority logic, member-list balancing
- `src/lib/summonsPdf.ts` — `@react-pdf/renderer` document (A4 landscape, 4 pages = folded booklet)

**Edited**
- `src/components/members/MembersLayout.tsx` — Summons sidebar link
- `src/hooks/useAuth.tsx` — `isAssistantSecretary`, `canManageSummons`
- `src/App.tsx` — route
- `src/pages/members/Admin.tsx` — show new role in user-role selector

## Edge function

`supabase/functions/send-summons-email/` (verify_jwt enforced; role-checked)
- Input: `{ summons_id }`
- Fetches PDF from storage, lists `profiles.email WHERE status='active'`, sends via existing Brevo/Lovable email path (single template `summons-distribution`), writes `summons_email_log`, updates `summonses.sent_at` + `sent_to_count`.

## Per-meeting flow

1. Pick a `lodge_events` row (date/time/type pre-fill).
2. Standing agenda pre-loads: Open → Welcome visitors → **[variable slot]** → Officer reports → Charity Column → Risings → Close.
3. Add variable items from presets (`Confirm minutes`, `Ballot/Initiate`, `Pass`, `Raise`, `Declare nominations`, `Elect Auditors`, custom) — DnD reorderable, numbering auto from index.
4. Candidate blocks: each appended block auto-inserts a matching agenda line; remove cascades.
5. Dining auto-pulls menu/price/deadline from the linked Festive Board record; QR code generated client-side from template `dining_booking_url` (using `qrcode` lib).
6. Members list renders from `profiles` ordered by `COALESCE(initiation_date, joined_year-01-01)` ASC, with symbols (`+` past master, `#` past master in lodge, Triple Tau Unicode `☥`/SVG for `is_royal_arch`), post-nominals from `rank`/`grand_rank`.
7. Overflow engine measures rendered height of members panel; if over budget, step-down: font-size 9→8.5→8pt, then trim notices in the spec'd order, surfacing a yellow banner with a "Choose what to trim" override.
8. Preview → **Generate PDF** (writes to `lodge-docs/summonses/<id>.pdf`) → **Email to all members**.

## Technical notes

- PDF via `@react-pdf/renderer` (only new dep besides `qrcode`); A4 portrait single sheet, 4 page faces arranged for fold (Page 1 = front cover/officers, Page 2 = members list + notices, Page 3 = agenda/candidates, Page 4 = dining + next meeting).
- Auto-balance algorithm: ceil(n/2) left, floor(n/2) right (odd → left gets extra), recomputed on render.
- Meeting number auto-increment: `SELECT COALESCE(MAX(meeting_number),0)+1 FROM summonses` when opening a new draft.
- Triple Tau: rendered as inline SVG (no font dependency risk in PDF).

## Out of scope (this iteration)

- Per-member opt-out from summons emails (use existing `status='active'` filter).
- Editing past archived summonses after send (read-only history).
- WYSIWYG rich-text on static notices (plain textarea with line breaks).

## Open question

Confirm Assistant Secretary should be a **new role** (`assistant_secretary`) rather than just granting `secretary`. Default plan: **new role** so audit trail and Officers Tracker can distinguish the two appointments.
