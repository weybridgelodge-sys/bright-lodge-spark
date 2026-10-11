# Fix Member Admin Users in portrait

## Findings
- The Users list on `/members/admin` uses a six-column table with a pinned Actions column. At 320px, that column is wider than the available list space and overlays the member name even at horizontal scroll position zero. This was reproduced visually in the local, synthetic-identity preview.
- The page is covered by route-wide overflow checks and a Secretary-specific test. Those checks inspect document width and control positions, not whether a name is readable or covered. The generic route check also does not supply member rows; Secretary coverage has fewer actions than admin.

## Changes
- Below the desktop breakpoint, present each member as a stacked row: full wrapping name and email first, status and other existing details next, actions underneath. No sideways scrolling or pinned actions on phones.
- Keep the existing desktop table and all permissions, save handlers, confirmation prompts and member data unchanged.
- Retain one rendering of each member and each control so existing deep links and edit actions remain consistent.
- Strengthen regression coverage with populated, long-name admin and Secretary lists at 320px and a typical portrait phone width. Check name width, wrapping, lack of clipping/overlap, action reachability and opening the correct member for editing.

## Technical details
- Apply breakpoint-scoped stacked table styling in the existing Member Admin screen; pinned cells apply only at desktop widths.
- Keep existing controls and use the shared Button for changed action controls with 48px touch targets.
- Record the layout/testing rule in AGENTS.md and track verification in roadmap.md.

## Verification
- Inspect actual rendered portrait screenshots, including the admin's full action set, using localhost-only e2e identity and synthetic member records.
- Verify desktop remains a table; run the full unit and 320px browser suite and check preview errors.
- No backend changes, real member edits or publishing.