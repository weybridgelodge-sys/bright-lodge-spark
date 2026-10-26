CREATE OR REPLACE FUNCTION public.my_unit() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nullif(btrim(unit_id), '') FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_unit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_unit() TO authenticated, service_role;