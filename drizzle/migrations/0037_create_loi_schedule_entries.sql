CREATE TABLE public.loi_schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Lodge of Instruction',
  event_date date NOT NULL,
  time_from time NOT NULL DEFAULT '19:30',
  time_to time NOT NULL DEFAULT '21:30',
  venue text NOT NULL DEFAULT 'Guildford Masonic Centre',
  description text,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loi_schedule_entries TO authenticated;
GRANT ALL ON public.loi_schedule_entries TO service_role;
ALTER TABLE public.loi_schedule_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read LOI schedule" ON public.loi_schedule_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Secretariat insert LOI schedule" ON public.loi_schedule_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master'));
CREATE POLICY "Secretariat update LOI schedule" ON public.loi_schedule_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master'));
CREATE POLICY "Secretariat delete LOI schedule" ON public.loi_schedule_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master'));
CREATE TRIGGER loi_schedule_entries_updated_at BEFORE UPDATE ON public.loi_schedule_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();