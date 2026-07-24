
-- Per-member calendar subscription tokens
CREATE TABLE public.member_calendar_tokens (
  member_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_fetched_at timestamptz
);

GRANT SELECT ON public.member_calendar_tokens TO authenticated;
GRANT ALL ON public.member_calendar_tokens TO service_role;

ALTER TABLE public.member_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own calendar token"
  ON public.member_calendar_tokens
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- Auto-provision a token whenever a profile is created
CREATE OR REPLACE FUNCTION public.tg_ensure_member_calendar_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_calendar_tokens (member_id)
  VALUES (NEW.id)
  ON CONFLICT (member_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_member_calendar_token
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_ensure_member_calendar_token();

-- Backfill tokens for every existing active member
INSERT INTO public.member_calendar_tokens (member_id)
SELECT id FROM public.profiles
ON CONFLICT (member_id) DO NOTHING;
