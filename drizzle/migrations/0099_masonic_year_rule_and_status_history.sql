-- KPI dashboard / Members: installation rule settings + member status history.
CREATE OR REPLACE FUNCTION public.current_unit_id()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 'weybridge'::text $$;

CREATE TABLE public.installation_rule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL DEFAULT public.current_unit_id() UNIQUE,
  mode text NOT NULL DEFAULT 'weekday_rule' CHECK (mode IN ('weekday_rule','fixed_date')),
  installation_month integer NOT NULL CHECK (installation_month BETWEEN 1 AND 12),
  installation_ordinal text CHECK (installation_ordinal IN ('1','2','3','4','last')),
  installation_weekday integer CHECK (installation_weekday BETWEEN 0 AND 6),
  fixed_day integer CHECK (fixed_day BETWEEN 1 AND 31),
  applies_from_year integer,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT installation_rule_shape CHECK (
    (mode = 'weekday_rule' AND installation_ordinal IS NOT NULL AND installation_weekday IS NOT NULL)
    OR (mode = 'fixed_date' AND fixed_day IS NOT NULL))
);
COMMENT ON COLUMN public.installation_rule_settings.installation_weekday IS '0 = Sunday … 6 = Saturday';
GRANT SELECT, INSERT, UPDATE ON public.installation_rule_settings TO authenticated;
GRANT ALL ON public.installation_rule_settings TO service_role;
ALTER TABLE public.installation_rule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own unit installation rule" ON public.installation_rule_settings
  FOR SELECT TO authenticated USING (unit_id = public.current_unit_id());
CREATE POLICY "Admin or Secretary insert installation rule" ON public.installation_rule_settings
  FOR INSERT TO authenticated WITH CHECK (unit_id = public.current_unit_id()
    AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));
CREATE POLICY "Admin or Secretary update installation rule" ON public.installation_rule_settings
  FOR UPDATE TO authenticated
  USING (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())))
  WITH CHECK (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));

CREATE TABLE public.member_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL DEFAULT public.current_unit_id(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'status' CHECK (kind IN ('status','initiated','joined')),
  status text NOT NULL,
  effective_date date NOT NULL,
  recorded_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_status_history_profile_idx ON public.member_status_history (profile_id, effective_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_status_history TO authenticated;
GRANT ALL ON public.member_status_history TO service_role;
ALTER TABLE public.member_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin Secretary WM read status history" ON public.member_status_history
  FOR SELECT TO authenticated USING (unit_id = public.current_unit_id() AND (
    public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())
    OR public.has_role(auth.uid(),'worshipful_master') OR public.is_current_officer(auth.uid(),'worshipful_master')));
CREATE POLICY "Admin or Secretary write status history" ON public.member_status_history
  FOR INSERT TO authenticated WITH CHECK (unit_id = public.current_unit_id()
    AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));
CREATE POLICY "Admin or Secretary update status history" ON public.member_status_history
  FOR UPDATE TO authenticated
  USING (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())))
  WITH CHECK (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));
CREATE POLICY "Admin or Secretary delete status history" ON public.member_status_history
  FOR DELETE TO authenticated
  USING (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));

CREATE OR REPLACE FUNCTION public.log_member_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.member_status_history (profile_id, kind, status, effective_date, recorded_by)
    VALUES (NEW.id, 'status', NEW.status::text, COALESCE(NEW.status_changed_at, current_date), auth.uid());
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_member_status_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_log_status_change AFTER UPDATE OF status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_member_status_change();

-- One-off backfill: entry event + current status per member (profiles untouched).
INSERT INTO public.member_status_history (profile_id, kind, status, effective_date, note)
SELECT id, 'initiated', 'active', initiation_date, 'Backfill: initiation'
FROM public.profiles WHERE initiation_date IS NOT NULL
  AND (joined_lodge_date IS NULL OR joined_lodge_date = initiation_date);
INSERT INTO public.member_status_history (profile_id, kind, status, effective_date, note)
SELECT id, 'joined', 'active', joined_lodge_date, 'Backfill: joined Lodge'
FROM public.profiles WHERE joined_lodge_date IS NOT NULL
  AND (initiation_date IS NULL OR joined_lodge_date <> initiation_date);
INSERT INTO public.member_status_history (profile_id, kind, status, effective_date, note)
SELECT id, 'status', status::text,
  COALESCE(status_changed_at, joined_lodge_date, initiation_date, created_at::date), 'Backfill: current status'
FROM public.profiles;