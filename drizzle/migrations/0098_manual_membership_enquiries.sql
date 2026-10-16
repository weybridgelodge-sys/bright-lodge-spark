ALTER TABLE public.membership_enquiries ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.membership_enquiries ADD COLUMN created_by uuid, ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX membership_enquiries_request_id_uidx ON public.membership_enquiries(request_id) WHERE request_id IS NOT NULL;
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
  IF _request_id IS NULL THEN RAISE EXCEPTION 'Missing request id'; END IF;
  SELECT id INTO new_id FROM membership_enquiries WHERE request_id = _request_id;
  IF new_id IS NOT NULL THEN RETURN new_id; END IF;
  IF length(nm) < 2 OR length(nm) > 120 THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF em IS NULL AND ph IS NULL THEN RAISE EXCEPTION 'Enter an email or a phone number'; END IF;
  IF em IS NOT NULL AND (length(em) > 255 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') THEN
    RAISE EXCEPTION 'Email address is not valid'; END IF;
  IF ph IS NOT NULL AND length(ph) > 40 THEN RAISE EXCEPTION 'Phone number is too long'; END IF;
  IF _channel IS NULL OR _channel NOT IN ('email','phone','in-person','other') THEN RAISE EXCEPTION 'Choose how they got in touch'; END IF;
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