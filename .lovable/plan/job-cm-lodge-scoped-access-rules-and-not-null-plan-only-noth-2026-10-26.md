# JOB CM: lodge-scoped access rules and NOT NULL (plan only, nothing applied)

## Headline findings (read from the live database today)

- **Bookings and profiles are not lodge-scoped.** Their rules only check role (admin/Secretary) or ownership (`user_id = auth.uid()`, `id = auth.uid()`). Nothing in them compares `unit_id`, so they are not a pattern to copy. This plan writes the lodge rule from scratch, and profiles/bookings get the same treatment in a later job (not this one).
- **There is already a lodge helper, `current_unit_id()`** (STABLE, SECURITY DEFINER). It returns the caller's profile unit, **otherwise the single unit when exactly one unit exists**. That fallback is unsafe inside access rules, because a member with a blank lodge would match the only lodge. I propose a new strict helper instead (see Technical).
- `public_events` is a **view over `event_accounts`** (it is not one of the tables changed in 0154). `event_accounts.unit_id` already exists: 2 rows, 0 blank, nullable, no default.
- Row counts: secretary_returns 5, candidates 10, polls 0, lodge_events 3, lodge_socials 0, summonses 3, loi_schedule_entries 5. None of the 7 tables has a blank `unit_id`. There is 1 row in `units`. None of the 7 has a column default. All 7 have the `*_fill_unit` BEFORE INSERT trigger.

## 1. Rules per table: today and proposed

"Same lodge" below means `unit_id = my_unit()`, the new strict helper. The proposal keeps every existing role test exactly as it is and adds `AND <same lodge>` to both USING and WITH CHECK. WITH CHECK stops anyone moving a row into another lodge.

| Table | Today | Proposed |
|---|---|---|
| secretary_returns | ALL + SELECT: `can_manage_secretary_returns(me)` | Same test plus same lodge. Drop the duplicate SELECT policy, because ALL already covers it. |
| candidates | SELECT/INSERT/UPDATE: admin, Secretary or WM. DELETE: admin | Same tests plus same lodge |
| polls | SELECT: active member. INSERT/UPDATE: admin, Secretary or WM. DELETE: admin | Same tests plus same lodge. `poll_votes` INSERT also checks that the poll is in my lodge (through its existing EXISTS on polls, which RLS on polls then covers). |
| lodge_events | Public SELECT: published and not archived. Authenticated SELECT/INSERT/UPDATE/DELETE: admin or Secretary | Public read stays unchanged (see below). Admin/Secretary rules add same lodge. |
| lodge_socials | SELECT: active member. Writes: `can_manage_socials` | Same tests plus same lodge |
| summonses | ALL: admin, Secretary or Asst Sec. SELECT: active member, and either finalised/sent or a secretariat role | Same tests plus same lodge |
| loi_schedule_entries | SELECT: active member. Writes: admin, Secretary, Asst Sec or WM | Same tests plus same lodge |
| event_accounts (behind public_events) | Authenticated only: admin/Treasurer/officer/auditor and `can_manage_public_events` rules | Same tests plus same lodge. There is no anon policy today; anon reads go through the view. |

- **Admins and the Secretary follow the same lodge rule.** There is no cross-lodge bypass for any signed-in role. The service role is unchanged, because it ignores RLS.
- **Public reads: none change.** `lodge_events` "Public can read published events" stays as it is (no lodge filter). That keeps it identical for anon visitors and the public website, which shows only the host lodge's data. `public_events` is a view, so it runs as its owner and is not affected by `event_accounts` rules. `is_event_published` and the `get_public_*` RPCs are SECURITY DEFINER, so they are unaffected. The Join Us/enquiry path writes `membership_enquiries`, which is out of scope. When a second lodge exists, the public lodge_events read and the view will show both lodges' published rows. Filtering by web-address unit is a separate decision. I'll flag it, not change it.

## 2. Who is affected (one unit = identical; two units = own lodge only)

With one lodge and every member's profile set to it, every rule below evaluates exactly as today. A member whose profile lodge is **blank** loses access. Step 0 checks that nobody falls into this group.

