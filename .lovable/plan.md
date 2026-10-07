# MMH Number and Rose Croix Number on the member record

MMH Number is already approved. This version adds Rose Croix Number, built the same way, so both go in together.

## What exists today (how Grand Lodge Ref. No. is protected)
- It's stored on the member's record but hidden from ordinary lookups. Only admin, the Secretary, the member himself and a few officer tools can read it, through the private-details lookup.
- It's edited only on the Members Admin "Edit Member" form and saved with the main Save button. That save goes through the member-save function, which accepts only admin and the current Secretary (role or office).
- A safety check in the database stops anyone except admin from changing it directly, including the member on his own record.
- There is no MMH Number or Rose Croix Number yet.

## What I'll build
1. **Two new fields:**
   - "MMH Number" for Mark Masons' Hall. It's the same number across Mark, Royal Ark Mariner and the other companion Orders.
   - "Rose Croix Number" for the Ancient and Accepted Rite (Supreme Council 33°). It's separate from MMH.
   - Both get the same privacy as the Grand Lodge number. They won't show in ordinary lookups such as the Directory or public pages, only through the private-details lookup.
2. **Edit Member form:** both boxes sit next to "Grand Lodge Ref. No.", in this order: Grand Lodge Ref. No., MMH Number, Rose Croix Number. Each has a short hint and saves with the normal Save button. A blank box saves as empty. Each takes up to 40 characters.
3. **Who can change them (checked by the server):**
   - Only admin and the current Secretary, and only through the member-save function.
   - The database safety check now covers both fields too, so nobody else (WM, Mentor, IPM, or the member himself) can change them by any route.
   - There are no separate quick-edit boxes or save actions.
4. **Not changed:** sign-up form, bulk import, Member Development, My Profile and reminder emails.

## Assumptions to correct if wrong
- Members won't see their own numbers on My Profile for now. The Grand Lodge number isn't shown there either.
- Bulk import won't fill these fields yet.

## Checks
- Tests in the database as real people, all rolled back afterwards:
  - The Secretary (Richard) and admin can save both numbers.
  - WM-only, Mentor, IPM and an ordinary member are refused, including the member on his own record.
  - Ordinary lookups can't read either number.
- 320px phone test: the Edit Member form shows all three numbers and nothing overflows.
- Full unit test and phone-width suites.

## Technical details
- One migration:
  - Add nullable `mmh_number` and `rose_croix_number` text columns, each with a `CHECK (char_length <= 40)`.
  - Revoke column SELECT from anon and authenticated.
  - Recreate `get_profiles_pii` so it returns both columns (drop and recreate, same grants).
  - Extend `prevent_privileged_profile_self_edit` to check both columns.
- `admin-invite-member`: add both fields to the schema and profileFields, then redeploy.
- `profilePii.ts` type; `Admin.tsx` form state, loading, saving, and inputs `#form-mmh_number` and `#form-rose_croix_number`.
- Update the AGENTS.md rule on official registration numbers so it covers all three.
