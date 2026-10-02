# Officers' year vs financial year: diagnosis and proposal

This is a diagnosis only. No code, roles, appointments or data have been changed.

## 1. Latest row for each office (all years)

All rows are confirmed unless marked otherwise. "Year" is the lodge_year saved on the row. The two odd appointed_on dates for Membership Officer and Treasurer are explained after the table.

| Office | Holder | Year | Appointed on |
|---|---|---|---|
| Worshipful Master | Julien Tidmarsh | 2026 (a 2025 row also exists) | 15 Jun 2026 |
| Secretary | Richard Smith | 2026, added by me (a 2025 row also exists) | 18 Oct 2023 |
| Treasurer | Jonathon Scott | 2025 | 20 Oct 2021 |
| Auditor 1 / Auditor 2 | Kevin Brennan / John Coleman | 2025 | 15 Oct 2025 |
| Almoner | John Coleman | 2025 | 21 Oct 2026 |
| Charity Steward | Kenneth Holdsworth | 2025 | 15 Oct 2025 |
| Immediate Past Master | Murray Grubb | 2025 | 15 Oct 2025 |
| Senior Warden / Junior Warden | Ben Connolly / Kenneth Holdsworth | 2025 | 15 Jun 2026 |
| DC / ADC | Ben Connolly / David Blackburn | 2025 | 21 Oct 2026 |
| Chaplain, Mentor, Tyler, Assistant Tyler | Brennan, Poole, Poole, Joshua Bishop | 2025 | 2024–2026 |
| Membership Officer | Ben Connolly | 2025 | 18 Oct 2017 |
| Deacons, Inner Guard, Senior Steward, Stewards 1–2 | Cooper, Burrell, Gower, Aldington-Smyth, Vrtak, Blackburn | 2025 | 17 Jun 2026 |
| Stewards 3–5 | Peter Law | 2027–2029 | projections only |

Every office has a holder. Richard's entries went into **lodge_year 2025**, because the Officers Tracker treats the officers' year as starting on the third Wednesday in October (21 Oct 2026). Before that date, 2025 counts as the current year. The 2026 rows are mostly projections. The only confirmed 2026 rows are Julien's WM row and the Secretary row I added.

**Possible data problem (please confirm):** several 2025 rows have appointed_on **21 Oct 2026** (Almoner, DC, ADC, Chaplain, Mentor). These look like the officers taking office at this year's Installation, but they are saved under the officers' year that ends on 20 Oct. The Treasurer row shows 20 Oct 2021, the date he first took the office. Steward 1 is still Pavel Vrtak, who has resigned.

**Holding two offices in the latest year (2025):**
- Ben Connolly: Senior Warden, DC and Membership Officer
- Kenneth Holdsworth: Junior Warden and Charity Steward
- John Coleman: Almoner and Auditor 2
- Kevin Brennan: Chaplain and Auditor 1
- David Poole: Mentor and Tyler
- David Blackburn: ADC and Steward 2

Richard holds only Secretary.

## a. How the year is worked out today

- `current_lodge_year()` (database) is October-based: it returns 2026 from **1 October**. `is_current_officer()` and `is_current_wm_or_ipm()` check that **lodge_year equals current_lodge_year() exactly**. There is no carry-forward and no Installation date. So since 1 Oct 2026, every officer check in the database looks for 2026 rows, which mostly don't exist.
- The Officers Tracker uses a **different** rule: `masonicYear()` in `src/lib/officersProgression.ts` (L106–118) starts the officers' year on the third Wednesday in October. It is still 2025 there.
- **Stored Installation date:** there is no setting for it. The only record is the lodge event "Weybridge Lodge Installation Meeting and Charitable White Table" on **21 Oct 2026 at 17:30 UK time**, which is free text. Nothing reads it for officer purposes.

## b. Every place that uses an appointment

"Exact" = matches lodge_year exactly. "Latest" = uses the latest row on or before the year. "Wrong from 1 Oct to Installation" means for (i) non-progressive and (ii) progressive offices.

