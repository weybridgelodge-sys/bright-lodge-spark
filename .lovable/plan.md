# KPI Summary PDF: keep sections together

## Changes
- Extend the existing keep-together protection to all sections 1–7, including UGLE Portal and RA Conversion.
- Move a section to a fresh page when it fits a whole page but not the remaining space.
- Preserve content, styling, later sections and other PDF exports.
- A section taller than an entire page must still continue across pages; the existing PDF library handles that unavoidable case.

## Verification
- Regenerate the actual export function with faithful synthetic data, including a long Outstanding list and multiple RA Conversion rows.
- Check page placement and visually inspect every rendered page, especially the UGLE Portal / RA Conversion boundary.
- Run the existing full test suite, including phone-width checks. No portal screens change.

## Technical details
- Add `pageBreak: "avoid"` to the seven relevant `autoTable` calls in `exportFullKpi` in `src/lib/kpiExports.ts`, matching Lodge Health and later sections.
- Use temporary PDF-generation/checking scripts; no member data or permission changes.
