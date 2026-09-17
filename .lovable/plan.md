# Committee Agenda editor and PDF

## Implementation
- Detect pre-meeting Committee agenda records by committee type with no transcript.
- Replace the minutes sections editor in that state with three fixed agenda points and editable points 4 onward.
- Default the previous-meeting date from the latest earlier Committee record and keep all points stored in the existing sections array.
- Load the current Secretary from officer appointments and profiles, using the established member-name format.
- Update the agenda PDF to show AGENDA, meeting details, Secretary identity, and headings only, with no minutes signature or draft wording.

## Verification
- Run the project type check and production build.
- Generate and inspect the 11 January 2027 Committee agenda PDF, confirming all requested content and exclusions.

## Assumptions
- A Committee record remains in agenda mode while its transcript is empty; once a transcript exists, the normal Minutes editor returns.
- The previous-meeting date is represented inside fixed point 2 and derived from the latest earlier Committee record.
