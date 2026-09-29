# Fix the Installation Return mobile layout

## Changes
- Stack the page heading and action controls on narrow screens.
- Make the year selector and every action button fit within the available mobile width and wrap safely.
- Harden other potentially wide controls and warning content on this page without changing desktop behaviour.

## Verification
- Open the authenticated Installation Return page at a genuine narrow phone width.
- Confirm every header action is visible and usable, and inspect the warning, officer, settings, submission, and field-review sections for page-level overflow.
- Check the preview build status after the change.

## Technical details
- Keep intentionally wide data tables horizontally scrollable inside their own sections.
- Prevent long email addresses, field names, and warning text from forcing the entire page wider than the viewport.
