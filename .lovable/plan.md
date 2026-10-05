# Dietary requirements on profiles + bulk member import

## What I found
- **Two table-plan exports exist, with different column names.** Event Accounts uses `Name, Group, Meal, Special req., Gender, VIP, Notes` (one row per guest, guests have no link to a member). The Festive Board export uses `Title, First Name, Last Name, Group, Meal, Special requirements, RSVP status`, and each row is linked to a member.
- **The public booking form doesn't check who is signed in.** It has one shared "Allergy / Dietary Requirements" box that covers "yourself or guests".
- **The Festive Board export already has a fallback chain:** what's typed on the register first, then the booking's dietary box.

## 1. Dietary requirements
- **Database:** new migration adding a nullable `dietary_requirements` text column (max 500 chars) to profiles. Because allergies are health data, I'll treat the column as private, the same way as phone and address. It's left out of general member reads and returned only through `get_profiles_pii`, which is widened to include it. It can be read by the member, admin, the Secretary, and the people who already see private details.
- **My Profile:** new editable box in "Your contact details". The member saves it through the normal profile update, which existing rules already limit to his own row.
- **Member Admin:** shown and editable on the Edit Member form via `admin-invite-member`. The new field is added to the function's check list. It works for admin, and for the Secretary in line with his current member-data rights.
- **Table-plan export:**
  - Festive Board export: no change to column names. Members' "Special requirements" falls back in this order: what's typed on the register, then the booking, then the profile.
  - Event Accounts export: guests aren't linked to members, so the profile value can't be used reliably. It stays as it is unless you want name-matching (see question 2).
- **Booking form pre-fill:** see question 1. This is more involved than it looks.

## 2. Bulk member import
- **Where:** an "Import members (CSV)" button on Members Admin, next to "Pre-create a member".
- **Steps:**
  1. Download a template.
  2. Upload a file.
  3. Preview each row as **New / Fill blanks / No change / Error**, with reasons.
  4. Confirm.
- **New function `admin-import-members`:** up to 500 rows per run, with every row checked.
  - **Matching:** by email (case-insensitive) first, then by Grand Lodge number.
  - **New person:** creates the sign-in and profile the same way as "Pre-create a member" (default status *pending*, or a status column).
  - **Existing person:** fills only fields that are blank today and never overwrites anything. Re-running the same file changes nothing.
  - **Never touched:** roles, sign-in email of existing members, and status of existing members.
  - **Report:** created / filled / skipped / errors for each row. Nothing is emailed to members.
- **Columns:** title, first_name, middle_name, last_name, preferred_name, email, phone, address lines 1–3, town, county, postcode, date_of_birth, initiation_date, passing_date, raising_date, joined_lodge_date, degree, grand_lodge_number, provincial_rank, grand_rank, post_nominals, is_past_master, is_royal_arch, is_honorary_member, dietary_requirements, status. Dates can be dd/mm/yyyy or yyyy-mm-dd.
- **Ready for other lodges later:** no lodge name or number is hardcoded in the import. The mapping and checks sit in one shared helper, and the function takes only rows. A future lodge setting can be added without rewriting it.

## Checks
- Database tests acting as Richard (Secretary), admin, a Mentor and an ordinary member, rolled back:
  - dietary read/write permissions
  - import create / fill-blanks / re-run makes no changes / role fields ignored
- Unit tests for CSV parsing, matching and the fill-blanks merge.
- 320px checks for My Profile, the Edit Member form and the import dialog, then the full suite.

## Open questions
1. **Booking pre-fill.** I recommend pre-filling only when a signed-in member is booking, with his own profile value, and only while the box is empty. He can still edit it. Two complications:
   - The box is shared with guests, so the pre-filled text covers only him.
   - The form would need to read who is signed in, which it doesn't do today.

   Pre-fill on that basis, or keep the two separate?
2. **Event Accounts export:** leave it as is (guests aren't linked to members), or match guest names to members to fill blanks? Name matching can pick the wrong person.
3. **Who can import:** admin only, or admin plus the current Secretary? This follows your "Secretary owns member data" rule. I'd suggest both, with roles still out of reach.
4. **Dietary visibility:** OK to keep it private (member, admin, Secretary, existing private-details readers, and the Festive Board export) rather than visible to every member in the Directory?
5. **Import status for new people:** default *pending* or *active*? I'd suggest *active*, since an onboarding roster is existing members.
