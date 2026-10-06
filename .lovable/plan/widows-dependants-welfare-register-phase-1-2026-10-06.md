# Widows & Dependants Welfare Register — Phase 1

A new "Widows" panel in the Almoner Portal, beside the Welfare board, Life Events, Correspondence, Referrals, Absences and Reports. It uses the same access rules as the rest of the Almoner Portal.

## Who can do what
- Almoner, Secretary and admin can view and edit.
- WM can view only. He sees the same "Read-only view" notice, and every add, edit and log button is hidden.
- IPM and everyone else can't see the panel. The database refuses all their requests.

## Module 1 — Widow register
Each widow record holds:
- **Name:** full name and preferred form of address (for example "Mrs Smith" or "Joan").
- **Address:** her address, plus where she lives: **Own home** or **Care home**. The care home's name and address only appear when Care home is chosen.
- **Phone.**
- **Date of birth:** day and month, with the year optional. If the year is unknown, the record shows "12 March (year unknown)". No made-up year is stored, so age only shows when the year is known.
- **Husband:** his name, plus his Lodge name and number.
- **Connection:** **Weybridge Lodge widow** or **Assigned via SMWA**. Both are treated as equal options. For SMWA widows there is also an SMWA reference and liaison contact.
- **Status:** Active or Deceased. Records are never deleted. Marking a widow Deceased records the date and moves her to an "Inactive" section, the same way Honorary Members are handled. She can be restored if the change was a mistake.
- **Contact interval:** how often she should be contacted, in days. Default 90, adjustable per widow.

**Next of kin** (as many as needed per widow): name, relationship, phone, email and notes. Relationship is a pick-list (Son, Daughter, Neighbour, Friend, Other). Choosing Other opens a free-text box.

## Module 2 — Contact log
- Each contact has: date, type (Phone call, Visit, Card, Letter, Gift, Other), notes, and who logged it. "Logged by" is filled in automatically with the signed-in officer.
- A **Welfare concern** tickbox. Entries with a concern are highlighted, and a filter shows only concerns. The widow's row gets a concern badge while her latest contact is flagged.
- **Next contact due** = date of last contact + her contact interval. With no contacts yet, it counts from when she was added. Overdue widows get the same gentle gold "check-in due" badge used on the Welfare board. Active widows only.
- Gift appears only as a contact type. Full gift tracking comes in Phase 2.

## Layout
- One "Widows" tab, styled like the other panels: navy cards, gold accents, sort by overdue first, and a toggle for active/inactive.
- Opening a widow shows her details, next of kin and contact log stacked vertically, with 48px buttons and nothing overflowing at 320px.

## Not in this build (Phase 2)
- Gift tracking.
- The Almoner's report generator.
- Widows are left out of the existing Reports tab and the daily Almoner digest email.

## Verification
- **Access tests:** run inside rolled-back database transactions as each real person: Almoner (temporary role, as last time), Secretary (Richard), WM-only (Julien with admin temporarily removed), IPM, admin, and an ordinary member. Check read and write on all three tables.
- **Phone-width checks:** 320px checks of the editor view and the WM read-only view.
- **Full suite:** all unit and browser tests.

## Technical details
- **Migration:** new tables `almoner_widows`, `almoner_widow_kin` and `almoner_widow_contacts`.
  - Grants go to authenticated users and service_role only. There is no anon access.
  - Row-level security is on. SELECT uses `public.can_view_almoner()`. INSERT, UPDATE and DELETE use `public.can_edit_almoner()`.
  - DELETE is allowed on kin and contacts only. Widows have no DELETE policy, so records can only be archived.
- **Date of birth:** stored as `dob_day smallint`, `dob_month smallint` and `dob_year smallint null`. A validation trigger checks the date is real; 29 Feb is allowed when the year is unknown.
- **Other fields:** `connection_source`, `home_type` and `status` use CHECK lists. `relationship` is text plus `relationship_other`. `logged_by` defaults to `auth.uid()`. `updated_at` triggers on each table.
- **Due-date logic:** a pure helper in `src/lib/widowContactDue.ts`, with unit tests.
- **Frontend:** new `src/components/members/almoner/WidowsPanel.tsx`, gated by `canEditAlmoner`. `AGENTS.md` gets a one-line rule that new sensitive registers reuse the view/edit pair.
