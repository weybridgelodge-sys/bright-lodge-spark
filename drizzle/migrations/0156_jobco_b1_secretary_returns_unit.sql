-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "secretary_returns_all" ON public.secretary_returns FOR ALL TO authenticated
--   USING (can_manage_secretary_returns(auth.uid())) WITH CHECK (can_manage_secretary_returns(auth.uid()));
-- CREATE POLICY "secretary_returns_select" ON public.secretary_returns FOR SELECT TO authenticated
--   USING (can_manage_secretary_returns(auth.uid()));
DROP POLICY "secretary_returns_select" ON public.secretary_returns;
DROP POLICY "secretary_returns_all" ON public.secretary_returns;
CREATE POLICY "secretary_returns_all" ON public.secretary_returns FOR ALL TO authenticated
  USING (public.can_manage_secretary_returns(auth.uid()) AND unit_id = public.my_unit())
  WITH CHECK (public.can_manage_secretary_returns(auth.uid()) AND unit_id = public.my_unit());