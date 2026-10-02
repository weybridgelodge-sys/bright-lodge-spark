DROP FUNCTION IF EXISTS public.current_officer_holder(text);

-- Officers' year containing a given date (Installation-based).
CREATE OR REPLACE FUNCTION public.officer_year_at(_at date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN _at >= public.officer_year_start(EXTRACT(YEAR FROM _at)::int)
    THEN EXTRACT(YEAR FROM _at)::int ELSE EXTRACT(YEAR FROM _at)::int - 1 END
$$;

CREATE OR REPLACE FUNCTION public.current_officer_year()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.officer_year_at((now() AT TIME ZONE 'Europe/London')::date)
$$;

-- Date an appointment row takes effect: its officers' year Installation date; for
-- non-progressive offices, no earlier than its appointed_on date (rows entered in readiness).
CREATE OR REPLACE FUNCTION public.officer_appointment_effective(_lodge_year integer, _appointed_on date, _is_progressive boolean)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN _is_progressive OR _appointed_on IS NULL
    THEN public.officer_year_start(_lodge_year)
    ELSE GREATEST(public.officer_year_start(_lodge_year), _appointed_on) END
$$;

-- Holder of an office on a date: latest confirmed appointment that has taken effect.
CREATE OR REPLACE FUNCTION public.current_officer_holder(_position_key text, _at date DEFAULT NULL)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT oa.member_id
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = _position_key AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= COALESCE(_at, (now() AT TIME ZONE 'Europe/London')::date)
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_current_officer(_user_id uuid, _position_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND public.current_officer_holder(_position_key) = _user_id
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
  WITH at_date AS (
    SELECT CASE WHEN _year IS NULL OR _year = public.current_officer_year()
      THEN (now() AT TIME ZONE 'Europe/London')::date
      ELSE public.officer_year_start(_year) END AS d
  ), holders AS (
    SELECT op.key, public.current_officer_holder(op.key, (SELECT d FROM at_date)) AS member_id
    FROM public.officer_positions op
  )
  SELECT h.key::text, p.title, p.first_name, p.middle_name, p.last_name, p.post_nominals,
         p.provincial_rank, p.grand_rank, COALESCE(p.is_past_master, false)
  FROM holders h JOIN public.profiles p ON p.id = h.member_id
$$;

CREATE OR REPLACE FUNCTION public.get_lodge_health_aggregates(_lodge_year integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select jsonb_build_object(
    'filled_position_keys', (
      select coalesce(jsonb_agg(op.key), '[]'::jsonb)
      from public.officer_positions op
      where public.current_officer_holder(op.key,
        case when _lodge_year = public.current_officer_year()
          then (now() AT TIME ZONE 'Europe/London')::date
          else public.officer_year_start(_lodge_year) end) is not null
    ),
    'risk_role_keys', (
      select coalesce(jsonb_agg(role_key), '[]'::jsonb)
      from public.succession_risks
      where is_at_risk
    ),
    'active_candidates', (
      select count(*) from public.candidates
      where stage not in ('initiated', 'withdrawn')
    )
  );
$$;

-- Portals granted by the current appointment.
CREATE OR REPLACE FUNCTION public.can_access_almoner(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'almoner'::public.app_role)
      OR public.is_current_officer(_user_id, 'almoner')
      OR public.is_current_wm_or_ipm(_user_id);
END $$;

CREATE OR REPLACE FUNCTION public.can_edit_charity(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user, 'admin'::public.app_role)
      OR public.has_role(_user, 'worshipful_master'::public.app_role)
      OR public.has_role(_user, 'charity_steward'::public.app_role)
      OR public.is_current_officer(_user, 'charity_steward');
$$;

-- Secretary no longer has Charity access.
CREATE OR REPLACE FUNCTION public.can_view_charity(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_edit_charity(_user);
$$;

-- Secretary no longer edits member development records; assigned mentors still do.
CREATE OR REPLACE FUNCTION public.can_edit_member_development(_editor uuid, _member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    public.has_role(_editor, 'admin'::public.app_role)
    OR public.has_role(_editor, 'worshipful_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.member_development_records r
      WHERE r.member_id = _member AND r.assigned_mentor_id = _editor
    );
$$;

DROP POLICY IF EXISTS "Editors insert development record" ON public.member_development_records;
CREATE POLICY "Editors insert development record" ON public.member_development_records FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role));

DROP POLICY IF EXISTS "engagement insert mgmt" ON public.member_engagement_log;
CREATE POLICY "engagement insert mgmt" ON public.member_engagement_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role) OR public.can_edit_member_development(auth.uid(), member_id));
DROP POLICY IF EXISTS "engagement update mgmt" ON public.member_engagement_log;
CREATE POLICY "engagement update mgmt" ON public.member_engagement_log FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role) OR public.can_edit_member_development(auth.uid(), member_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role) OR public.can_edit_member_development(auth.uid(), member_id));
DROP POLICY IF EXISTS "engagement delete mgmt" ON public.member_engagement_log;
CREATE POLICY "engagement delete mgmt" ON public.member_engagement_log FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role));