CREATE TABLE public.officer_installation_dates (
  lodge_year integer PRIMARY KEY,
  installation_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.officer_installation_dates TO authenticated;
GRANT ALL ON public.officer_installation_dates TO service_role;
ALTER TABLE public.officer_installation_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read installation dates" ON public.officer_installation_dates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or Secretary manage installation dates" ON public.officer_installation_dates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'secretary'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'secretary'::public.app_role));
CREATE TRIGGER officer_installation_dates_updated_at BEFORE UPDATE ON public.officer_installation_dates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.officer_installation_dates (lodge_year, installation_date, notes)
VALUES (2026, '2026-10-21', 'Installation Meeting and Charitable White Table');

-- Officers' (Installation) year: starts on the stored Installation date, else the 3rd Wednesday in October.
CREATE OR REPLACE FUNCTION public.officer_year_start(_year integer)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT installation_date FROM public.officer_installation_dates WHERE lodge_year = _year),
    (make_date(_year, 10, 1) + ((3 - EXTRACT(DOW FROM make_date(_year,10,1))::int + 7) % 7) + 14)
  )
$$;

CREATE OR REPLACE FUNCTION public.current_officer_year()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN (now() AT TIME ZONE 'Europe/London')::date >= public.officer_year_start(EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/London'))::int)
      THEN EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/London'))::int
    ELSE EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/London'))::int - 1
  END
$$;

-- Current holder: latest confirmed appointment for the office on or before the current officers' year.
CREATE OR REPLACE FUNCTION public.current_officer_holder(_position_key text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT oa.member_id FROM public.officer_appointments oa
  WHERE oa.position_key = _position_key AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND oa.lodge_year <= public.current_officer_year()
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_current_officer(_user_id uuid, _position_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND public.current_officer_holder(_position_key) = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_current_wm_or_ipm(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_current_officer(_user_id,'worshipful_master') OR public.is_current_officer(_user_id,'immediate_past_master')
$$;

CREATE OR REPLACE FUNCTION public.current_office_label(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT op.label FROM public.officer_positions op
  WHERE public.current_officer_holder(op.key) = _user_id
  ORDER BY op.order_index DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_officers_public(_year integer DEFAULT NULL::integer)
RETURNS TABLE(position_key text, title text, first_name text, middle_name text, last_name text, post_nominals text, provincial_rank text, grand_rank text, is_past_master boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH latest AS (
    SELECT DISTINCT ON (oa.position_key) oa.position_key, oa.member_id
    FROM public.officer_appointments oa
    WHERE NOT oa.is_projection AND oa.member_id IS NOT NULL
      AND oa.lodge_year <= COALESCE(_year, public.current_officer_year())
    ORDER BY oa.position_key, oa.lodge_year DESC, oa.updated_at DESC
  )
  SELECT l.position_key::text, p.title, p.first_name, p.middle_name, p.last_name, p.post_nominals,
         p.provincial_rank, p.grand_rank, COALESCE(p.is_past_master, false)
  FROM latest l JOIN public.profiles p ON p.id = l.member_id
$$;