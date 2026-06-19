
-- 1. Add charity_steward role to existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'charity_steward';

-- Commit the new enum value before using it below
COMMIT;
BEGIN;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.can_edit_charity(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user, 'admin'::public.app_role)
      OR public.has_role(_user, 'worshipful_master'::public.app_role)
      OR public.has_role(_user, 'charity_steward'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.can_view_charity(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_edit_charity(_user)
      OR public.has_role(_user, 'secretary'::public.app_role);
$$;

-- 3. Charity Ledger
CREATE TABLE public.charity_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  charity_number text,
  description text,
  contact_name text,
  email text,
  phone text,
  website text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charity_ledger TO authenticated;
GRANT ALL ON public.charity_ledger TO service_role;
ALTER TABLE public.charity_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view charity ledger" ON public.charity_ledger FOR SELECT TO authenticated USING (public.can_view_charity(auth.uid()));
CREATE POLICY "edit charity ledger" ON public.charity_ledger FOR ALL TO authenticated USING (public.can_edit_charity(auth.uid())) WITH CHECK (public.can_edit_charity(auth.uid()));
CREATE TRIGGER trg_charity_ledger_updated BEFORE UPDATE ON public.charity_ledger FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. Collections
CREATE TYPE public.charity_collection_type AS ENUM ('charity_column','raffle','ad_hoc','relief_chest','other');

CREATE TABLE public.charity_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_date date NOT NULL,
  lodge_event_id uuid REFERENCES public.lodge_events(id) ON DELETE SET NULL,
  collection_type public.charity_collection_type NOT NULL,
  gross_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  costs numeric(10,2) NOT NULL DEFAULT 0 CHECK (costs >= 0),
  net_amount numeric(10,2) GENERATED ALWAYS AS (gross_amount - costs) STORED,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charity_collections TO authenticated;
GRANT ALL ON public.charity_collections TO service_role;
ALTER TABLE public.charity_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view collections" ON public.charity_collections FOR SELECT TO authenticated USING (public.can_view_charity(auth.uid()));
CREATE POLICY "edit collections" ON public.charity_collections FOR ALL TO authenticated USING (public.can_edit_charity(auth.uid())) WITH CHECK (public.can_edit_charity(auth.uid()));
CREATE TRIGGER trg_charity_collections_updated BEFORE UPDATE ON public.charity_collections FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_charity_collections_date ON public.charity_collections (collection_date DESC);

-- 5. Donations
CREATE TYPE public.charity_payment_method AS ENUM ('cheque','bacs','cash','online');
CREATE TYPE public.charity_authorised_by AS ENUM ('wm','treasurer','both');

CREATE TABLE public.charity_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_date date NOT NULL,
  charity_id uuid NOT NULL REFERENCES public.charity_ledger(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  purpose text,
  payment_method public.charity_payment_method NOT NULL,
  payment_reference text,
  authorised_by public.charity_authorised_by NOT NULL DEFAULT 'wm',
  confirmation_received boolean NOT NULL DEFAULT false,
  is_festival_contribution boolean NOT NULL DEFAULT false,
  from_relief_chest boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charity_donations TO authenticated;
GRANT ALL ON public.charity_donations TO service_role;
ALTER TABLE public.charity_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view donations" ON public.charity_donations FOR SELECT TO authenticated USING (public.can_view_charity(auth.uid()));
CREATE POLICY "edit donations" ON public.charity_donations FOR ALL TO authenticated USING (public.can_edit_charity(auth.uid())) WITH CHECK (public.can_edit_charity(auth.uid()));
CREATE TRIGGER trg_charity_donations_updated BEFORE UPDATE ON public.charity_donations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_charity_donations_date ON public.charity_donations (donation_date DESC);
CREATE INDEX idx_charity_donations_charity ON public.charity_donations (charity_id);

-- 6. Festival / Public Feed settings (single row enforced)
CREATE TABLE public.charity_festival_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  festival_name text NOT NULL DEFAULT 'Surrey 2030 Festival',
  target_amount numeric(10,2) NOT NULL DEFAULT 0,
  festival_notes text,
  public_feed_start_date date,
  public_feed_start_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_only CHECK (singleton = true)
);
GRANT SELECT, INSERT, UPDATE ON public.charity_festival_settings TO authenticated;
GRANT ALL ON public.charity_festival_settings TO service_role;
GRANT SELECT ON public.charity_festival_settings TO anon;
ALTER TABLE public.charity_festival_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read festival settings" ON public.charity_festival_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "edit festival settings" ON public.charity_festival_settings FOR ALL TO authenticated USING (public.can_edit_charity(auth.uid())) WITH CHECK (public.can_edit_charity(auth.uid()));
CREATE TRIGGER trg_charity_festival_settings_updated BEFORE UPDATE ON public.charity_festival_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
INSERT INTO public.charity_festival_settings (singleton) VALUES (true);

-- 7. Annual report snapshots
CREATE TABLE public.charity_annual_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  masonic_year integer NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  notes text,
  finalised_at timestamptz NOT NULL DEFAULT now(),
  finalised_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charity_annual_reports TO authenticated;
GRANT ALL ON public.charity_annual_reports TO service_role;
ALTER TABLE public.charity_annual_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view annual reports" ON public.charity_annual_reports FOR SELECT TO authenticated USING (public.can_view_charity(auth.uid()));
CREATE POLICY "edit annual reports" ON public.charity_annual_reports FOR ALL TO authenticated USING (public.can_edit_charity(auth.uid())) WITH CHECK (public.can_edit_charity(auth.uid()));
CREATE TRIGGER trg_charity_annual_reports_updated BEFORE UPDATE ON public.charity_annual_reports FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 8. Public-read views for website widgets
CREATE OR REPLACE VIEW public.public_charity_totals
WITH (security_invoker = true) AS
SELECT
  s.public_feed_start_date,
  s.public_feed_start_amount,
  COALESCE(s.public_feed_start_amount, 0)
    + COALESCE((SELECT SUM(amount) FROM public.charity_donations d
                WHERE s.public_feed_start_date IS NULL
                   OR d.donation_date >= s.public_feed_start_date), 0) AS total_raised
FROM public.charity_festival_settings s
WHERE s.singleton = true;

CREATE OR REPLACE VIEW public.public_charity_year_breakdown
WITH (security_invoker = true) AS
WITH cur AS (
  SELECT public.current_lodge_year() AS yr
), yr_bounds AS (
  SELECT make_date(yr, 10, 1) AS start_d, make_date(yr + 1, 9, 30) AS end_d FROM cur
)
SELECT
  l.id AS charity_id,
  l.name,
  l.website,
  COALESCE(SUM(d.amount), 0) AS year_total
FROM public.charity_ledger l
LEFT JOIN public.charity_donations d ON d.charity_id = l.id
  AND d.donation_date BETWEEN (SELECT start_d FROM yr_bounds) AND (SELECT end_d FROM yr_bounds)
GROUP BY l.id, l.name, l.website
HAVING COALESCE(SUM(d.amount), 0) > 0
ORDER BY year_total DESC;

GRANT SELECT ON public.public_charity_totals TO anon, authenticated;
GRANT SELECT ON public.public_charity_year_breakdown TO anon, authenticated;

COMMIT;
