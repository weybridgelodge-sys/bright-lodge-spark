# Fix KPI Candidates "jump to top" after a change

## What I found
- **Cause here:** every change in the Candidates list tells the KPI page to reload everything. That reload switches the page's "loading" flag on, which swaps the whole dashboard for a "Loading KPIs…" line for a moment. The page gets very short, the browser loses its place, and when the dashboard comes back you are at the top. The Candidates list does the same on its own scale (it swaps itself for "Loading…" after each change).
- **Same bug as 6 October?** Yes, same cause, but separate code. The Officers Tracker fix added a "only show the loader on the first load" guard inside that one page. Nothing shared was changed, so other pages kept the old habit.
- **Is it shared?** There is no shared component behind it. It is a repeated copy-and-paste habit: a page loads its data, shows a loader on *every* reload, and its sub-sections ask it to reload after each save. A scan of the portal finds the same habit on:
  - KPI Dashboard (this bug, also the succession-risk "Save" on the same page)
  - Treasurer: the Bank Reconciliation tab triggers a full Treasurer reload, which blanks the page
  - Ritual Admin: reload after save blanks the list
  - The Candidates list itself
  - Officers Tracker already fixed; Almoner Portal only blanks on first load (fine)

## What I'll do
1. Add one small shared helper so a page shows its loader only the first time, then refreshes quietly in place. This is the general fix, so future screens use it rather than repeating the guard.
2. Use it on the KPI Dashboard and the Candidates list (the reported bug).
3. Apply it to Treasurer and Ritual Admin as well, since they have the identical cause. Their screens and saving stay the same; only the blanking stops.
4. Switch Officers Tracker to the shared helper so there is one way of doing it.
5. Add a project rule: reloads after a save must never replace the page with a loader.

## Checks
- Browser test: on the KPI page, scroll down, change a candidate's stage and initiation date, and confirm the page stays where it was. Same check on Ritual Admin.
- 320px phone-width check of the Candidates list.
- Full unit and phone-width suites.

## Technical details
- New `src/hooks/useInitialLoading.ts` (or a `loadedOnce` ref pattern wrapped as a hook): `start()` sets loading only before the first successful load.
- No database or permission changes.
