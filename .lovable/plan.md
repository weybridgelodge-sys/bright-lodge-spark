# Officer signatures — stored per member, placed on the Provincial Installation Return

Plan only. Nothing is built, deployed or published until approved, and nothing goes live before 21 Oct. Step 2 parts C and D stay paused. Register, dining reconciliation, ledger, GMC invoice and PTP export are not touched.

## Findings (read from the current code)

- **The Provincial return is not an AcroForm.** `src/lib/provincialReturnDoc.ts` draws it fresh in the browser: `buildDocx` (Word, via `docx`) and `buildPdf` (pdf-lib, standard Times font). There are **no field IDs**. The signatures are two printed text lines from `signatureLines()`: `Signed ……… Sec Date <date>` then `Signed ……… WM Date <date>`. They are drawn on page 2 (PDF line ~331, 70pt apart) and as Word paragraphs (line ~222).
- **How it's delivered:** `ProvincialReturn.tsx` builds both files in the browser and uploads them to the private `secretary-returns` bucket under `provincial-returns/<year>/`. `submit-provincial-return` then emails 30-day signed links. Download is browser-only.
- **The UGLE Installation Return does have signature fields.** `installationReturn.ts` lists `NEVER_FILL = ["Worshipful MasterRow1", "SecretaryRow1", "Date of Disp"]`, so the WM and Secretary signature fields are `Worshipful MasterRow1` and `SecretaryRow1`. This plan reports them but doesn't wire them.
- **WM and Secretary** come from `loadProvincialData` (`resolveLadderOffice` / `resolveContinuingOffice`), which apply the same effective-date rule as `current_officer_holder()`.
- **Hard-coded lodge details already in this area:** `L6787` in file names (ProvincialReturn.tsx, submit-provincial-return) and "Weybridge" in `lodgeLine()`. These are older code and not in scope. New code won't add any, and I'm flagging these for a later clean-up.

## Design answers

**a) Table `member_signatures`:** `id`, `unit_id` (FK to `units`, required), `member_id` (FK to profiles), `storage_path`, `content_type` (always image/png after processing), `width`, `height`, `byte_size`, `active`, `created_at`, `created_by`, `source` (self_upload / self_drawn / on_behalf), `consent_note` (required when on_behalf), `consent_recorded_by`, `revoked_at`, `revoked_by`. A partial unique index allows only one active row per member. Old rows stay as inactive history; their files are deleted. No lodge name, URL, email or UUID appears anywhere. The feature sits behind module key `officer_signatures`, off by default.

**Audit table `signature_usage_audit`:** `unit_id`, `form_key` (e.g. `provincial_return`), `lodge_year`, `office_key`, `signer_member_id`, `signature_id`, `generated_by`, `generated_at`, `output_path`. Capture, replace and revoke actions are audited too, in `signature_event_audit`: who, whose, action, consent note and when. Neither table ever stores image contents or URLs.

**b) Storage:** a new private bucket `member-signatures`, path `<unit_id>/<member_id>/<signature_id>.png`. There is no public URL and no SELECT policy on the bucket for anyone. Browsers never read the bucket directly.
- **Writes** go only through edge function `signature-upload`, which checks the caller is the member himself, or admin/Secretary with a consent note. It does its own processing check, then writes with the service role.
- **Preview:** the owner, admin, Secretary or WM can see a preview through `signature-preview`. It returns the image bytes directly, with `Cache-Control: no-store`. The URL is not signed and not logged.
- **RLS on `member_signatures`:**
  - The member sees his own row.
  - Admin, `is_lodge_secretary()` and current WM can see metadata rows in their unit.
  - Nobody can insert, update or delete from the client; edge functions do this.

**Server-side generation.** The PDF and Word builders move to (or are shared with) a new edge function `generate-provincial-return`. The browser sends only the year. The function:
1. Re-checks that the caller may generate the return, using the same roles as today.
2. Resolves WM and Secretary server-side.
3. Fetches their active signatures with the service role.
4. Embeds them and writes the files to `secretary-returns`.
5. Writes the audit rows.
6. Returns the file paths and short-lived (10-minute) signed download links.

The browser never gets the raw signature image, only the finished document, as it already does today. The existing `submit-provincial-return` flow is unchanged.

**c) Capture screen** (Profile, "My signature" section, plus a dialog in Edit Member for admin/Secretary):
- Upload PNG/JPEG up to 2 MB, or draw on a pointer pad (finger/mouse/stylus) with Clear and Undo.
- The browser processes the image on a canvas:
  - near-white pixels become transparent;
  - the image is trimmed to the ink;
  - it is resized to at most 600×200 px, aspect ratio kept;
  - it is re-encoded as PNG, which strips EXIF and other metadata.
- The server checks it again:
  - magic bytes show PNG;
  - size ≤ 200 KB after processing;
  - dimensions within the limits;
  - anything else is rejected.
- A preview shows on a plain light surface token before saving.
- The on-behalf dialog requires a consent note ("Member agreed on <date>"), a date and a confirm tick. The form has a honeypot in a hidden container.

