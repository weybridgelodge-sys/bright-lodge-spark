
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL,
  results_visibility text NOT NULL DEFAULT 'live' CHECK (results_visibility IN ('live','on_close')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closes_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) >= 2)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view polls" ON public.polls
  FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));

CREATE POLICY "Officers can create polls" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'secretary'::public.app_role)
    OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)
  );

CREATE POLICY "Officers can update polls" ON public.polls
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'secretary'::public.app_role)
    OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'secretary'::public.app_role)
    OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)
  );

CREATE POLICY "Admins can delete polls" ON public.polls
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER polls_set_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index int NOT NULL CHECK (option_index >= 0),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, member_id)
);
GRANT SELECT, INSERT ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Aggregate visibility: members can read all vote rows for polls they can see,
-- but the client only ever displays aggregate counts (never per-voter identity).
-- Officers may need per-vote data for audit.
CREATE POLICY "Active members can read votes for visible polls" ON public.poll_votes
  FOR SELECT TO authenticated
  USING (
    public.is_active_member(auth.uid())
    AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id)
  );

CREATE POLICY "Members can cast their own vote on open polls" ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_id
        AND p.status = 'open'
        AND (p.closes_at IS NULL OR p.closes_at > now())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER TABLE public.poll_votes REPLICA IDENTITY FULL;
ALTER TABLE public.polls REPLICA IDENTITY FULL;
