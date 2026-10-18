-- Join Us figures only. Subscription now comes from subscription_settings
-- (the Treasurer New member fees screen's "Annual subscription rate").
CREATE OR REPLACE FUNCTION public.get_join_us_costs()
RETURNS TABLE(annual_dues_pence integer, dining_price_pence integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT s.annual_rate_pence FROM public.subscription_settings s
       ORDER BY s.updated_at DESC LIMIT 1),
    COALESCE(
      (SELECT m.dining_price_pence FROM public.festive_board_meetings m
         WHERE m.status = 'published' AND m.cancelled_at IS NULL AND m.dining_price_pence > 0
           AND m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
         ORDER BY m.meeting_date ASC LIMIT 1),
      (SELECT m.dining_price_pence FROM public.festive_board_meetings m
         WHERE m.status IN ('published','completed') AND m.cancelled_at IS NULL AND m.dining_price_pence > 0
           AND m.meeting_date < (now() AT TIME ZONE 'Europe/London')::date
         ORDER BY m.meeting_date DESC LIMIT 1))
$$;
GRANT EXECUTE ON FUNCTION public.get_join_us_costs() TO anon, authenticated;