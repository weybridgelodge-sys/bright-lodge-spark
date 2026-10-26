# JOB DA — retiring the single-lodge fallback in current_unit_id() (plan only)

Verified live today: 15 functions mention it (the 14 listed + current_unit_id itself), 6 default columns (all now NOT NULL), 16 policies (3 installation_rule_settings, 1 meeting_diary_audit, 3 meeting_series, 4 member_status_history, 1 officer_installation_dates, 3 unit_settings, 1 unit_settings_audit). Profiles 24, blank lodge 0, units 1.

## 1. The 14 functions

| Function | Anon grant | Caller | Lodge known by caller? | Mark |
|---|---|---|---|---|
| diary_add_meeting | no | MeetingDiary.tsx (signed in) | my_unit via profile | SAFE |
| get_join_us_costs | yes | JoinUs.tsx, FAQ.tsx via lib/joinUsCosts (public) | no — can use resolve-site-unit | NEEDS LODGE PARAMETER |
| get_lodge_contact_settings(_unit_id) | no | ContactSettings.tsx | has param; check null path | SAFE |
| get_lodge_fee_settings(_unit_id) | no | NewMemberFeesTab.tsx | has param | SAFE |
| get_lodge_identity | yes | lib/lodgeIdentity, lib/docIdentity (members' PDFs, returns, summons) | signed-in callers only found | SAFE in use; anon grant to revoke or param |
| get_meeting_pattern | yes | lib/meetingPattern → LodgeProfile (public), SummonsBuilder, provincialReturn | public page: no | NEEDS LODGE PARAMETER |
| get_newsletter_subscriber_counts(_unit_id) | no | NewsletterHub.tsx | has param | SAFE |
| get_public_booking_details(_unit) | yes | lib/bookingDetails (CW: already sends site lodge) | yes | SAFE once null path is removed |
| get_public_lodge_figures | yes | lib/lodgeFigures → LodgeProfile (public) | no | NEEDS LODGE PARAMETER |
| get_public_unit_profile | yes | lib/unitProfileFetch (main.tsx, every public page header/footer), lib/unitProfile, lib/docIdentity | no | NEEDS LODGE PARAMETER — highest risk |
| get_unit_setup | yes (!) | UnitSetup.tsx (signed in) | profile | SAFE in use; UNSURE why anon is granted |
| save_unit_setup | yes (!) | UnitSetup.tsx | profile | SAFE in use; UNSURE why anon is granted |
| update_lodge_contact_settings(_unit_id) | no | ContactSettings.tsx | has param | SAFE |
| update_lodge_fee_settings(_unit_id) | no | NewMemberFeesTab.tsx | has param | SAFE |

No edge function calls any of these by RPC (edge code uses loadLodgeSettings with an explicit unit). Cron is not a caller.

## 2. The 6 default columns

| Table | Writers | Session at write? | fill_unit_from_caller trigger? | Better source |
|---|---|---|---|---|
| festive_board_meetings | FestiveBoardAdmin insert (browser); diary_add_meeting; trigger sync_festive_board_from_lodge_event (inserts without unit_id) | yes for all found | would work for browser/RPC; sync trigger only if the lodge_events writer has a session | parent: lodge_events.unit_id (sync), series unit (diary_add_meeting) |
| meeting_series | Meeting Diary screens (signed in) | yes | works | caller |
| officer_installation_dates | diary_move_meeting (no unit_id in insert), Secretary screens | yes | works | parent: the moved meeting's unit_id |
| installation_rule_settings | Secretary screen | yes | works | caller |
| meeting_diary_audit | trigger log_meeting_diary_change (no unit_id) | as the diary writer | works, but wrong if lodges differ | parent: NEW/OLD row's unit_id |
| member_status_history | trigger log_member_status_change on profiles (no unit_id); fires from admin-import-members (service role, no session) | NOT always | BREAKS imports/status changes from edge functions | parent: the profile's unit_id (NEW.unit_id) |

## 3. The 16 policies

All are signed-in only (auth.uid() role tests). For a signed-in user, current_unit_id() returns the profile lodge, so the profile part is what decides. The fallback could only matter for a signed-in user with a blank profile lodge — there are 0 such profiles now (0 with roles), and handle_new_user refuses accounts without a lodge. So no policy depends on the fallback today. Recommend switching these 16 to my_unit() for one rule everywhere.

## 4. Staged plan (order matters)

| Job | Change | Publish? | Verify | Rollback |
|---|---|---|---|---|
| DB1 | Migration: optional last `_unit text DEFAULT NULL` on get_join_us_costs, get_meeting_pattern, get_public_lodge_figures, get_public_unit_profile, get_lodge_identity; NULL keeps today's behaviour | no (live, backwards compatible) | fingerprints unchanged except new signatures; harness: _unit=A only A, unknown = nothing | old bodies as comments + jobdb1_rollback.sql |
| DB2 | Frontend: unitProfileFetch (raw fetch before React), unitProfile, joinUsCosts, meetingPattern, lodgeFigures send resolveSiteUnit(); unknown site = empty state | YES — Julien publishes | two-lodge mock tests; 320px + axe on Home, Join Us, FAQ, Lodge Profile | revert code |
| DB3 | Triggers take lodge from the parent row: log_member_status_change (NEW.unit_id), log_meeting_diary_change (row unit), sync_festive_board_from_lodge_event (lodge_events.unit_id), diary_move_meeting and diary_add_meeting (meeting/series unit) | no | rolled-back harness: service-role status change lands in profile's lodge | bodies as comments |
| DB4 | Replace the 6 column defaults with explicit values / fill_unit_from_caller (only after DB3) | no | insert as member lands in own lodge; service-role profile status change still logs | restore defaults |
| DB5 | 16 policies: current_unit_id() → my_unit(), PERMISSIVE kept, one migration per table | no | rls_unit_harness, signed-in fingerprint | original text as comments |
| DB6 | Revoke anon from get_unit_setup, save_unit_setup (and get_lodge_identity if no public caller) | no | fingerprints show grant diff only | re-grant |
| DB7 | Wait: Julien confirms the DB2 publish is live and you check public pages | — | — | — |
| DB8 | Remove the fallback from current_unit_id() (profile lodge, else NULL) | no | no-session call to each public function with no _unit returns nothing; with _unit returns data; Home footer still shows lodge | jobdb8_rollback.sql |

Public-empty risks if done out of order: DB8 before the DB2 publish blanks the header/footer on every public page (get_public_unit_profile), Join Us/FAQ costs, Lodge Profile figures and meeting pattern, and the CW booking-details null path. DB4 before DB3 breaks member imports (status history insert refused).

## 5. Possibly missed

- get_unit_setup and save_unit_setup are granted to anon; check their internal guards.
- unitProfileFetch runs before React with a raw fetch, so it needs the site lodge resolved first (extra round-trip; affects first paint/homeSpeed test and the index.html skeleton).
- Native app (Capacitor) origin may not be in unit_domains — resolve-site-unit would return null there.
- Preview and lovable.app hosts must be in unit_domains, or the preview goes empty after DB8.
- Other functions may call current_unit_id() indirectly via these 14 (e.g. get_public_booking_details' NULL path); re-scan before DB8.
- Fingerprint scripts that call these functions with no argument will change at DB8.
- AGENTS.md rule update at DB8.
