# Restyle the Provincial Installation Return

## Outcome
Match the generated Word and PDF documents to the uploaded Surrey return’s visual structure while keeping all values live from portal records.

## Changes
- Rebuild page 1 in the original form style: underlined Province heading, uppercase instruction line, compact bordered lodge-details block, and the original four-column officer table headings and proportions.
- Keep page 1 ending immediately after the NOTES block containing the Organist and Tyler notes.
- Start page 2 with the continuation rows (ORG (G), representatives, and LMO), then the Secretary contact table, blank Sec/WM signature line, and the original check-details/continued-overleaf wording.
- Start page 3 with the Past Masters section styled like the attached document: correct Lodge No. L6787, two side-by-side lists, the left list populated live, the right list empty, and the original notes wording.
- Apply the same three-page structure to both Word and PDF downloads, without changing data sourcing or adding a send flow.
- Add pagination/layout assertions where practical, then generate sample Word and PDF files, validate them, render them to images, and visually compare all pages with the original.
- Run the full unit and 320px portal test suite; the screen itself is unchanged, but its existing automated mobile coverage must remain green.

## Technical details
- Use explicit page breaks so content growth cannot shift the page boundaries requested here.
- Preserve the existing IPM-triggered Past Masters update rule and member-linked representative formatting.
- Keep signatures blank and Secretary PII access unchanged.
