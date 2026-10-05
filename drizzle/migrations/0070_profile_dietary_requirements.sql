ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_requirements text
  CHECK (dietary_requirements IS NULL OR char_length(dietary_requirements) <= 500);
COMMENT ON COLUMN public.profiles.dietary_requirements IS 'Private (health data): no column SELECT grant; read via get_profiles_pii.';

DROP FUNCTION IF EXISTS public.get_profiles_pii(uuid[]);
CREATE FUNCTION public.get_profiles_pii(_ids uuid[])
 RETURNS TABLE(id uuid, date_of_birth date, phone text, address_line1 text, address_line2 text, address_line3 text, town text, county text, postcode text, ugle_reg_number text, dietary_requirements text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.date_of_birth, p.phone,
    p.address_line1, p.address_line2, p.address_line3,
    p.town, p.county, p.postcode, p.ugle_reg_number, p.dietary_requirements
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND (
      p.id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
      OR public.is_current_officer(auth.uid(), 'secretary')
      OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
      OR public.has_role(auth.uid(), 'almoner'::public.app_role)
      OR public.is_current_wm_or_ipm(auth.uid())
    )
$function$;
REVOKE ALL ON FUNCTION public.get_profiles_pii(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profiles_pii(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_profiles_pii(uuid[]) TO authenticated;