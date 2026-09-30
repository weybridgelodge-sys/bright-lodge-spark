# Restyle the Provincial Installation Return

## Outcome
Match the generated Word and PDF documents to the uploaded Surrey return’s visual structure while keeping all values live from portal records.

## Changes
- Rebuild page 1 in the original form style: underlined Province heading, uppercase instruction line, compact bordered lodge-details block, and the original four-column officer table headings and proportions.
- Flow the main officer table across pages as needed, keeping the uploaded form’s compact proportions; place the Organist/Tyler NOTES block directly after that table and force the next page break there.
- Continue that second page with ORG (G), representatives, LMO, the Secretary contact table, and the blank Sec/WM signature line, arranged compactly so the section finishes on page 2.
- Start page 3 with the Past Masters section styled like the attached document: correct Lodge No. L6787, two side-by-side lists, the left list populated live, the right list empty, and the original notes wording.
- Apply the same three-page structure to both Word and PDF downloads, without changing data sourcing or adding a send flow.
- Add pagination/layout assertions where practical, then generate sample Word and PDF files, validate them, render them to images, and visually compare all pages with the original.
- Run the full unit and 320px portal test suite; the screen itself is unchanged, but its existing automated mobile coverage must remain green.

## Technical details
- Use explicit page breaks so content growth cannot shift the page boundaries requested here.
- Preserve the existing IPM-triggered Past Masters update rule and member-linked representative formatting.
- Keep signatures blank and Secretary PII access unchanged.
