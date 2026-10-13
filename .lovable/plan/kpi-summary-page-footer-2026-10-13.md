# KPI Summary page footer

- Add a centred navy “Page X of Y” footer with a thin gold rule to every KPI Summary page.
- Apply footers after all sections are generated so the total page count is accurate; retain the existing table margins and keep-together protection, and leave other PDF exports unchanged.
- Regenerate a multi-page export, visually inspect every page for alignment and content clearance, and run the full existing test suite.

## Technical details
Use a final jsPDF page loop inside `exportFullKpi`, before saving, with page-relative positioning.