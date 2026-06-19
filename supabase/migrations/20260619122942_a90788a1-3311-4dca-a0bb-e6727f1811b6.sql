CREATE TABLE public.charity_public_feed_metrics (
  singleton boolean PRIMARY KEY DEFAULT true,
  public_feed_start_date date,
  total_raised numeric NOT NULL DEFAULT 0,
  current_year_total numeric NOT NULL DEFAULT 0,
  festival_name text NOT NULL DEFAULT 'Surrey 2030 Festival',
  festival_target_amount numeric NOT NULL DEFAULT 0,
  festival_total numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT charity_public_feed_metrics_singleton CHECK (singleton = true)
);

GRANT SELECT ON public.charity_public_feed_metrics TO anon, authenticated;
GRANT ALL ON public.charity_public_feed_metrics TO service_role;

ALTER TABLE public.charity_public_feed_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read charity feed metrics"
ON public.charity_public_feed_metrics
FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.refresh_charity_public_feed_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_start_amount numeric := 0;
  v_festival_name text := 'Surrey 2030 Festival';
  v_target numeric := 0;
  v_year integer;
  v_year_start date;
  v_year_end date;
  v_total numeric := 0;
  v_year_total numeric := 0;
  v_festival_total numeric := 0;
BEGIN
  SELECT
    s.public_feed_start_date,
    COALESCE(s.public_feed_start_amount, 0),
    COALESCE(NULLIF(trim(s.festival_name), ''), 'Surrey 2030 Festival'),
    COALESCE(s.target_amount, 0)
  INTO v_start_date, v_start_amount, v_festival_name, v_target
  FROM public.charity_festival_settings s
  WHERE s.singleton = true
  LIMIT 1;

  v_year := CASE
    WHEN EXTRACT(MONTH FROM now())::int >= 10 THEN EXTRACT(YEAR FROM now())::int
    ELSE EXTRACT(YEAR FROM now())::int - 1
  END;
  v_year_start := make_date(v_year, 10, 1);
  v_year_end := make_date(v_year + 1, 9, 30);

  SELECT v_start_amount + COALESCE(SUM(d.amount), 0)
  INTO v_total
  FROM public.charity_donations d
  WHERE v_start_date IS NULL OR d.donation_date >= v_start_date;

  SELECT COALESCE(SUM(d.amount), 0)
  INTO v_year_total
  FROM public.charity_donations d
  WHERE d.donation_date BETWEEN v_year_start AND v_year_end;

  SELECT COALESCE(SUM(d.amount), 0)
  INTO v_festival_total
  FROM public.charity_donations d
  LEFT JOIN public.charity_ledger l ON l.id = d.charity_id
  WHERE d.is_festival_contribution = true
     OR lower(trim(COALESCE(l.name, ''))) = lower(trim(v_festival_name))
     OR lower(COALESCE(l.name, '')) LIKE '%surrey 2030%'
     OR lower(COALESCE(l.name, '')) LIKE '%2030 festival%';

  INSERT INTO public.charity_public_feed_metrics (
    singleton,
    public_feed_start_date,
    total_raised,
    current_year_total,
    festival_name,
    festival_target_amount,
    festival_total,
    updated_at
  ) VALUES (
    true,
    v_start_date,
    v_total,
    v_year_total,
    v_festival_name,
    v_target,
    v_festival_total,
    now()
  )
  ON CONFLICT (singleton) DO UPDATE SET
    public_feed_start_date = EXCLUDED.public_feed_start_date,
    total_raised = EXCLUDED.total_raised,
    current_year_total = EXCLUDED.current_year_total,
    festival_name = EXCLUDED.festival_name,
    festival_target_amount = EXCLUDED.festival_target_amount,
    festival_total = EXCLUDED.festival_total,
    updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_charity_public_feed_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_charity_public_feed_metrics() TO service_role;

CREATE OR REPLACE FUNCTION public.tg_refresh_charity_public_feed_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_charity_public_feed_metrics();
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.tg_refresh_charity_public_feed_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_refresh_charity_public_feed_metrics() TO service_role;

CREATE TRIGGER refresh_charity_feed_after_donations
AFTER INSERT OR UPDATE OR DELETE ON public.charity_donations
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_charity_public_feed_metrics();

CREATE TRIGGER refresh_charity_feed_after_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.charity_ledger
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_charity_public_feed_metrics();

CREATE TRIGGER refresh_charity_feed_after_settings
AFTER INSERT OR UPDATE OR DELETE ON public.charity_festival_settings
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_charity_public_feed_metrics();

SELECT public.refresh_charity_public_feed_metrics();