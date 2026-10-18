-- 1. Newsletter: public inserts only via the newsletter-subscribe function (service role)
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

-- 4. Explicit public ceremony label
ALTER TABLE public.festive_board_meetings ADD COLUMN IF NOT EXISTS public_label text;
COMMENT ON COLUMN public.festive_board_meetings.public_label IS 'Ceremony text shown on the public website; null = show nothing.';
UPDATE public.festive_board_meetings m SET public_label = s.c
FROM (SELECT id, CASE WHEN c ~* '(initiation|passing|raising|installation|ceremony|festive|ladies|white table|emergency)' THEN c ELSE NULL END AS c
      FROM (SELECT id, btrim(regexp_replace(coalesce(notes, ''), '^[^-–—]*[-–—]\s*', '')) AS c FROM public.festive_board_meetings) x) s
WHERE s.id = m.id AND m.public_label IS NULL;

CREATE OR REPLACE FUNCTION public.guard_public_label()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.public_label IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.public_label ELSE NULL END)
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary') OR public.is_lodge_secretary(auth.uid())) THEN
    RAISE EXCEPTION 'Only the Secretary or an admin can change the public ceremony label';
  END IF;
  NEW.public_label := nullif(btrim(NEW.public_label), '');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_public_label ON public.festive_board_meetings;
CREATE TRIGGER trg_guard_public_label BEFORE INSERT OR UPDATE ON public.festive_board_meetings
FOR EACH ROW EXECUTE FUNCTION public.guard_public_label();

CREATE OR REPLACE FUNCTION public.get_next_public_meeting()
RETURNS TABLE(meeting_date date, ceremony text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT m.meeting_date, m.public_label AS ceremony
  FROM public.festive_board_meetings m
  WHERE m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
    AND m.status <> 'completed' AND m.cancelled_at IS NULL
    AND NOT public.is_event_key_archived(m.event_key)
  ORDER BY m.meeting_date ASC LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_upcoming_public_meetings()
RETURNS TABLE(meeting_date date, ceremony text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT m.meeting_date, m.public_label AS ceremony
  FROM public.festive_board_meetings m
  WHERE m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
    AND m.status <> 'completed' AND m.cancelled_at IS NULL
    AND NOT public.is_event_key_archived(m.event_key)
  ORDER BY m.meeting_date ASC;
$function$;

-- 5. Enquiry contact settings (service-role read; admin/Secretary edit)
CREATE TABLE IF NOT EXISTS public.lodge_contact_settings (
  unit_id text PRIMARY KEY DEFAULT 'weybridge',
  secretary_email text NOT NULL,
  membership_cc_email text NOT NULL,
  guide_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT INSERT, UPDATE ON public.lodge_contact_settings TO authenticated;
GRANT ALL ON public.lodge_contact_settings TO service_role;
ALTER TABLE public.lodge_contact_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin or Secretary insert contact settings" ON public.lodge_contact_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary') OR public.is_lodge_secretary(auth.uid()));
CREATE POLICY "Admin or Secretary update contact settings" ON public.lodge_contact_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary') OR public.is_lodge_secretary(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary') OR public.is_lodge_secretary(auth.uid()));
INSERT INTO public.lodge_contact_settings (unit_id, secretary_email, membership_cc_email, guide_url)
VALUES ('weybridge', 'secretary@weybridgelodge.org.uk', 'membershipsecretary@weybridgelodge.org.uk',
        'https://weybridgelodge.org.uk/downloads/information-for-prospective-members.pdf?v=2')
ON CONFLICT (unit_id) DO NOTHING;