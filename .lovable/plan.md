# Subscriptions split, Direct Receipt modes, accrual, fund tags

## What I found before building (some of this changes the brief)

1. **There is no automated October accrual.** No scheduled job, database function or edge function creates it. Entry #128 was a one-off direct insert on 11 Sept 2026 (no author, no period). It was a flat £250 × 20 members. So Changes 3 and 4 mean *building* the accrual, not rebuilding one.
2. **The age rule doesn't match.** #128 used no age logic at all. The only age logic that exists (the online dues calculator) gives **50% to under-21s**, judged at 1 October. The Direct Receipt screen and your brief say **under-25**. I'll use **under-25 at 1 October** for the accrual. Members with no date of birth get the full rate and are listed as a warning in the preview.
3. **The exemption bug is in the dues calculator.** It only exempts a Treasurer or Secretary with an appointment row for that exact year. The new accrual uses the most recent Treasurer and Secretary appointment on or before that year. The dues calculator gets the same fix, so online dues match.
4. **Today's renewal posts reserves differently.** It books £250 to Debtors, then moves £39 from **3000 General Fund** into 3100. Your new split credits 4000/3100/2200 straight from the subscription, and 4000 shows £211. I'll follow your model. Nothing already posted will change.
5. **Your arithmetic checks out.** Full rate: £211 + (£10 + £9 + £10) + £10 = £250. Under-25: £105.50 + (£5 + £4.50 + £5) + £5 = £125. Pots and Relief Chest are exactly half; 4000 takes the remainder.
6. **Precedent for bulk entries:** #128 and the charity/booking postings each use one entry with many lines. The accrual follows that: one balanced entry, with one Debtor line and five split lines per member.
7. **Ledger lines have no member field.** Member matching today relies on the line description, e.g. "Julien Tidmarsh". Mode 2 lists outstanding Debtor lines by member name taken from that text.

## What gets built

**Change 1: reserve pots**
- Retire "Master's Fund". Its row is deleted from the pots list, and the fallback list is updated.
- Add a **Relief Chest share** setting, £10 full rate / £5 under-25, posting to 2200 with no fund tag.
- Almoners, Initiates & Regalia and Tyler stay on 3100, each tagged with its pot.

**Change 2: Direct Receipt**
The tick-box becomes a three-way choice:
- **New candidate's first subscription:** Dr 1000 Bank. Cr 4000, Cr 3100 ×3 (tagged), Cr 2200. Uses the full or under-25 rate.
- **Clear a prepayment:** shows unmatched Debtor lines from accruals and lets you tick one or more members. Each posts Dr 2100 / Cr 1100 for that member's amount, as its own pair of lines.
- **In-year payment against October's charge (default):** Dr 1000 / Cr 1100 only. The old reserve-transfer second entry is removed, because the split now happens at accrual.

**Change 3: accrual tool**
Treasurer → a new "Annual accrual" panel with Preview, then Post for a chosen year.
- Refuses to post if an accrual already exists for that year. #128 counts, so 2026/27 can never be re-run or touched.
- Posts on 1 October into the October period.
- It's a button the Treasurer presses, not a timed job. That avoids a job running all year for a once-a-year task. Say if you want it automatic.

**Change 4: exemptions**
- Uses the most recent Treasurer and Secretary holders, as above.
- #128 is left exactly as it is.

**Change 5: General Journal**
- Adds a "Reserve pot" picker on any line posted to 3100, saved as the line's fund tag.

## Technical details
- Data change: remove the MASTERS_FUND row.
- Migration: add `relief_chest_pence` to `subscription_settings` (default 1000).
- Migration: new SECURITY DEFINER `subscription_accrual_preview(_year)` and `post_subscription_accrual(_year, _period_id)`, restricted to Treasurer/admin, with source_type `subscription_accrual`. The duplicate guard also catches the #128 description pattern for 2026/27.
- Migration: update `dues_calculate_amount` to use the latest appointment on or before the year.
- Pure split helper `src/lib/treasurer/subscriptionSplit.ts` with tests: £250 and £125 splits, pence rounding, and a balanced entry. Update DirectReceiptTab, GeneralJournalTab and subscriptionSettings, and record the rule in AGENTS.md.
- Finish with the full test suite and build. Nothing published.

## Please confirm
- Under-25 at 1 October, not under-21, for the accrual rate.
- Whether the online dues calculator should also switch to under-25. As planned, only its exemption fix changes.
