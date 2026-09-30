CREATE TABLE public.past_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  lodge_year integer NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (display_name, lodge_year)
);
CREATE UNIQUE INDEX past_masters_member_year ON public.past_masters(member_id, lodge_year) WHERE member_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.past_masters TO authenticated;
GRANT ALL ON public.past_masters TO service_role;
ALTER TABLE public.past_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read past masters" ON public.past_masters FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Secretary manage past masters insert" ON public.past_masters FOR INSERT TO authenticated WITH CHECK (public.can_manage_secretary_returns(auth.uid()));
CREATE POLICY "Secretary manage past masters update" ON public.past_masters FOR UPDATE TO authenticated USING (public.can_manage_secretary_returns(auth.uid()));
CREATE POLICY "Secretary manage past masters delete" ON public.past_masters FOR DELETE TO authenticated USING (public.can_manage_secretary_returns(auth.uid()));