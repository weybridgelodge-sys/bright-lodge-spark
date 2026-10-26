-- Job CS / 0166: offices stay a shared catalogue (blank unit); the 4 representative rows become lodge-owned.
-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "Active members can read positions" ON public.officer_positions FOR SELECT TO authenticated
--   USING (is_active_member(auth.uid()));
-- CREATE POLICY "Admin or Secretary add representative positions" ON public.officer_positions FOR INSERT TO authenticated
--   WITH CHECK ((category = 'representative'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
-- CREATE POLICY "Admin or Secretary edit representative positions" ON public.officer_positions FOR UPDATE TO authenticated
--   USING ((category = 'representative'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())))
--   WITH CHECK ((category = 'representative'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
-- DROP TRIGGER IF EXISTS officer_positions_fill_unit ON public.officer_positions;
-- (Backfill rollback: UPDATE public.officer_positions SET unit_id = NULL WHERE key IN ('rep_royal_arch','rep_petitions','rep_sports','rep_halls');)

DO $$
BEGIN
  IF (SELECT count(*) FROM public.units) <> 1 THEN
    RAISE EXCEPTION 'Job CS 0166: expected exactly one unit, found %', (SELECT count(*) FROM public.units);
  END IF;
  UPDATE public.officer_positions SET unit_id = (SELECT id FROM public.units)
   WHERE key IN ('rep_royal_arch','rep_petitions','rep_sports','rep_halls')
     AND category = 'representative' AND coalesce(btrim(unit_id), '') = '';
END $$;

DROP TRIGGER IF EXISTS officer_positions_fill_unit ON public.officer_positions;
CREATE TRIGGER officer_positions_fill_unit BEFORE INSERT ON public.officer_positions
  FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();

DROP POLICY IF EXISTS "Active members can read positions" ON public.officer_positions;
CREATE POLICY "Active members can read positions" ON public.officer_positions FOR SELECT TO authenticated
  USING (is_active_member(auth.uid()) AND (coalesce(btrim(unit_id), '') = '' OR unit_id = public.my_unit()));

DROP POLICY IF EXISTS "Admin or Secretary add representative positions" ON public.officer_positions;
CREATE POLICY "Admin or Secretary add representative positions" ON public.officer_positions FOR INSERT TO authenticated
  WITH CHECK ((category = 'representative'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Admin or Secretary edit representative positions" ON public.officer_positions;
CREATE POLICY "Admin or Secretary edit representative positions" ON public.officer_positions FOR UPDATE TO authenticated
  USING ((category = 'representative'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND unit_id = public.my_unit())
  WITH CHECK ((category = 'representative'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND unit_id = public.my_unit());
