## Lodge Development Summary Report

A new consolidated report inside the Member Development module, gated to WM / Secretary / Mentor roles. One screen → 8 sections of live KPIs → PDF, plain-text, or saved snapshot.

### Where it lives
- New route: `/members/development/summary-report`
- Entry point: button on Mentor Dashboard ("Lodge Development Summary Report")
- Access: `has_role(admin|worshipful_master|secretary)` OR user is an assigned mentor (reuse existing `can_edit_member_development` pattern)

### UI
- Date range picker (default: current Masonic year, 1 Oct → 30 Sep)
- "Regenerate" button
- Tabs/anchor links for the 8 sections, each rendered as a card with figures, lists of flagged members, and small trend chips
- Mentor's Statement: large textarea at the bottom (Section 8)
- Action bar (sticky): **Download PDF · Copy as text · Save snapshot · View history**

### Sections (data sources already in the codebase)
1. **Membership Overview** — `profiles`, `candidates`, plus `movement()` / `snapshot()` from `src/lib/kpis.ts`
2. **Mentoring Progress** — `member_checklist_items`, `member_development_records`, `member_engagement_log` (6-week gap via `last_engagement_date` RPC), degree dates from `profiles`
3. **Ritual Development** — `member_ritual_records` + `lodge_skills_matrix` RPC; red/amber/green derived per piece
4. **Lodge of Instruction** — `loi_sessions`, `loi_attendance`; trend vs previous equal-length window
5. **Working Groups** — `working_groups`, `working_group_members`, `working_group_activities`
6. **Engagement Summary** — `member_engagement_log` grouped by `category`
7. **Royal Arch Conversion** — `profiles` (raising_date, is_royal_arch); period-over-period delta
8. **Mentor's Summary Statement** — free text, persisted with the snapshot

Executive summary paragraph is auto-composed from sections 1–5 figures and rendered at the top of the PDF.

### Outputs
- **PDF** — new `src/lib/development/summaryReportPdf.ts` reusing the navy/gold styling, white logo, autoTable layout, and confidentiality footer from `pdf.ts`
- **Copy as text** — plain-text builder shared with the PDF so wording matches
- **Save to history** — new `lodge_development_reports` table storing the date range, snapshot JSON, mentor's statement, generated-by user; History drawer lists prior snapshots and re-opens them read-only

### Technical pieces

```text
src/lib/development/
  summaryReport.ts          # pure aggregator: bundle → SummaryReportData
  summaryReportText.ts      # SummaryReportData → plain text + exec summary
  summaryReportPdf.ts       # SummaryReportData → jsPDF

src/components/members/development/
  LodgeSummaryReport.tsx    # page shell, date picker, sections, action bar
  SummaryReportHistory.tsx  # drawer listing saved snapshots

src/pages/members/development/
  LodgeSummaryReport.tsx    # route page

Route wired in src/App.tsx behind ProtectedRoute with role check.
```

New migration:

```text
lodge_development_reports
  id, period_start, period_end, snapshot jsonb,
  mentor_statement text, generated_by uuid, generated_at
  + RLS: select/insert for admin|WM|secretary|mentor roles
  + GRANTs to authenticated + service_role
```

No changes to existing tables. All aggregation runs client-side from existing queries; the snapshot row stores the rendered figures for historical fidelity.

### Out of scope (call out before building if you want them)
- Emailing the PDF to the VO
- Year-on-year charts beyond a single previous-period delta
- Editing a saved snapshot after the fact (snapshots are immutable; re-run to refresh)
