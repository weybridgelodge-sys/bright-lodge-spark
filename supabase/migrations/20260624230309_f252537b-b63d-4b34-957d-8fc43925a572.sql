
-- 1) Replace public_charity_totals with a security_invoker view sourced from the
--    already-public charity_public_feed_metrics table.
DROP VIEW IF EXISTS public.public_charity_totals;
CREATE VIEW public.public_charity_totals
WITH (security_invoker = true) AS
SELECT
  public_feed_start_date,
  NULL::numeric AS public_feed_start_amount,
  total_raised
FROM public.charity_public_feed_metrics
WHERE singleton = true;

GRANT SELECT ON public.public_charity_totals TO anon, authenticated;
GRANT ALL ON public.public_charity_totals TO service_role;

-- 2) Pin search_path on the four email queue helpers and restrict EXECUTE
--    to service_role (used by edge functions). Revoke from public/anon/authenticated.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