| Where | Rule | Year source | Wrong from 1 Oct to Installation? |
|---|---|---|---|
| `is_current_officer` (used by Treasurer, Auditors, Secretary checks) | Exact | 1 Oct | (i) yes, holder lost; (ii) yes |
| `is_current_wm_or_ipm` (Almoner access, Treasurer view) | Exact | 1 Oct | (ii) yes: Grubb (IPM) lost; Julien kept only because of his 2026 row |
| useAuth flags `isCurrentTreasurer/Auditor1/Auditor2/Secretary`, `isCurrentWmOrIpm` (useAuth L141–152) | Uses the two functions above | 1 Oct | yes / yes |
| Treasurer module: edit transactions, lock periods, unlock request/approve, pending approvals, year audit submit/review/remarks, `can_view_year_audit` | is_current_officer | 1 Oct | (i) yes; (ii) WM yes |
| `can_manage_secretary_returns`, `can_manage_meeting_minutes` | role **or** exact officer | 1 Oct | role holders unaffected; officer-only route yes |
| `current_office_label`, `get_officers_public` (public Officers page) | Exact | 1 Oct | yes / yes. The public page shows only the 2026 rows, which are mostly projections. |
| `get_lodge_health_aggregates`, KPIs (`src/lib/kpis.ts` L375) | Exact | October-based (as passed in) | yes / yes |
| Automated emails: unlock-request notify, year-audit notify, summons email officer list, Almoner overdue check | Exact | current_lodge_year | yes, these go to nobody or the wrong people |
| Dues exemption (`dues_calculate_amount`, `subscription_exempt_member_ids`), Breakeven (L70) | **Latest** Secretary row | Financial year | No. This is correct and should stay on the financial year. |
| Officers Tracker | Exact, but on the Installation-based year | 3rd Wednesday | Correct until 21 Oct. Then 2026 becomes current, and the officers Richard entered under 2025 stop being "current". |
| UGLE Installation Return (`installationReturn.ts` L93–105) | Latest, with progressive offices exact for the return year | Year chosen on screen | No, as long as the right year is picked |
| Provincial Return | Exact for WM/IPM; Past Masters roll by IPM year | Year chosen | No |
| Appointment letters | Not found in the code | — | n/a |

Role-based checks are **not** affected by the year: Secretary, WM, Almoner, Charity Steward, DC and admin roles, plus `canManageSummons`, `canAccessCharity`, `canManageProgression` and `can_access_almoner` (via the almoner role).

## c. Current access for named officers

- **Jonathon Scott (Treasurer): no working Treasurer access.** He has no 2026 row and no role, so `is_current_officer('treasurer')` is false. He can't edit transactions, lock periods or approve unlocks, and isn't emailed unlock requests.
- **Auditors (Brennan, Coleman): no access** to the Treasurer portal or the year audit, for the same reason.
- **Almoner (Coleman): no Almoner Portal access.** Access is by the `almoner` role, or by being current WM or IPM. Nobody has the almoner role, so the appointment never granted access, even before 1 October.
- **Charity Steward (Holdsworth): no Charity Portal access.** Access is by the `charity_steward` role only, and nobody has it. Also role-based, not year-based.

The only role entries are Julien (admin) and Richard (secretary).

## d. The two additions I made for Richard

- **2026 Secretary row:** this was needed under today's rules, for the joint unlock approval, Treasurer read-only access and audit review. Under the proposed carry-forward rule it becomes unnecessary, and **I'd remove it** so it can't be mistaken for an officers'-year entry.
- **"secretary" role:** this was needed for the menu, Secretary Portal, Summons Builder, Rehearsal pages and Festive Board, because those check roles only. Under the proposal, **I'd keep it for now**. You could later make the current Secretary appointment grant the same access, and then remove the role.

## e. Proposal (not applied)

**Rule:** the current holder of an office is the latest confirmed appointment that has already taken effect. A row for officers' year Y takes effect on the Installation date for year Y. Non-progressive offices carry forward until a newer confirmed row replaces them. Progressive offices change only at Installation. Financial-year logic (dues, accounts, periods, `current_lodge_year()` as used by the Treasurer) stays unchanged.

**Changes:**
1. Store the Installation date per officers' year, for example a small setting or table keyed by year (2026 = 21 Oct 2026). If none is entered, fall back to the third Wednesday in October, matching the Tracker.
2. New database function `current_officer_year()` based on that date. Rewrite `is_current_officer`, `is_current_wm_or_ipm` and `current_office_label` so that, for each office, they use the latest confirmed row whose year is on or before `current_officer_year()`. Projections are ignored. Update `get_officers_public` the same way, and the officer lookups in the 4 automated email functions (notify-unlock-requested, notify-year-audit, send-summons-email, almoner-overdue-check).
3. Front end: `src/hooks/useAuth.tsx` needs no logic change, because it calls the database functions. `src/lib/officersProgression.ts` should read the stored Installation date instead of calculating it. Fix `kpis.ts` the same way.
4. Leave unchanged: dues exemption (already "latest on or before", on the financial year), Treasurer periods, budgets, year close, Installation and Provincial Returns.
5. Data, which needs your confirmation: decide which year the 2025 rows dated 21 Oct 2026 belong to. Then remove my 2026 Secretary row. I'd also remove Julien's 2026 WM row only if the 2025 row covers the same thing; otherwise keep it.

**Risks:**
- The Installation-date setting must be kept up to date each year. If the meeting moves, access changes on the wrong day.
- Carry-forward means a resigned non-progressive officer keeps access until someone records a replacement. Removing an officer must be an explicit step.
- Ambiguous existing rows (the 21 Oct 2026 dates under 2025) could put the wrong person in an office after Installation unless they are tidied first.
- The year-audit and unlock workflows are permanent and can't be undone. Changing who counts as Treasurer or Secretary mid-workflow affects pending approvals, so check that none are pending before switching.
- The Officers Tracker and the public Officers page will show different people after the change. That is intended, but brethren may notice.
- Roles such as almoner and charity_steward would still be separate from appointments. A follow-up decision is needed on whether appointments should grant those portals.
