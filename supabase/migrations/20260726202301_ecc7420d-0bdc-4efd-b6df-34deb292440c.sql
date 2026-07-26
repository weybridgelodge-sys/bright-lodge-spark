
CREATE TABLE public.push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_device_tokens TO authenticated;
GRANT ALL ON public.push_device_tokens TO service_role;
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own tokens insert" ON public.push_device_tokens
  FOR INSERT TO authenticated WITH CHECK (member_id = auth.uid());
CREATE POLICY "Own tokens update" ON public.push_device_tokens
  FOR UPDATE TO authenticated USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "Own tokens delete" ON public.push_device_tokens
  FOR DELETE TO authenticated USING (member_id = auth.uid());
CREATE POLICY "Own tokens select" ON public.push_device_tokens
  FOR SELECT TO authenticated USING (member_id = auth.uid());

CREATE INDEX idx_push_device_tokens_member ON public.push_device_tokens(member_id);

CREATE TABLE public.festive_board_deadline_reminders_sent (
  meeting_id uuid NOT NULL REFERENCES public.festive_board_meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, member_id)
);
GRANT ALL ON public.festive_board_deadline_reminders_sent TO service_role;
ALTER TABLE public.festive_board_deadline_reminders_sent ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.
