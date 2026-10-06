# Gift "Funded by" — add Lodge account and Almoner fund

## What I found
Each gift stores funding in one column, `funding_collection_id`, which must point at a real Charity Steward collection (raffle). Empty means "Not linked". The raffle "already allocated" totals count only gifts linked to that collection. The AI report doesn't use funding at all.

## Design
- New column `funding_source` on gifts with four allowed values: `none`, `lodge_account`, `almoner_fund`, `raffle`. Default `none`.
- `funding_collection_id` stays as it is, and is only filled in when `funding_source = raffle`. A database rule enforces this: raffle needs a collection, and the other three must have none.
- Existing gifts are backfilled: linked ones become `raffle`, the rest `none`.
- No fake rows in the Charity Steward log, and its access rules don't change. Raffle allocation totals keep working unchanged.

## Form and display
- Label becomes "Funded by".
- Order: Lodge account, Almoner fund, then each raffle collection (Christmas first, as now), then "Not linked" at the bottom. Lodge account and Almoner fund are the first two real choices, and "Not linked" stays as the fallback. A new gift still starts on "Not linked" so nothing is assumed.
- Detail line: "Funded by: Lodge account", "Funded by: Almoner fund", "Funded by: Raffle — <meeting, date>" or "Funded by: Not linked".

## Checks
- Rolled-back tests as Almoner, Secretary, admin (can save each of the four sources), WM-only (read-only, saves refused), IPM and ordinary member (refused). Plus a check that bad combinations are rejected, such as Lodge account with a collection, or raffle without one.
- A 320px check of the gift form with the new dropdown, then the full suite.

## Technical details
- Migration: `ALTER TABLE almoner_widow_gifts ADD COLUMN funding_source text NOT NULL DEFAULT 'none'`. Backfill comes before the CHECKs: `funding_source IN (...)` and `(funding_source = 'raffle') = (funding_collection_id IS NOT NULL)`. RLS and grants are unchanged.
- The dropdown value encodes `lodge_account` / `almoner_fund` / `none` / a collection id, mapped to the two columns on save. A small label helper gets a unit test.
