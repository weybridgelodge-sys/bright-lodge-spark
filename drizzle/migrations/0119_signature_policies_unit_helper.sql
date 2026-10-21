CREATE OR REPLACE FUNCTION public.member_unit_id(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unit_id FROM public.profiles WHERE id = _user
$$;
REVOKE ALL ON FUNCTION public.member_unit_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_unit_id(uuid) TO authenticated, service_role;

DROP POLICY "Officers read unit signature metadata" ON public.member_signatures;
CREATE POLICY "Officers read unit signature metadata" ON public.member_signatures FOR SELECT TO authenticated USING (
  unit_id = public.member_unit_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid()) OR public.is_current_officer(auth.uid(),'worshipful_master')));
DROP POLICY "Admin/Secretary read signature events" ON public.signature_event_audit;
CREATE POLICY "Admin/Secretary read signature events" ON public.signature_event_audit FOR SELECT TO authenticated USING (
  unit_id = public.member_unit_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));
DROP POLICY "Admin/Secretary read signature usage" ON public.signature_usage_audit;
CREATE POLICY "Admin/Secretary read signature usage" ON public.signature_usage_audit FOR SELECT TO authenticated USING (
  unit_id = public.member_unit_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));