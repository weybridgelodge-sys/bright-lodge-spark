# Make the officers progression table sticky and accessible

## What will change
- Place the progression ladder in one two-direction scroll area capped at 70vh.
- Freeze the office column and year header row, with the corner cell layered above both.
- Use opaque navy surfaces, cream/gold text, and visible gold borders so scrolled content never shows through.
- Narrow and wrap the office column on phones while preserving more width on larger screens.
- Keep the current year gold and visibly marked “(CURRENT)”.

## Scope
- Update the progression ladder only. The non-progressive office board is a card grid, not a second year-column table.

## Verification
- Open the actual Officers Progression page with the established local portal identity at about 390px wide.
- Confirm horizontal and vertical scrolling keep the office names and years visible, with no clipping or overlap.
- Run the full unit and portal mobile test suite and confirm the preview remains clean.
