
-- 1. newsletter_broadcasts additions
ALTER TABLE public.newsletter_broadcasts
  ADD COLUMN IF NOT EXISTS unified_content boolean NOT NULL DEFAULT false;

-- 2. festive_board_attendance: optional visitor email
ALTER TABLE public.festive_board_attendance
  ADD COLUMN IF NOT EXISTS email text;

-- 3. member_newsletter_opt_outs
CREATE TABLE IF NOT EXISTS public.member_newsletter_opt_outs (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  opted_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_newsletter_opt_outs TO authenticated;
GRANT ALL ON public.member_newsletter_opt_outs TO service_role;

ALTER TABLE public.member_newsletter_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own opt-out"
  ON public.member_newsletter_opt_outs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.can_edit_newsletter(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.can_edit_newsletter(auth.uid()));

CREATE TRIGGER member_newsletter_opt_outs_set_updated_at
  BEFORE UPDATE ON public.member_newsletter_opt_outs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