- **Browser screens (signed-in, RLS applies):** SecretaryReturns, Admin, CandidatesManager, MembershipEnquiries, LodgeSummaryReport, lib/kpis, summaryReport*, PollsAdmin, ActivePoll, EventsAdmin, FestiveBoardAdmin, MeetingMinutes, SummonsBuilder, SummonsPrintPreview, YearEndTab, almoner ReportPanel, lib/lodgeEvents, lib/installationMeeting, lib/portalBooking, lib/meetingDiary, lib/lodgeSocials, LoiSchedule, lib/publicEvents (view). With two lodges, each sees only its own rows.
- **SECURITY DEFINER database functions (bypass RLS, so behaviour is unchanged; any lodge filtering is their own job):** check_and_book_seats, convert_enquiry_to_candidate, diary_move_meeting, dues_calculate_amount, event_capacity_summary, get_almoner_raffle_collections, get_lodge_health_aggregates, get_my_bookable_items, get_summons_dining_contacts, is_event_key_archived, lodge_social_guest_emails, meeting_dependencies, promote_next_waitlisted, sync_lodge_event_from_festive_board, tg_festive_board_derive_event_key. I'll list these as follow-ups for a lodge-scope review, not change them here.
- **duplicate_event_content** is *not* SECURITY DEFINER, so it runs under the caller's rules. It copies event child tables, not these 7. With two lodges, an officer can only copy events they can see, which is correct.
- **Backend functions (service role, RLS bypassed, unchanged):** secretary-returns-reminder, db-backup, notify-poll-opened, member-calendar-feed, meeting-deadline-reminder, event-header-image, send-booking-emails, summons-link, generate-minutes-from-transcript, send-summons-to-visitors, send-summons-email. These already filter by lodge after CI/CJ/CL.

## 3. NOT NULL safety

- The trigger fills `unit_id` from the caller's profile when it is blank, and raises `no_unit_for_write` if it can't. So no browser insert can produce a blank lodge.
- **Writers that bypass the caller (auth.uid() is null):** service-role functions and SECURITY DEFINER triggers/RPCs called from them. If these don't pass `unit_id`, the trigger raises (it does not write a blank), so NOT NULL adds no new failure. But such a write already fails today. Before NOT NULL I'll check each server-side insert into these 7 tables and confirm it supplies `unit_id`: `sync_lodge_event_from_festive_board` (inserts lodge_events from a register row), `convert_enquiry_to_candidate`, the db-backup restore path, and any seed. Not verified yet.
- duplicate_event_content does not insert into these tables. No COPY or bulk import writes them (member import writes profiles only).
- **event_accounts** has no fill trigger. Its writers (browser Event Accounts/public events manager, and any server insert) must be audited before NOT NULL. Otherwise, add the same trigger first.

## 4. Rollout order and rollback

0. Read-only checks: active members with a blank profile lodge (must be 0); server-side insert audit (section 3); event_accounts writers.
1. Migration A: create `my_unit()` (strict). Revert: `DROP FUNCTION public.my_unit();` (only after reverting B).
2. Migration B: one table at a time, `DROP POLICY` the old policy and `CREATE POLICY` the new one with the same name. Revert per policy: recreate the original text, which I'll keep verbatim in the migration as a comment block. Example: `DROP POLICY "X" ON t; CREATE POLICY "X" ON t ... USING (<old>)`.
3. Migration C (event_accounts): optionally add a fill trigger, then the rules.
4. Migration D: `ALTER TABLE ... ALTER COLUMN unit_id SET NOT NULL` on the 7 tables (plus event_accounts if audited). Revert: `ALTER COLUMN unit_id DROP NOT NULL`. That needs your approval because of the delete/drop safeguard.

I'll send each migration's exact SQL to you for approval before applying it.

**Tests:** two-lodge rule tests for every table, using a SQL harness that sets `request.jwt.claims` per role inside a rolled-back transaction, with no real sessions. They prove no cross-lodge read, insert, update or move (WITH CHECK). One-lodge regression tests: each existing role sees the same row counts before and after. Anon public reads: published lodge_events and public_events return identical rows. A blank-lodge member is refused. The NOT NULL migration is re-runnable. The calendar feed stays byte-identical.

## 5. Risks and unverified

- A member or admin with a blank profile lodge loses portal access after B (checked in step 0).
- Policies whose role helper uses office (WM, Asst Sec) are unchanged; only the lodge clause is added.
- The extra helper call costs little per row (STABLE, so cached per statement). Indexes on unit_id exist from 0154.
- With two lodges, public pages will show both lodges' published events until a web-address filter is decided.
- Not verified: full text of `can_manage_secretary_returns`, `can_manage_socials` and `can_manage_public_events`; server-side insert paths; real signed-in behaviour (no sessions minted). The backend type check is not relevant here (SQL only).

## Technical

```sql
CREATE FUNCTION public.my_unit() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT nullif(btrim(unit_id), '') FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_unit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_unit() TO authenticated, service_role;
-- pattern, e.g. candidates:
-- USING ((has_role(...admin) OR ...) AND unit_id = public.my_unit())
```

Being SECURITY DEFINER, it reads profiles without triggering profiles' own rules, so there is no recursion. A blank lodge gives `NULL`, so `unit_id = NULL` is false and access is denied.
