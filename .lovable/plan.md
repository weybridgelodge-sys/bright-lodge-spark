# Disengagement Risk: use the Tier 1 rule

## Finding for #2 (checked against the live register)
Both clear the new rule on their own. No exception is needed.

| Member | 18 Feb | 13 May | 12 Sep | Unexcused misses |
|---|---|---|---|---|
| John French | Booked | Apologies | Apologies | 0 |
| Anthony Mallard | Booked | Apologies | Apologies | 0 |

Both apologised for both of the last two meetings, so neither has 2 consecutive unexcused misses or 3 in the lodge year.

Under the new rule, only one subscribing member would appear: **William Aldington-Smyth** (apologies in Feb, no record in May or Sep, so 2 consecutive unexcused misses). Chris Burgess also has no entries but stays excluded because he is honorary.

## Change
- Disengagement Risk calls the same Tier 1 evaluator the Almoner Auto-Log uses (`evaluateAutoLog`, Tier 1 results only). The rule is in one place, so the dashboard and Auto-Log can't disagree.
- A member is flagged for 2 consecutive unexcused misses, or 3 unexcused misses in the current lodge year (Oct to Sep). An apology excuses only its own meeting.
- The KPI keeps its own scope: active, non-honorary members only. The Auto-Log still includes honorary members.
- The card's wording changes from "missed all of the last 3" to describe the new rule. Each flagged member shows which rule they hit and the dates.

## Points to confirm (current assumptions in brackets)
- **Welfare absences:** today the KPI excuses meetings covered by a recorded welfare absence, but Tier 1 does not. To keep the two identical, I'll add the same absence cover to the shared evaluator, so Auto-Log stops logging meetings covered by a recorded absence. (Assumed yes. If no, the KPI loses absence cover instead.)
- **First-year members:** Tier 1 skips meetings in a member's first 12 months, because Tier 2 covers those. The KPI will skip them the same way. (Assumed yes.)
- **Start date:** both apply the 18 Feb 2026 start. Meetings before it are ignored. (Assumed yes.)

## Verification
- Unit tests: the KPI matches Tier 1 on shared cases (2 consecutive misses; 3 in the year; an apology breaks a streak; honorary members excluded from the KPI only). Add a regression test with the French and Mallard pattern showing they are not flagged.
- Check the KPI list against live data: Aldington-Smyth only.
- Run the 320px check on the KPI page and the full test suite.
