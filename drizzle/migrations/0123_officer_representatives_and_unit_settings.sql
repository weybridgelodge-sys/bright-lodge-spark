ALTER TABLE public.officer_positions
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS unit_id text NULL REFERENCES public.units(id),
  ADD COLUMN IF NOT EXISTS print_label text NULL,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_in jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.officer_positions ADD CONSTRAINT officer_positions_category_chk CHECK (category IN ('office','representative'));
COMMENT ON COLUMN public.officer_positions.unit_id IS 'NULL = shared default position for every unit; otherwise owned by that unit';
COMMENT ON COLUMN public.officer_positions.include_in IS 'Representatives only: per-consumer opt-in (summons, provincial_return, ugle_return, roll_ranking, progression, letters)';

ALTER TABLE public.officer_appointments ADD COLUMN IF NOT EXISTS display_name text NULL;
COMMENT ON COLUMN public.officer_appointments.display_name IS 'Holder name used only when member_id is null (non-member representative)';

INSERT INTO public.officer_positions (key,label,order_index,is_progressive,category,print_label,include_in) VALUES
 ('rep_royal_arch','Royal Arch Representative',300,false,'representative','ROYAL ARCH REP','{"summons":true,"provincial_return":true}'),
 ('rep_petitions','Provincial Petitions Representative',310,false,'representative','PET''NS REP','{"summons":true,"provincial_return":true}'),
 ('rep_sports','Masonic Sports Association Representative',320,false,'representative','SPORTS REP','{"summons":true,"provincial_return":true}'),
 ('rep_halls','Masonic Halls Fund Representative',330,false,'representative','HALLS REP','{"summons":true,"provincial_return":true}')
ON CONFLICT (key) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.officer_positions TO authenticated;
GRANT ALL ON public.officer_positions TO service_role;

CREATE OR REPLACE FUNCTION public.is_representative_position(_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.officer_positions WHERE key = _key AND category = 'representative')
$$;

CREATE POLICY "Admin or Secretary add representative positions" ON public.officer_positions
  FOR INSERT TO authenticated
  WITH CHECK (category = 'representative' AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));
CREATE POLICY "Admin or Secretary edit representative positions" ON public.officer_positions
  FOR UPDATE TO authenticated
  USING (category = 'representative' AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())))
  WITH CHECK (category = 'representative' AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));

-- Representative appointments: admin and Secretary only (WM read-only), layered over existing tracker policies.
CREATE POLICY "Representative appointments insert admin or Secretary" ON public.officer_appointments AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_representative_position(position_key) OR public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid()));
CREATE POLICY "Representative appointments update admin or Secretary" ON public.officer_appointments AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (NOT public.is_representative_position(position_key) OR public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid()))
  WITH CHECK (NOT public.is_representative_position(position_key) OR public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid()));
CREATE POLICY "Representative appointments delete admin or Secretary" ON public.officer_appointments AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (NOT public.is_representative_position(position_key) OR public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid()));

-- Per-unit settings (meeting-pattern manual override moves here from global module_settings).
CREATE TABLE public.unit_settings (
  unit_id text NOT NULL REFERENCES public.units(id),
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, key)
);
GRANT SELECT, INSERT, UPDATE ON public.unit_settings TO authenticated;
GRANT ALL ON public.unit_settings TO service_role;
ALTER TABLE public.unit_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read own unit settings" ON public.unit_settings FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) AND unit_id = (SELECT p.unit_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Admin or Secretary insert own unit settings" ON public.unit_settings FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())) AND unit_id = (SELECT p.unit_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Admin or Secretary update own unit settings" ON public.unit_settings FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())) AND unit_id = (SELECT p.unit_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())) AND unit_id = (SELECT p.unit_id FROM public.profiles p WHERE p.id = auth.uid()));

INSERT INTO public.unit_settings (unit_id, key, value, updated_by, updated_at)
SELECT u.id, m.key, m.value, m.updated_by, m.updated_at
FROM public.units u JOIN public.module_settings m ON m.key = 'meeting_pattern_manual_override'
ON CONFLICT DO NOTHING;