# JOB CN: lodge for officers, visitor contacts and event bookings (design only, nothing applied)

## 1. What exists today (read from the live database)

| Table | Rows | Lodge column | Keys that block a second lodge |
|---|---|---|---|
| officer_positions | 31 | `unit_id` exists, FK to units, **all 31 blank** | Primary key is `key` (e.g. `treasurer`), so one row per office worldwide; `order_index` is unique worldwide |
| officer_appointments | 71 | none | UNIQUE `(position_key, lodge_year)`, so two lodges cannot both have a Treasurer for 2026; FK to `officer_positions(key)` |
| visitor_contacts | 32 | none | UNIQUE `email`, so one visitor record per email worldwide |
| event_bookings | 2 | none | FK `event_id` to `event_accounts` (ON DELETE CASCADE); every booking has an account (0 orphans) |

Also relevant: `officer_installation_dates` already has `unit_id` NOT NULL with the default `current_unit_id()`. This is the single-unit fallback default that the CM review flagged as unsafe, so it is in scope for the follow-up.

**Who touches them**
- **Database functions:**
  - `current_officer_holder(key, at, unit)`: blank-unit positions match any unit.
  - `is_current_officer(user, key)`: no unit argument.
  - Others: `current_office_label`, `get_member_offices_held`, `get_officers_public`, `get_officers_public_year`, `get_lodge_health_aggregates`, `is_representative_position`, `loi_attendance_validate_part`, `dues_calculate_amount`, `subscription_exempt_member_ids` (Secretary exemption), `get_my_bookable_items`, `event_booking_child_match`, `guard_event_account_delete`, `duplicate_event_content`, `refresh_visitor_last_seen`.
  - Trigger `tg_visitor_contact_upsert` (SECURITY DEFINER): fires on festive-board attendance and upserts `visitor_contacts` by email.
  - Trigger `log_officer_appointment_change`: writes the audit.
- **Screens and libraries:**
  - Officers and positions: OfficersTracker, RepresentativesBoard, Directory, SummonsBuilder, MeetingMinutes, MemberDevelopment, BreakevenCalculator, useAuth (office-based access), YearAuditReviewBanner.
  - Officer libraries: lib/kpis, lib/loi, lib/loiParts, lib/representatives, lib/installationReturn, lib/provincialReturn, lib/development/queries.
  - Visitors: NewsletterHub, FestiveBoardAdmin.
  - Event bookings: EventAccountsTab, PublicEventsAdmin.
- **Backend functions:**
  - Officers: generate-provincial-return, submit-installation-return, submit-provincial-return, _shared/returnSigners, _shared/returnFiling, _shared/signatureAuth, events-treasurer-auth, send-summons-email, send-summons-to-visitors, notify-unlock-requested, secretary-returns-reminder, secretary-ugle-reminder, submit-enquiry, newsletter-confirm, _shared/units, lodgeSettings/lodgeSettingsResolve, send-booking-emails, db-backup.
  - Visitors: send-summons-to-visitors, broadcast-newsletter, newsletter-unsubscribe.
  - Event bookings: create-event-checkout, stripe-events-webhook, get-event-booking, event-balance-link/reminders, event-record-balance, events-backfill-fees, eventsMarkPaid, eventBalanceAccess.
- **Signatures:** member signatures are already unit-scoped and follow the office. They depend on `current_officer_holder` / returnSigners, so they inherit this change.

## 2. Proposed design

Same pattern as 0154 for every table, with one difference: unlike 0154 (whose lodge column has no foreign key), these columns get a foreign key to `units`.
- Nullable text `unit_id`, FK to `units(id)`, NO default.
- Backfill from the single unit. The migration raises if `units` does not have exactly one row.
- Index on `unit_id`.
- Fill the lodge on every new row. Officer positions, appointments and visitor contacts reuse the existing `fill_unit_from_caller` trigger, which only uses the caller's profile lodge. Event bookings get their own trigger: it uses the booking's event account first, then the caller's lodge. Server-side writers must pass the lodge explicitly (listed below).

