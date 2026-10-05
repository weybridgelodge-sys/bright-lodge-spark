# Grand Lodge Ref. No. — move into Edit Member, Secretary/admin only

## What I found

**The screen:** Members Admin (`/members/admin`), the "Members" list. Each member row has a small "Grand Lodge Ref. No." box with its own Save button under the member's name.

**Why it was built like that:** it came from the monthly "missing Grand Lodge number" reminder work. At the time the Secretary couldn't save the Edit Member form at all, so you picked option A: a quick-edit box on the list that saves on its own. The reminder email links straight to that box. Later the Secretary was given full Edit Member access, but the number was never added to that form. So today the form has no Grand Lodge number field, and the box on the list is the only way to set it.

**Who can see it today:**
- The box only shows to admin and the Secretary (role or current office). Nobody else can open the Members list.
- The number itself is private, like phone and address. Only you, the Secretary, the member himself, and a few officer tools (Member Development, Installation Return) can read it, through the private-details lookup.

**Who can change it today (the real problem):**
- The box saves through a separate database action that allows **admin, Secretary AND the Worshipful Master** (role or current office). The WM can't see the box, but he could still change any member's number by calling that action directly. That's wider than you want.
- Member Development page: the profile section there also tries to save the number (for admin, WM or the assigned Mentor). The database blocks that write, so it fails for everyone. Because it fails, it also quietly throws away the Royal Arch date and proposer saved alongside it, and shows "require admin permission".
- Sign-up form: a new member can type his own number when he registers. This only happens once, when the account is created. I'll leave it as is unless you say otherwise.
- Bulk import (admin/Secretary only) fills in blank numbers. No change.

## What I'll change

1. **Edit Member form:** add "Grand Lodge Ref. No." as a normal field next to the other details. It saves with the main Save button, the same way as everything else.
2. **Members list:** remove the separate box and its Save button. The reminder email link (`/members/admin#member-<id>`) will open that member's Edit Member form with the field in focus.
3. **Permissions, checked by the server:**
   - The member-save function (`admin-invite-member`) accepts and saves the number. It already allows admin and the Secretary only.
   - The separate database action is tightened to admin + Secretary only, so the WM can no longer change numbers. It stays in place only so nothing else breaks; no screen uses it any more.
4. **Member Development page:** the number becomes read-only there. That page stops trying to save it, so Royal Arch date and proposer save properly again.
5. Delete the now-unused separate box.

## Checks
- At database level, as the real Secretary, admin, WM, Mentor and an ordinary member: only Secretary and admin can save the number. Everything runs inside a transaction that is rolled back.
- Update the 320px phone test so the Secretary's Edit Member form shows the field and nothing overflows.
- Run the full unit and phone-width suites.

## Technical details
- New migration: `CREATE OR REPLACE set_member_ugle_reg_number` without the `worshipful_master` role/office checks.
- `admin-invite-member`: add `ugle_reg_number: z.string().trim().max(40).optional().nullable()` to the schema and profileFields. Blank saves as null.
- `Admin.tsx`: add a form field and load it into the edit form from the profile row (already merged from `get_profiles_pii`). Rewrite the hash handler at line ~217 to open edit mode and focus `#form-ugle_reg_number`.
- `ProfileSection.tsx`: drop `ugle_reg_number` from the update and show it as a read-only Field.
- No change to the reminder function or the private-data rules.
