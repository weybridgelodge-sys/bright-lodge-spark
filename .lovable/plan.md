# Secretary menu access: diagnosis and proposal

No changes have been made. This report is based on read-only checks of the live records and the code.

## 1. Richard's records

- **Roles:** `member` and `secretary` (I added `secretary` earlier today). He has no admin role.
- **2026/27 appointments:** Secretary only. He holds no other office.
- **Does anyone hold two offices in 2026/27?** No. The year currently holds 8 rows, and 6 of them are only projected ("projection"). Only two are confirmed: Julien (WM) and Richard (Secretary).
- **Something to check:** these rows don't look like a complete officer list for 2026/27. There is no Treasurer, Auditor, Chaplain, Almoner, Charity Steward, DC, Mentor or Deacon for 2026/27. Either Richard's entries didn't save, or he entered them somewhere other than this year's officer list. Until a Treasurer is appointed, nobody but admin can edit transactions or give the Treasurer's half of the joint unlock approval.

## 2 and 3. Why each item appears

All five menu items are in `src/components/members/MembersLayout.tsx`. The access flags they use are worked out in `src/hooks/useAuth.tsx`, lines 230–235. None of them uses an officer appointment except the Treasurer Portal, and Richard only reaches that through the Secretary appointment.

| Menu item | Rule | Who sees it | Why Richard sees it |
|---|---|---|---|
| Charity Steward Portal | MembersLayout L60 `canAccessCharity`, defined at useAuth L234: admin, WM role, charity_steward role, **secretary role** | Those roles | (c) A rule deliberately lets the Secretary in, switched on by the role I added |
| Mentor Portal | MembersLayout L65 `isAdmin \|\| canManageProgression`, defined at useAuth L230: admin, **secretary role**, WM role | Those roles. There is no separate "mentor" role. Mentors are linked to members one record at a time. | (c) The Secretary is let in as a "progression manager" |
| Secretary Portal | MembersLayout L70 `canManageSummons`, defined at useAuth L232: admin, secretary role, assistant_secretary role | Those roles | (a) Intended |
| Treasurer Portal | MembersLayout L75 `canAccessTreasurer`, defined at useAuth L235: admin, current Treasurer, Auditor 1 or Auditor 2, WM role, current WM or IPM, **secretary role, current Secretary** | Those roles and officers | (a) and (b) Intended: read-only, plus the joint unlock approval |
| Admin Hub | MembersLayout L80 `canAccessAdminArea`, defined at useAuth L236: admin, secretary, WM, DC, almoner, charity_steward, assistant_secretary roles, plus current Treasurer, Auditor 1 and Auditor 2 | Most officer roles. It works as a page of shortcuts for officers, not an admin-only page. | (c) Deliberately open to officers |

## What the Secretary can do inside each one

- **Admin Hub** (`AdminHub.tsx`): only shortcut cards. He sees Charity Steward, Mentor, Secretary, Treasurer, Polls & Voting, and Newsletter if the newsletter permission allows him. The Document Archive, Ritual Library and Dues cards are admin-only. The hub page itself grants no extra power.
- **Mentor Portal**: he can see all active members' development records. The database also lets the `secretary` role **edit** any member's development record (`can_edit_member_development`). He cannot see the Skills Matrix, which is limited to admin, WM and DC.
- **Charity Steward Portal**: **view only.** The database lets the Secretary read charity data (`can_view_charity`), but only admin, WM and Charity Steward can edit or post (`can_edit_charity`).
- **Treasurer Portal**: view only. Only admin or the current Treasurer can edit transactions (Treasurer.tsx L288) and periods (L67). He can give the Secretary's half of the joint unlock approval.

## 4. What doesn't match your model, and what I propose

Not intended under your model:
1. **Charity Steward Portal** shows for the Secretary.
2. **Mentor Portal** shows for the Secretary, and he can edit development records.
3. **Admin Hub** shows for the Secretary and most other officers. Whether this is wrong depends on your decision below.

All of the proposed changes affect shared rules. Here is what would change for everyone:

- **A. Charity Steward Portal:** remove the Secretary from `canAccessCharity` (useAuth L234) and from the Admin Hub card (AdminHub L31). Remove the `secretary` role from `can_view_charity` in the database. Admin, WM and Charity Steward keep access. WM access stays because it is in the current rule. Tell me if you want to remove WM too.
- **B. Mentor Portal:** remove the Secretary from `canManageProgression` (useAuth L230). **Side effect:** that same flag also controls the KPI Dashboard and Officers Tracker cards in the Secretary Portal and those two pages. To avoid taking those away from him, I'd add a separate "mentor access" flag (admin, WM, DC) for the menu, the Mentor Portal page check (MentorDashboard L42) and the hub card. I'd leave the KPI and Officers Tracker rule unchanged. I'd also remove the `secretary` role from `can_edit_member_development`, so assigned mentors, WM and admin can still edit. Note: there is no Mentor office or role, so the "Mentor sees the Mentor Portal" rule currently means individual mentors linked on records. Tell me if you want the Lodge Mentor office (if one exists in the officer list) to get access as well.
- **C. Admin Hub:** two options.
  - **C1, admin only:** make `canAccessAdminArea` equal to admin. The Almoner, DC, Charity Steward, Assistant Secretary, Treasurer and Auditors would lose the hub link. They would keep their own portals, which already have their own menu links, except Polls and Newsletter. Those are only reachable through the hub, so the WM and Secretary would lose their only route to Polls & Voting unless I add a direct link.
  - **C2, keep it open but trim it:** leave the hub open to officers. Each person then sees only their own cards, which already happens after changes A and B.
- **Not changed:** the Secretary Portal and the Treasurer Portal (read-only, plus the joint unlock approval).

## Decisions needed

1. Approve A (remove the Secretary from Charity) — and should the WM keep access?
2. Approve B with a separate mentor flag, so the Secretary keeps the KPI Dashboard and Officers Tracker?
3. Choose C1 (Admin Hub admin-only, plus direct links for Polls and Newsletter) or C2 (keep the hub open to officers).
4. Check the 2026/27 officer list: should I look into why only the Secretary and WM are confirmed and no Treasurer is entered?

Once you approve, I'd check the changed menus at 320px wide, run the full test suite, and ask Richard to sign out and back in.
