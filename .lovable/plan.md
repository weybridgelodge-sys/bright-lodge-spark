# Provincial (Surrey) Installation Return — generated Word document

## Blocker first
The attached L6787-PROVINCIAL_RETURN_2025-2026.docx and its PDF did not arrive in this chat (same limitation as the UGLE form). I need that file before I lay out the document, because I will copy its table order, row labels and headings exactly rather than guess. Everything else below can be built first; the Word layout step waits for the file.

## What will be built
- A new Secretary Portal tile "Provincial Installation Return" next to "UGLE Installation Return", at `/members/admin/provincial-return`.
- Same access as the UGLE tool: admin, Secretary, Assistant Secretary, WM.
- Pick a masonic year (defaults to the upcoming Installation), then a review screen that reads live records every time you open it, refresh or download. Each row is labelled: confirmed for this year / carried forward / worked out by the ladder / blank.
- Two buttons: **Download Word** (main output) and **Download PDF** (a copy for reference). No send-to-Province button. The Secretary attaches the file to an email as usual.

## Where each part of the form gets its data
- **Officers** (WM through IPM, up to 5 Stewards, Tyler): same appointment records and the same "latest confirmed, presumed continuing" rule as the UGLE tool, including the Almoner exception (blank if the latest record has no member).
- **MO and LMO rows**: both filled from the Membership Officer appointment.
- **RA Rep, Petitions, Sports, Halls Reps**: read from the lodge template the Summons Builder already uses. An empty Petitions Rep shows as "vacant". It is not flagged as an error.
- **Organist**: always blank.
- **Decorations (e.g. MBE)**: every member record already has a free-text post-nominals field that the officers list already uses. I'll read from that, so no new field is needed. Its current values need checking, because it may hold masonic ranks as well as civil honours. The review screen shows exactly what will print so you can correct it.
- **Venue and meeting days**: taken from the lodge template or public meeting schedule that the Summons already uses. Nothing is re-typed.

## Secretary's contact details (sensitive): no new storage needed
Home address, mobile and personal email are already on the member record, and they are already restricted. They can only be read through the existing protected lookup, which allows the member themselves, admin, Secretary, WM, Almoner and IPM. The general directory never shows them. The tool will read the current Secretary's details through that same lookup. Lodge email is always `secretary@weybridgelodge.org.uk`.
- One flag: that existing lookup does **not** include the Treasurer. You asked for Secretary/Treasurer/admin. My proposal is to leave it as it is rather than widen access to home addresses. Tell me if the Treasurer should be added.

## New table: Past Masters roll
- One row per member per year served as Master (member link optional, name as printed, year).
- Seeded once with the 2025/26 list you gave me (Brennan 2003 … Grubb 2023, 2024), recorded against Lodge 6787. The "L5848" in the source header is ignored.
- New Masters are added automatically: when the return is built for a year, any past Worshipful Master year in the appointment records that isn't in the roll yet is added from those records. This needs no typing and causes no duplicates.
- Only admin and Secretary-access users can edit it. Signed-in members can read it.
- The document groups each Past Master's years on one line (e.g. "2018, 2019, 2020 — B C Connolly"), and the list grows each year.

## Open questions
1. Please re-send the Provincial return .docx. Or confirm I should lay it out from the PDF only if that one arrives.
2. Should the Treasurer be able to see the Secretary's home address? My default is no.
3. Should Past Masters who have died or left still be listed? The seed list seems to include only current members. For example, Julien 2025 would be added once he is outgoing.
4. Should the current WM's own year go on the roll at Installation (outgoing) or only after (as IPM)? My default is to add it when he becomes IPM.

## Technical details
- Migration: `past_masters` (id, member_id nullable, display_name, lodge_year int, unique(display_name, lodge_year)), with GRANTs, RLS, write access via `can_manage_secretary_returns`. Seed rows go in through the data tool, not the migration.
- Generation runs client-side with the `docx` library (A4, tables in DXA widths). The PDF is made with the existing PDF tooling.
- Shared resolver logic comes from `src/lib/installationReturn.ts` (refactored into reusable officer resolution) so that the two tools can't drift.
- Unit tests cover officer resolution, the MO/LMO mapping, Past Masters grouping and auto-append.
- The route goes in `MembersRoutes.tsx`, so the 320px browser test covers it automatically. I'll run the full suite (unit and browser) and check the build before reporting.
