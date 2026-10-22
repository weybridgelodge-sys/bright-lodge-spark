ALTER TABLE public.loi_attendance DROP CONSTRAINT IF EXISTS loi_attendance_part_check;

CREATE OR REPLACE FUNCTION public.loi_attendance_validate_part()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.part IN ('candidate','observing','other','ipm') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.officer_positions p
             WHERE p.key = NEW.part AND COALESCE(p.category,'office') = 'office') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Unknown rehearsal part: %', NEW.part USING ERRCODE = '23514';
END $$;

DROP TRIGGER IF EXISTS loi_attendance_validate_part ON public.loi_attendance;
CREATE TRIGGER loi_attendance_validate_part
  BEFORE INSERT OR UPDATE OF part ON public.loi_attendance
  FOR EACH ROW EXECUTE FUNCTION public.loi_attendance_validate_part();