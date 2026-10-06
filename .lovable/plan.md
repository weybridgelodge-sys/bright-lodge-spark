# Almoner portal: two-tier access (view vs edit)

## What depends on can_access_almoner() today

Database (all gated by the one function, identical for read and write):
- welfare_absences: select / insert / update / delete
- welfare_life_events: select / insert / update / delete
- welfare_correspondence: select / insert / update / delete
- welfare_rmtgb_referrals: select / insert / update / delete
- welfare_member_status: select / insert / update / delete
- welfare_log_entries: select / insert (also logged_by = self) / update / delete
- almoner_reports: select / insert (also created_by = self) / update
- File storage, welfare-attachments bucket: select / insert / delete (no update policy)
- No other database function calls it.

Current function: admin role OR almoner role OR current Almoner office OR current WM/IPM.

App screens (use a separate client-side flag, canAccessAlmoner = admin, almoner role, current Almoner, current WM or IPM):
- Members menu "Almoner" link, Admin hub "Almoner Portal" tile, and the portal page guard.
- Every Almoner panel (Absences, Life Events, Correspondence, Referrals, Welfare board/log, Reports) shows add/edit/delete/upload buttons to anyone who can open the page. There is no read-only mode, so the WM would see buttons that fail once the database is narrowed.
- The Secretary is not included anywhere, so the Secretary currently sees no Almoner link.

Almoner digest email (almoner-overdue-check): sends only to the current Almoner office holder, falling back to anyone with the almoner role. It does not use can_access_almoner, so this change does not affect it. WM, IPM and Secretary never received it and still will not.

Unaffected: is_current_wm_or_ipm stays in use for Treasurer access and elsewhere; only its use for Almoner is removed.

## New rule

| Person | Almoner portal |
|---|---|
| Almoner (role or current office) | read + write |
| Secretary (role or current office, via is_lodge_secretary()) | read + write (new) |
| Worshipful Master (current office) | read only (narrowed) |
| IPM | none (removed) |
| Admin | read + write (kept as baseline; flagged in report for confirmation) |
| Everyone else | none |

WM means the current WM office holder only. The worshipful_master role on its own does not grant access, matching the "current officer" wording. Assumption, to be confirmed in the report.

## Changes

1. New migration:
   - `can_edit_almoner(uid)` = admin OR almoner role OR current Almoner OR is_lodge_secretary-equivalent for that uid.
   - `can_view_almoner(uid)` = can_edit_almoner(uid) OR current WM office.
   - Re-point every SELECT policy (and the storage select) to can_view_almoner; every INSERT/UPDATE/DELETE policy (and storage insert/delete) to can_edit_almoner, keeping the existing logged_by / created_by conditions.
   - Redefine can_access_almoner as a thin alias of can_view_almoner (kept so nothing breaks), with a comment marking it deprecated. Widows & Dependants Register will reuse the two new functions.
2. App: replace canAccessAlmoner with canViewAlmoner and canEditAlmoner in the auth context (adds a current-WM check; IPM no longer counts). Menu link, hub tile and page guard use canViewAlmoner. All Almoner panels hide add/edit/delete/upload controls when not canEditAlmoner, and show a small "Read-only view" note for the WM.
3. Record the two-tier rule in AGENTS.md.

## Verification

- Rolled-back SQL transaction as each real person (current Almoner, Richard as Secretary, current WM, current IPM, an admin, an ordinary member): select, insert, update and delete on each welfare table, almoner_reports and the attachments bucket; results must match the table above exactly.
- Full unit suite; 320px phone check of the Almoner portal in both edit and read-only views.

## Technical details

- Secretary check uses the same logic as is_lodge_secretary() but parameterised by uid (that function reads auth.uid()), so a uid-taking helper is added or inlined.
- No changes to the digest email, Treasurer access or any other module.
