
-- Recalculate public charity feed metrics + views to include match funding

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

  SELECT v_start_amount + COALESCE(SUM(d.amount + COALESCE(d.match_funding_amount, 0)), 0)
  INTO v_total
  FROM public.charity_donations d
  WHERE v_start_date IS NULL OR d.donation_date >= v_start_date;

  SELECT COALESCE(SUM(d.amount + COALESCE(d.match_funding_amount, 0)), 0)
  INTO v_year_total
  FROM public.charity_donations d
  WHERE d.donation_date BETWEEN v_year_start AND v_year_end;

  SELECT COALESCE(SUM(d.amount + COALESCE(d.match_funding_amount, 0)), 0)
  INTO v_festival_total
  FROM public.charity_donations d
  LEFT JOIN public.charity_ledger l ON l.id = d.charity_id
  WHERE d.is_festival_contribution = true
     OR lower(trim(COALESCE(l.name, ''))) = lower(trim(v_festival_name))
     OR lower(COALESCE(l.name, '')) LIKE '%surrey 2030%'
     OR lower(COALESCE(l.name, '')) LIKE '%2030 festival%';

  INSERT INTO public.charity_public_feed_metrics (
    singleton, public_feed_start_date, total_raised, current_year_total,
    festival_name, festival_target_amount, festival_total, updated_at
  ) VALUES (
    true, v_start_date, v_total, v_year_total,
    v_festival_name, v_target, v_festival_total, now()
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

-- Public year-breakdown view (per-charity total includes match funding)
DROP VIEW IF EXISTS public.public_charity_year_breakdown;
CREATE VIEW public.public_charity_year_breakdown AS
WITH cur AS (
  SELECT public.current_lodge_year() AS yr
),
yr_bounds AS (
  SELECT make_date(cur.yr, 10, 1) AS start_d,
         make_date((cur.yr + 1), 9, 30) AS end_d
  FROM cur
)
SELECT l.id AS charity_id,
       l.name,
       l.website,
       COALESCE(sum(d.amount + COALESCE(d.match_funding_amount, 0)), 0::numeric) AS year_total
FROM charity_ledger l
LEFT JOIN charity_donations d
  ON d.charity_id = l.id
 AND d.donation_date >= (SELECT start_d FROM yr_bounds)
 AND d.donation_date <= (SELECT end_d FROM yr_bounds)
GROUP BY l.id, l.name, l.website
HAVING COALESCE(sum(d.amount + COALESCE(d.match_funding_amount, 0)), 0::numeric) > 0::numeric
ORDER BY COALESCE(sum(d.amount + COALESCE(d.match_funding_amount, 0)), 0::numeric) DESC;

GRANT SELECT ON public.public_charity_year_breakdown TO anon, authenticated;

-- Public all-time totals view (includes match funding)
DROP VIEW IF EXISTS public.public_charity_totals;
CREATE VIEW public.public_charity_totals AS
SELECT s.public_feed_start_date,
       s.public_feed_start_amount,
       (COALESCE(s.public_feed_start_amount, 0::numeric)
        + COALESCE((SELECT sum(d.amount + COALESCE(d.match_funding_amount, 0))
                    FROM charity_donations d
                    WHERE s.public_feed_start_date IS NULL
                       OR d.donation_date >= s.public_feed_start_date), 0::numeric)
       ) AS total_raised
FROM charity_festival_settings s
WHERE s.singleton = true;

GRANT SELECT ON public.public_charity_totals TO anon, authenticated;

-- Recompute snapshot
SELECT public.refresh_charity_public_feed_metrics();
