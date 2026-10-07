# MMH Number on the member record

## What exists today (how Grand Lodge Ref. No. is protected)
- Stored on the member's record, but hidden from ordinary reads. Only admin, the Secretary, the member himself and a few officer tools can read it, through the private-details lookup.
- Edited only on the Members Admin "Edit Member" form, saved with the main Save button. The save goes through the member-save function, which accepts admin and the current Secretary (role or office) only.
- A database safety check blocks anyone except admin from changing it directly, including the member on his own record.
- Nothing like an MMH Number exists yet.

## What I'll build
1. **New field "MMH Number"** on the member record, with the same privacy as the Grand Lodge number: not readable in ordinary lookups (Directory, public pages), only through the private-details lookup.
2. **Edit Member form:** a "MMH Number" box right next to "Grand Lodge Ref. No.", with a short hint "Mark Masons' Hall — same number across Mark, RAM and companion Orders". Saved with the normal Save button. Blank saves as empty. Up to 40 characters, like the Grand Lodge number.
3. **Who can change it (checked by the server):**
   - Admin and current Secretary, through the member-save function only.
   - Database safety check extended so nobody else (WM, Mentor, the member himself) can change it by any route.
   - No separate quick-edit box and no separate save action.
4. **Not changed:** sign-up form, bulk import, Member Development, My Profile, reminder emails. No Rose Croix (or other Order) number.

## Assumptions to correct if wrong
- The member can't see his own MMH Number on My Profile for now (the Grand Lodge number isn't shown there either). Easy to add read-only later.
- Bulk import won't fill it yet. Can add a column later if you'll be bringing these in from a spreadsheet.

## Checks
- Real-person tests in the database, rolled back: Secretary (Richard) and admin save it; WM-only, Mentor, IPM and an ordinary member (including on his own record) are refused; ordinary lookups can't read it.
- 320px phone test: Edit Member form shows both numbers, nothing overflows.
- Full unit and phone-width suites.

## Technical details
- Migration: `ALTER TABLE profiles ADD COLUMN mmh_number text` + `CHECK (char_length <= 40)`; `REVOKE SELECT (mmh_number) ... FROM anon, authenticated`; `CREATE OR REPLACE get_profiles_pii` adding `mmh_number` to the return type (drop/recreate since the return shape changes, same grants); `CREATE OR REPLACE prevent_privileged_profile_self_edit` adding the `mmh_number` comparison.
- `admin-invite-member`: add `mmh_number` to zod schema and profileFields; redeploy.
- `profilePii.ts` type, `Admin.tsx` form state/load/save/input `#form-mmh_number`.
- Update AGENTS.md rule for official registration numbers to cover both.
