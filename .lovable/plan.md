# Add enquiry (manual) — Membership Enquiries

## Findings
- `membership_enquiries` has no INSERT policy for signed-in users (only the Join Us function writes, using the server key). So a manual add needs a new, narrow write path.
- `email` is required (NOT NULL), so phone-only enquiries can't be stored today.
- There is no `created_by` / `received_at` column. `created_at` can hold the received date.
- Convert already handles a missing email (it only matches existing candidates by email). Manual sources map to referral source blank, same as non-website today.
- Who can action enquiries today: Admin, Secretary, Assistant Secretary (WM view-only). The Add button uses exactly that set.

## Proposed migration (not applied — awaiting approval)
```sql
-- 1. allow phone-only manual enquiries (Join Us function still always sends an email)
ALTER TABLE public.membership_enquiries ALTER COLUMN email DROP NOT NULL;

-- 2. audit + double-submit protection
ALTER TABLE public.membership_enquiries
  ADD COLUMN created_by uuid,
  ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX membership_enquiries_request_id_uidx
  ON public.membership_enquiries(request_id) WHERE request_id IS NOT NULL;

-- 3. narrow insert path (no new table policy, no anon access)
CREATE OR REPLACE FUNCTION public.add_manual_enquiry(
  _request_id uuid, _full_name text, _email text, _phone text,
  _channel text, _received_on date, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; nm text := btrim(coalesce(_full_name,''));
  em text := nullif(lower(btrim(coalesce(_email,''))),'');
  ph text := nullif(btrim(coalesce(_phone,'')),'');
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'secretary')
          OR has_role(auth.uid(),'assistant_secretary')) THEN
    RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT id INTO new_id FROM membership_enquiries WHERE request_id = _request_id;
  IF new_id IS NOT NULL THEN RETURN new_id; END IF;          -- retry/double-click
  IF length(nm) < 2 OR length(nm) > 120 THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF em IS NULL AND ph IS NULL THEN RAISE EXCEPTION 'Enter an email or a phone number'; END IF;
  IF em IS NOT NULL AND (length(em) > 255 OR em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Email address is not valid'; END IF;
  IF ph IS NOT NULL AND length(ph) > 40 THEN RAISE EXCEPTION 'Phone number is too long'; END IF;
  IF _channel NOT IN ('email','phone','in-person','other') THEN RAISE EXCEPTION 'Choose how they got in touch'; END IF;
  IF _received_on IS NULL OR _received_on > (now() AT TIME ZONE 'Europe/London')::date THEN
    RAISE EXCEPTION 'Date received cannot be in the future'; END IF;
  IF length(coalesce(_message,'')) > 2000 THEN RAISE EXCEPTION 'Message is too long'; END IF;
  INSERT INTO membership_enquiries(full_name,email,phone,reason,source,status,created_at,created_by,request_id)
  VALUES (nm, em, ph, btrim(coalesce(_message,'')), 'manual-' || _channel, 'new',
          (_received_on::timestamp + time '12:00') AT TIME ZONE 'Europe/London', auth.uid(), _request_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.add_manual_enquiry(uuid,text,text,text,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_enquiry(uuid,text,text,text,text,date,text) TO authenticated;
```
Note: step 1 (DROP NOT NULL) is flagged by the system as a sensitive change and will ask you yes/no when applied.

## Build after approval
- `MembershipEnquiries.tsx`: "Add enquiry" button (Admin/Secretary/Asst Secretary), mobile-first dialog with labels above Name, Email, Phone, How they got in touch, Date received (today, max today), Message; 44px controls; button locked while saving; one request id per dialog open. Card already shows "Source: …".
- Shared validation helper `src/lib/manualEnquiry.ts` + unit tests (name required, email-or-phone, invalid email, future date, source mapping).
- Rolled-back database checks: Secretary insert works, ordinary member/WM refused, double submit returns same row, row lists as New, convert works on a phone-only manual enquiry.
- Browser test at 320/390 for the dialog. Join Us form, its honeypot, and the `submit-enquiry` function untouched; no function deploys.