### Positions: recommendation is a global catalogue, with the lodge on the appointment
- **Option A, global catalogue (recommended).** `officer_positions` stays one shared list of offices (WM, SW, Treasurer and so on are the same in every Craft lodge). The lodge lives on `officer_appointments`. Representative positions, the only ones lodges add themselves, keep their `unit_id` and are owned by that lodge. Blank `unit_id` then means "standard office, every lodge", which is a correct rule for a catalogue.
  - Cost: small. No primary-key change, and no FK or `position_key` change anywhere (offices are referenced by key in about 40 places).
  - `order_index` uniqueness becomes `(coalesce(unit_id,''), order_index)` so two lodges can each order their own representatives.
- **Option B, per-lodge catalogue.** Every lodge gets its own copy of the 31 positions. The primary key becomes `(unit_id, key)` or a surrogate id, and every FK and query on `position_key` must carry the unit too.
  - Cost: large and risky. It touches every officer-reading function, the returns' exact office IDs and the signer logic, for no practical gain.

### Appointments
- Add `unit_id`, backfill all 71 rows with the single unit, and fill new rows by trigger from the caller's lodge (OfficersTracker writes from the browser).
- Replace UNIQUE `(position_key, lodge_year)` with UNIQUE `(unit_id, position_key, lodge_year)`. Create the new constraint first, then drop the old one in the same migration.
- The audit trigger also records the appointment's unit.

