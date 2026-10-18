ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unit_id text NOT NULL DEFAULT 'weybridge',
  ADD COLUMN IF NOT EXISTS confirm_token_hash text,
  ADD COLUMN IF NOT EXISTS confirm_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.newsletter_subscribers ALTER COLUMN confirmed SET DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_hash_key
  ON public.newsletter_subscribers (confirm_token_hash) WHERE confirm_token_hash IS NOT NULL;
COMMENT ON COLUMN public.newsletter_subscribers.confirm_token_hash IS 'SHA-256 hex of the single-use confirm token; the token itself is never stored.';

ALTER TABLE public.lodge_contact_settings ADD COLUMN IF NOT EXISTS lodge_postcode text;
UPDATE public.lodge_contact_settings SET lodge_postcode = 'GU2 4DR' WHERE unit_id = 'weybridge' AND lodge_postcode IS NULL;

CREATE OR REPLACE FUNCTION public.get_newsletter_subscriber_counts(_unit_id text DEFAULT 'weybridge')
RETURNS TABLE(confirmed_active integer, pending_confirmation integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_edit_newsletter(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    count(*) FILTER (WHERE s.confirmed AND s.unsubscribed_at IS NULL)::int,
    count(*) FILTER (WHERE NOT s.confirmed AND s.unsubscribed_at IS NULL)::int
  FROM public.newsletter_subscribers s WHERE s.unit_id = _unit_id;
END $$;
REVOKE ALL ON FUNCTION public.get_newsletter_subscriber_counts(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_newsletter_subscriber_counts(text) TO authenticated;