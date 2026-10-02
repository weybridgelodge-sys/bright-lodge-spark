CREATE TABLE public.officer_appointment_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('insert','update','delete','snapshot')),
  appointment_id uuid,
  acted_at timestamptz NOT NULL DEFAULT now(),
  acted_by uuid,
  acted_by_label text NOT NULL DEFAULT 'user',
  before_row jsonb,
  after_row jsonb,
  note text
);
GRANT SELECT ON public.officer_appointment_audit TO authenticated;
GRANT ALL ON public.officer_appointment_audit TO service_role;
ALTER TABLE public.officer_appointment_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Secretary read officer audit" ON public.officer_appointment_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'secretary'::public.app_role)
      OR public.is_current_officer(auth.uid(),'secretary'));
CREATE INDEX officer_appointment_audit_appt_idx ON public.officer_appointment_audit(appointment_id, acted_at);

CREATE OR REPLACE FUNCTION public.log_officer_appointment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    INSERT INTO public.officer_appointment_audit(action, appointment_id, acted_by, acted_by_label, before_row, after_row)
    VALUES (lower(TG_OP), COALESCE(NEW.id, OLD.id), auth.uid(),
            CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
            CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
            CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'officer_appointment_audit logging failed (appointment saved anyway): %', SQLERRM;
  END;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.log_officer_appointment_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER officer_appointments_audit
AFTER INSERT OR UPDATE OR DELETE ON public.officer_appointments
FOR EACH ROW EXECUTE FUNCTION public.log_officer_appointment_change();

INSERT INTO public.officer_appointment_audit(action, appointment_id, acted_by_label, after_row, note)
SELECT 'snapshot', oa.id, 'system', to_jsonb(oa), 'Starting point: appointment as it stood when the audit trail began'
FROM public.officer_appointments oa;

CREATE OR REPLACE FUNCTION public.get_member_offices_held(_member uuid)
RETURNS TABLE(position_key text, label text, from_date date, to_date date, first_year integer, last_year integer, is_current boolean, is_upcoming boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH viewer AS (
    SELECT auth.uid() = _member
        OR public.has_role(auth.uid(),'admin'::public.app_role)
        OR public.has_role(auth.uid(),'secretary'::public.app_role)
        OR public.is_current_officer(auth.uid(),'secretary')
        OR public.is_current_officer(auth.uid(),'worshipful_master') AS full_access,
           (now() AT TIME ZONE 'Europe/London')::date AS today
  ), latest AS (
    SELECT DISTINCT ON (oa.position_key, oa.lodge_year)
      oa.position_key, oa.lodge_year, oa.member_id,
      public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive,false)) AS eff
    FROM public.officer_appointments oa
    LEFT JOIN public.officer_positions op ON op.key = oa.position_key
    WHERE NOT oa.is_projection
    ORDER BY oa.position_key, oa.lodge_year, oa.updated_at DESC
  ), marked AS (
    SELECT l.*, CASE WHEN l.member_id IS NOT DISTINCT FROM lag(l.member_id) OVER w
                     AND lag(l.lodge_year) OVER w IS NOT NULL THEN 0 ELSE 1 END AS brk
    FROM latest l WINDOW w AS (PARTITION BY l.position_key ORDER BY l.lodge_year)
  ), grouped AS (
    SELECT m.*, sum(brk) OVER (PARTITION BY m.position_key ORDER BY m.lodge_year) AS grp FROM marked m
  ), seg AS (
    SELECT g.position_key, g.member_id, g.grp, min(g.eff) AS from_date,
           min(g.lodge_year) AS first_year, max(g.lodge_year) AS last_year
    FROM grouped g GROUP BY g.position_key, g.member_id, g.grp
  ), seg2 AS (
    SELECT s.*, (lead(s.from_date) OVER (PARTITION BY s.position_key ORDER BY s.grp)) - 1 AS to_date FROM seg s
  )
  SELECT s.position_key, COALESCE(op.label, s.position_key), s.from_date, s.to_date, s.first_year, s.last_year,
         (s.from_date <= v.today AND (s.to_date IS NULL OR s.to_date >= v.today)),
         (s.from_date > v.today)
  FROM seg2 s CROSS JOIN viewer v
  LEFT JOIN public.officer_positions op ON op.key = s.position_key
  WHERE s.member_id = _member AND auth.uid() IS NOT NULL
    AND (v.full_access OR (s.from_date <= v.today AND (s.to_date IS NULL OR s.to_date >= v.today)))
  ORDER BY s.from_date DESC, op.order_index DESC NULLS LAST
$$;
REVOKE ALL ON FUNCTION public.get_member_offices_held(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_offices_held(uuid) TO authenticated;