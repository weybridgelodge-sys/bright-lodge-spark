ALTER TABLE public.membership_enquiries ADD COLUMN IF NOT EXISTS converted_candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS membership_enquiries_converted_candidate_uidx ON public.membership_enquiries(converted_candidate_id) WHERE converted_candidate_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.convert_enquiry_to_candidate(_enquiry_id uuid, _link_existing boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e public.membership_enquiries%ROWTYPE;
  existing uuid;
  new_id uuid;
  nm text; fn text; ln text; src public.candidate_referral_source;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'secretary')) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT * INTO e FROM public.membership_enquiries WHERE id = _enquiry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enquiry not found'; END IF;
  IF e.converted_candidate_id IS NOT NULL OR e.status = 'converted' THEN
    RAISE EXCEPTION 'This enquiry has already been converted';
  END IF;
  SELECT id INTO existing FROM public.candidates
   WHERE e.email IS NOT NULL AND lower(email) = lower(e.email) ORDER BY created_at LIMIT 1;
  IF existing IS NOT NULL THEN
    IF NOT _link_existing THEN
      RAISE EXCEPTION 'A candidate with this email already exists';
    END IF;
    UPDATE public.membership_enquiries SET status='converted', converted_candidate_id=existing, updated_at=now() WHERE id=_enquiry_id;
    RETURN existing;
  END IF;
  nm := btrim(regexp_replace(coalesce(e.full_name,''), '\s+', ' ', 'g'));
  IF position(' ' in nm) > 0 THEN
    ln := regexp_replace(nm, '^.* ', '');
    fn := btrim(left(nm, length(nm) - length(ln)));
  ELSE
    fn := nm; ln := '';
  END IF;
  src := CASE WHEN e.source ILIKE 'join-us%' OR e.source ILIKE 'website%' THEN 'website'::public.candidate_referral_source ELSE NULL END;
  INSERT INTO public.candidates(first_name,last_name,email,phone,stage,date_of_enquiry,referral_source,notes,created_by)
  VALUES (fn, ln, e.email, e.phone, 'enquiry', (e.created_at AT TIME ZONE 'Europe/London')::date, src,
          nullif(concat_ws(E'\n', 'From website enquiry: ' || e.reason, e.notes), ''), auth.uid())
  RETURNING id INTO new_id;
  UPDATE public.membership_enquiries SET status='converted', converted_candidate_id=new_id, updated_at=now() WHERE id=_enquiry_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.convert_enquiry_to_candidate(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_enquiry_to_candidate(uuid, boolean) TO authenticated;