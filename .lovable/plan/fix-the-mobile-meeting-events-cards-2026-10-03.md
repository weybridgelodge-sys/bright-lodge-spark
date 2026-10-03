# Fix the mobile Meeting Events cards

## Changes
- Make active and archived meeting cards stack their content and action buttons on phones, switching back to the existing side-by-side layout at the `sm` breakpoint.
- Keep the meeting title/date/status area flexible and non-collapsing, with safe wrapping for long titles.
- Give Archive, Restore, and Delete equal-width 48px touch targets on phones and natural widths on larger screens, preserving their icons, theme styling, and confirmation behaviour.
- Retain sufficient page-bottom clearance above the fixed members navigation.

## Verification
- Extend the existing 320px Meeting Events browser test with the long December meeting title, button-row geometry, 48px targets, archived-card controls, and bottom-navigation clearance.
- Inspect similar archived/list card patterns and only update those with the same collapsing action-row issue.
- Run the focused browser check, full test suite, and confirm the preview build is clean.

## Technical details
- Changes are limited to the Meeting Events presentation and its phone-width regression test; event data and archive/delete behaviour remain unchanged.
