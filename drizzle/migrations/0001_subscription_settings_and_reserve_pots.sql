CREATE TABLE public.subscription_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_rate_pence integer NOT NULL DEFAULT 25000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.subscription_settings TO authenticated;
GRANT ALL ON public.subscription_settings TO service_role;

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_settings_select ON public.subscription_settings
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2')
  OR is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY subscription_settings_insert ON public.subscription_settings
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY subscription_settings_update ON public.subscription_settings
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE TABLE public.subscription_reserve_pots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_code text NOT NULL UNIQUE,
  label text NOT NULL,
  annual_pence integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.subscription_reserve_pots TO authenticated;
GRANT ALL ON public.subscription_reserve_pots TO service_role;

ALTER TABLE public.subscription_reserve_pots ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_reserve_pots_select ON public.subscription_reserve_pots
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2')
  OR is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY subscription_reserve_pots_insert ON public.subscription_reserve_pots
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY subscription_reserve_pots_update ON public.subscription_reserve_pots
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE TRIGGER subscription_settings_updated_at BEFORE UPDATE ON public.subscription_settings
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER subscription_reserve_pots_updated_at BEFORE UPDATE ON public.subscription_reserve_pots
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.subscription_settings (annual_rate_pence) VALUES (25000);

INSERT INTO public.subscription_reserve_pots (fund_code, label, annual_pence, sort_order) VALUES
  ('ALMONERS', 'Almoners', 1000, 1),
  ('INITIATES_REGALIA', 'Initiates & Regalia', 900, 2),
  ('MASTERS_FUND', 'Master''s Fund', 1000, 3),
  ('TYLER_PROVISION', 'Tyler Provision', 1000, 4);