### Event bookings
- The lodge belongs to the **host lodge that owns the event**, which is `event_accounts.unit_id`. The trigger always copies it from the parent account, and the booking cannot override it (a mismatch is corrected to the account's lodge).
- `lodge_label`, which the guest picks ("which lodge are you from"), is display only and never sets the unit. Visiting-lodge guests still belong to the host's booking.
- Public checkout (create-event-checkout, service role) already resolves the event and therefore its lodge. The trigger also covers service-role inserts, because it reads the parent account, not `auth.uid()`.
- **Alternative to consider:** add no column and always join to the event account, which avoids duplication. I recommend the column plus trigger, because access rules and indexes on bookings then don't need a join.

### Visitor contacts
- A visitor is a contact **of a lodge**. Two lodges may each hold the same visitor email, so unique `email` becomes unique `(unit_id, email)`.
- Unit sources:
  - Festive-board path (`tg_visitor_contact_upsert`, SECURITY DEFINER, often without a signed-in caller): the attendance row's meeting `festive_board_meetings.unit_id`. A blank meeting lodge is skipped, never defaulted. ON CONFLICT changes to `(unit_id, email)`.
  - Screens (FestiveBoardAdmin, NewsletterHub): the caller's lodge via the trigger.
  - Public forms (summons RSVP, newsletter-unsubscribe by token): the token's own contact row decides the lodge. A form that creates a contact from a web address uses `resolveUnit`, and refuses if no lodge resolves. Today no public form inserts directly; the only creation path is the attendance trigger. I'll confirm that during the build.
- broadcast-newsletter and send-summons-to-visitors filter recipients by `unit_id` (CC/CI had flagged them as not lodge-scoped).

## 3. current_officer_holder and the "blank counts for every lodge" rule

New behaviour: the lodge filter moves to the **appointment**:
`oa.unit_id = _unit AND (coalesce(op.unit_id,'') = '' OR op.unit_id = _unit)`.
The position rule keeps the blank-means-standard-office meaning (correct under Option A). The appointment is what stops another lodge's holder from leaking in.
- When `_unit` is blank: the function uses the single unit if exactly one exists, else returns NULL. This matches today's one-lodge answer, and never returns a holder from another lodge.
- `is_current_officer(user, key)` passes the user's own lodge (`my_unit()`, from CM) into `current_officer_holder`. An officer is "current" only in their own lodge.
- The same lodge filter is added to the other officer functions listed in section 1, using the record's or caller's lodge.

**Order (retiring the old rule safely)**
1. Add the columns and backfill (old functions keep working, because they ignore the new column).
2. Swap the unique key on appointments.
3. Update the functions so they filter on `oa.unit_id`.
4. Change writers and callers that pass the lodge.
5. Only then add NOT NULL on `officer_appointments.unit_id`.

**Proof that one lodge is unchanged:** a snapshot test taken before and after step 3, comparing three things across all 31 positions, years 2020 to 2027 and today:
- the holder each position returns;
- `is_current_officer` for each of the 24 profiles;
- the Installation Return and Provincial Return signer lists and offices-held output, which must be byte-identical.

The snapshot runs as read-only SQL in a rolled-back transaction.

## 4. Changes and rollout (each step needs your approval of the SQL first)

| Step | Change | One-line rollback |
|---|---|---|
| 1 | Migration: `unit_id` + FK + backfill + index on appointments, visitor_contacts and event_bookings; fill triggers | Drop the triggers; the columns stay (unused) |
| 2 | Migration: unique `(unit_id, position_key, lodge_year)`, `(unit_id, email)`, `(coalesce(unit_id,''), order_index)` | Recreate the old unique keys (rows are still unique, single lodge) |
| 3 | Migration: lodge-aware `current_officer_holder` and `is_current_officer` (same signatures), plus the other functions in section 1 and the visitor trigger's ON CONFLICT | Restore the previous function bodies, saved verbatim in the migration as a comment |
| 4 | Code: OfficersTracker, RepresentativesBoard, returnSigners, returnFiling, signatureAuth, events-treasurer-auth, send-summons-to-visitors, broadcast-newsletter, newsletter-unsubscribe, create-event-checkout, eventsMarkPaid, db-backup: filter or pass the lodge | Revert the files |
| 5 | Access rules (with CM, below) | Recreate the original rules from the saved text |
| 6 | NOT NULL on the three new columns | `DROP NOT NULL` |

**Tests to add:**
- Two-lodge fixtures: Treasurer per lodge, no cross-lodge holder, signer, exemption, visitor or booking.
- One-lodge snapshot equality.
- Duplicate visitor email allowed across lodges and refused within a lodge.
- A booking whose lodge is forced from its event account.
- The public RSVP/unsubscribe token path.
- Existing jobBW/CC/CI/CL tests updated where they assert the blank-unit rule.

## 5. How this fits with Job CM

- It uses the same `my_unit()` helper and the same "existing role test AND `unit_id = my_unit()`" pattern; nothing is redefined.
- Policies:
  - **officer_appointments:** the Tracker and Representative rules get the lodge clause.
  - **officer_positions:** members can read rules where the unit is blank or their own; edits only to own-lodge representatives.
  - **visitor_contacts:** both rules get the lodge clause.
  - **event_bookings:** all four rules get the lodge clause.
  - **event_accounts:** this is CM's Migration C.
- Ship CM's Migrations A and B first, then CN step 5 together with CM's C, so all access rules can be tested in one harness run.

## 6. Risks and unverified

- **Office-based access depends on `is_current_officer`.** Treasurer and auditor access, signatures and returns all rely on it. A wrong lodge filter would lock officers out, which is why step 3 is snapshot-gated.
- **`current_unit_id()` default on `officer_installation_dates`** has the single-unit fallback. I'll propose replacing it with the fill trigger in step 1.
- **Changing the visitor ON CONFLICT target** must ship in the same migration as the new unique key, or the attendance insert fails.
- **Not verified yet:**
  - the full text of the other officer functions (`get_officers_public*`, `subscription_exempt_member_ids`, `dues_calculate_amount`, `current_office_label`);
  - whether any public form inserts `visitor_contacts` directly;
  - how db-backup restores rows;
  - real signed-in behaviour (no sessions minted).
