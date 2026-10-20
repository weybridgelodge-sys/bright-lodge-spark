CREATE TABLE IF NOT EXISTS public.units (
  id text PRIMARY KEY,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read units" ON public.units FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));

-- Seed every unit already in use, resolved by query; name it from the lodge template only when there is exactly one unit.
INSERT INTO public.units (id)
SELECT DISTINCT u FROM (
  SELECT unit_id u FROM public.profiles UNION SELECT unit_id FROM public.festive_board_meetings
  UNION SELECT unit_id FROM public.bookings UNION SELECT unit_id FROM public.event_accounts
) s WHERE u IS NOT NULL
ON CONFLICT (id) DO NOTHING;
UPDATE public.units SET name = (SELECT nullif(trim(coalesce(lodge_name,'') || ' ' || coalesce('No. ' || lodge_number, '')), '') FROM public.lodge_template LIMIT 1)
WHERE name IS NULL AND (SELECT count(*) FROM public.units) = 1 AND (SELECT count(*) FROM public.lodge_template) = 1;

-- Host unit: no literal default. Backfill from the creator's unit, else the only existing unit.
ALTER TABLE public.event_accounts ALTER COLUMN unit_id DROP DEFAULT;
UPDATE public.event_accounts e SET unit_id = coalesce(
  (SELECT p.unit_id FROM public.profiles p WHERE p.id = e.created_by),
  (SELECT min(id) FROM public.units HAVING count(*) = 1),
  e.unit_id);
ALTER TABLE public.event_accounts ADD CONSTRAINT event_accounts_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);

-- Set on create from the creating user's unit (else the only unit); never changeable from the editor.
CREATE OR REPLACE FUNCTION public.event_accounts_host_unit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.unit_id := coalesce(
      (SELECT unit_id FROM profiles WHERE id = auth.uid()),
      (SELECT min(id) FROM units HAVING count(*) = 1));
    IF NEW.unit_id IS NULL THEN RAISE EXCEPTION 'Cannot work out the host lodge for this event'; END IF;
  ELSE
    NEW.unit_id := OLD.unit_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_event_accounts_host_unit ON public.event_accounts;
CREATE TRIGGER trg_event_accounts_host_unit BEFORE INSERT OR UPDATE ON public.event_accounts
FOR EACH ROW EXECUTE FUNCTION public.event_accounts_host_unit();