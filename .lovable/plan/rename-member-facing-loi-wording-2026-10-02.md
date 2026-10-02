# Rename member-facing LOI wording

## Build
- Rename visible portal navigation, Secretary cards, register/admin/schedule headings, supporting copy, dialogs, buttons, and empty states to “Rehearsal”.
- Rename new Summons Builder labels and newly generated summons PDF headings to “Rehearsal Night” without altering saved data, routes, or identifiers.
- Rename attendance and member-development labels to “Rehearsal”, including charts, skills screens, assignment helper, and lodge summary.
- Leave public pages, routes, database names, and code identifiers unchanged.

## Verification
- Search member-facing source for remaining “LOI” and “Lodge of Instruction” text and report anything intentionally retained.
- Open the Secretary Portal and Calendar at 320px, checking for overflow and unreachable controls.
- Run the full unit and browser test suite, type check, and preview build check.

## Technical details
- Text-only edits will preserve internal keys such as `loi`, `loi_sessions`, and `/members/loi-*`.
- Existing and sent summons content remains unchanged; only future rendering and the builder label change.
