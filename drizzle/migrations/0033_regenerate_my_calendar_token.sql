CREATE OR REPLACE FUNCTION public.regenerate_my_calendar_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  INSERT INTO public.member_calendar_tokens (member_id, token, created_at, last_fetched_at, fetch_count)
  VALUES (auth.uid(), v_token, now(), NULL, 0)
  ON CONFLICT (member_id) DO UPDATE
    SET token = EXCLUDED.token,
        created_at = now(),
        last_fetched_at = NULL,
        fetch_count = 0;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_my_calendar_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_my_calendar_token() TO authenticated;