**d) Use and audit:** a signature is only placed inside `generate-provincial-return` after the role check, and every placement writes one audit row. There is no list or download endpoint. `signature-preview` returns one image for one member, and only to the owner or an entitled officer. There's no bulk export. Previews are rate-limited per caller.

**e) Revoke:** the member (or admin/Secretary, audited) presses Remove. This sets the row inactive with `revoked_at`/`revoked_by` and deletes the file from storage. Documents already generated aren't changed; they stay as issued documents.

**f) Provincial return behaviour:**
- **Placement:** each `Signed ……` line becomes a fixed signature box.
  - In the PDF, the box is about 220×40pt above the dotted line. The image is scaled to fit inside it with aspect ratio kept, left-aligned and vertically centred.
  - In Word, an inline image goes in the same position with the same fit rule.
  - The dotted line and date stay.
- **Before generating,** the screen shows "Will be signed by:" with Secretary and WM names, each marked "signature on file" or "no signature on file — will be left blank". There's a small preview for viewers allowed to see it. The download and send buttons still work when one or both are missing.
- **Same person as WM and Secretary:** both lines use the same signature, with one audit row per office, and the screen notes "same person holds both offices".
- **Vacant office:** the field is left blank and the screen warns "No Secretary resolved for <year>".
- **Delivery:** unchanged. Files go to `secretary-returns`, then the existing email gives 30-day links.

**g) Data protection** (the minimum safe approach):
- Private bucket with no direct client read.
- RLS limits metadata rows.
- Server-only embedding.
- Consent is required when uploading on someone's behalf.
- Full audit of capture, use and revoke.
- Delete on revoke.
- No bulk access.
- No logging of image bytes, signed URLs or base64. Edge function logs record IDs only.
- I'll add a line to the Data Protection page stating that signatures are held for lodge returns and can be removed by the member.

## AGENTS.md wording change

Current: `- Installation Returns: live data, exact AcroForm IDs; signatures/dispensation blank.`

New: `- Installation Returns: live data, exact AcroForm IDs; dispensation always blank; signature fields use the current office holder's active member_signatures image embedded server-side (blank if vacant or none), audited per placement. Why: signatures follow the office, never a named person.`

New rule: `- Member signatures: private bucket, no client read, written/embedded only by edge functions, one active per member, unit_id-scoped. Why: fraud-sensitive personal data.`

## Files and tables

- Migration: `member_signatures`, `signature_usage_audit`, `signature_event_audit` (all with `unit_id`, GRANTs, RLS), plus the `officer_signatures` module key row (false).
- New bucket: `member-signatures` (private), with no client SELECT policy on `storage.objects`.
- Edge functions (new): `signature-upload`, `signature-revoke`, `signature-preview`, `generate-provincial-return`. The document builder is shared via `supabase/functions/_shared/provincialReturnDoc.ts`, and the browser imports the same pure layout code.
- Frontend:
  - `components/members/SignatureCapture.tsx` (upload plus draw pad);
  - `lib/signatureImage.ts` (white removal, trim, resize: pure, testable);
  - Profile section;
  - Edit Member dialog;
  - `ProvincialReturn.tsx`, which shows who will sign and calls the new function.
- `AGENTS.md`, plus `DataProtection.tsx` (one sentence).

## Tests

- **Unit:**
  - white-to-transparent, trim and fit-in-box maths (aspect ratio kept);
  - only PNG/JPEG accepted, size cap;
  - signer resolution, including a vacant office leaving the field blank and a missing signature leaving it blank;
  - same person as WM and Secretary gives both placements and two audit rows;
  - officers changing between years changes whose signature is used;
  - consent note required on behalf of someone.
- **Database (as real roles, in the test unit):**
  - an ordinary member cannot select another member's `member_signatures` row or any `member-signatures` object;
  - an ordinary member cannot call `signature-preview` for someone else;
  - an ordinary member cannot call `generate-provincial-return`.
- **Browser:** a real 320px check plus an axe scan (colour contrast on) for the Profile signature section, the draw pad, the on-behalf dialog and the updated Provincial Return panel; 44px targets; keyboard-reachable pad controls; no overflow.
- **Regression:** the existing `provincialReturn.test.ts` structure test still passes. The UGLE return keeps `NEVER_FILL` untouched.

## Risks

- **Moving generation to the server** is the biggest change. pdf-lib works in Deno, and `docx` should too, but bundling still needs a check. If it fails, the fallback is to keep the Word file browser-built and unsigned, and sign only the PDF on the server. I'll tell you before taking that route.
- **White removal on poor scans** (grey paper) may leave haze. The threshold will be adjustable, and the preview shows the result before saving.
- **Edge functions deploy as soon as they're saved.** They are new functions behind a module key that is off, and the existing Provincial page keeps working until it is published. Nothing touches the 21 Oct booking pipeline.
- **The draw pad on small phones** needs a sensible minimum height. The 320px test covers this.
- **Unit tests can't prove deletion from Cloud storage.** I'll verify it once with a test image in the test unit and then remove it.

## Open decisions

1. Should the current WM be able to upload on someone's behalf (the brief says Secretary/admin only), or only view previews? Assumed: view only.
2. For signed Word output, is the Word copy still needed at all once the PDF is signed? Assumed: yes, both signed.
