ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mmh_number text
  CHECK (mmh_number IS NULL OR char_length(mmh_number) <= 40);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rose_croix_number text
  CHECK (rose_croix_number IS NULL OR char_length(rose_croix_number) <= 40);
REVOKE SELECT (mmh_number, rose_croix_number) ON public.profiles FROM anon, authenticated;
COMMENT ON COLUMN public.profiles.mmh_number IS 'Mark Masons'' Hall number. Private: read via get_profiles_pii; written only by admin/Secretary via admin-invite-member.';
COMMENT ON COLUMN public.profiles.rose_croix_number IS 'Rose Croix (A&AR) number. Private: read via get_profiles_pii; written only by admin/Secretary via admin-invite-member.';

DROP FUNCTION IF EXISTS public.get_profiles_pii(uuid[]);
CREATE FUNCTION public.get_profiles_pii(_ids uuid[])
 RETURNS TABLE(id uuid, date_of_birth date, phone text, address_line1 text, address_line2 text, address_line3 text, town text, county text, postcode text, ugle_reg_number text, dietary_requirements text, mmh_number text, rose_croix_number text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.date_of_birth, p.phone,
    p.address_line1, p.address_line2, p.address_line3,
    p.town, p.county, p.postcode, p.ugle_reg_number, p.dietary_requirements,
    p.mmh_number, p.rose_croix_number
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

CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_self_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.title             IS DISTINCT FROM OLD.title
  OR NEW.first_name        IS DISTINCT FROM OLD.first_name
  OR NEW.last_name         IS DISTINCT FROM OLD.last_name
  OR NEW.full_name         IS DISTINCT FROM OLD.full_name
  OR NEW.date_of_birth     IS DISTINCT FROM OLD.date_of_birth
  OR NEW.office            IS DISTINCT FROM OLD.office
  OR NEW.rank              IS DISTINCT FROM OLD.rank
  OR NEW.provincial_rank   IS DISTINCT FROM OLD.provincial_rank
  OR NEW.grand_rank        IS DISTINCT FROM OLD.grand_rank
  OR NEW.ugle_reg_number   IS DISTINCT FROM OLD.ugle_reg_number
  OR NEW.mmh_number        IS DISTINCT FROM OLD.mmh_number
  OR NEW.rose_croix_number IS DISTINCT FROM OLD.rose_croix_number
  OR NEW.is_honorary_member IS DISTINCT FROM OLD.is_honorary_member
  OR NEW.is_royal_arch     IS DISTINCT FROM OLD.is_royal_arch
  OR NEW.royal_arch_date   IS DISTINCT FROM OLD.royal_arch_date
  OR NEW.initiation_date   IS DISTINCT FROM OLD.initiation_date
  OR NEW.passing_date      IS DISTINCT FROM OLD.passing_date
  OR NEW.raising_date      IS DISTINCT FROM OLD.raising_date
  OR NEW.joined_lodge_date IS DISTINCT FROM OLD.joined_lodge_date
  OR NEW.joined_year       IS DISTINCT FROM OLD.joined_year
  OR NEW.mother_lodge      IS DISTINCT FROM OLD.mother_lodge
  OR NEW.proposer          IS DISTINCT FROM OLD.proposer
  THEN
    RAISE EXCEPTION 'Only admins can change name, title, date of birth, rank, office, dates, registration, or memberships';
  END IF;

  RETURN NEW;
END $function$;