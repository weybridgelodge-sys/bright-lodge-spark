-- ============================================================
-- PROFILES: column-level SELECT + PII RPC
-- ============================================================
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, email, full_name, rank, office, joined_year, avatar_url, status,
  created_at, updated_at, mother_lodge, degree, initiation_date, is_past_master,
  title, first_name, last_name, provincial_rank, grand_rank,
  is_royal_arch, is_honorary_member, is_ugle_portal_registered,
  passing_date, raising_date, joined_lodge_date,
  preferred_name, middle_name, post_nominals, royal_arch_date, proposer
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profiles_pii(_ids uuid[])
RETURNS TABLE (
  id uuid,
  date_of_birth date,
  phone text,
  address_line1 text,
  address_line2 text,
  address_line3 text,
  town text,
  county text,
  postcode text,
  ugle_reg_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.date_of_birth, p.phone,
    p.address_line1, p.address_line2, p.address_line3,
    p.town, p.county, p.postcode,
    p.ugle_reg_number
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND (
      p.id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
      OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
      OR public.has_role(auth.uid(), 'almoner'::public.app_role)
      OR public.is_current_wm_or_ipm(auth.uid())
    )
$$;

REVOKE ALL ON FUNCTION public.get_profiles_pii(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_pii(uuid[]) TO authenticated;

-- ============================================================
-- SUMMONSES: hide dining_enquiry_email + secretary RPC
-- ============================================================
REVOKE SELECT ON public.summonses FROM authenticated;

GRANT SELECT (
  id, meeting_number, lodge_event_id, meeting_date, meeting_time, meeting_type,
  dress_code, minutes_confirmation_date, next_meeting_date, officer_night_date,
  agenda, candidates, dining_enquiry_name, notice_overrides, pdf_storage_path,
  status, sent_at, sent_to_count, created_by, created_at, updated_at,
  dining_menu, dining_price, dining_deadline
) ON public.summonses TO authenticated;

CREATE OR REPLACE FUNCTION public.get_summons_dining_contacts(_ids uuid[])
RETURNS TABLE (id uuid, dining_enquiry_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.dining_enquiry_email
  FROM public.summonses s
  WHERE s.id = ANY(_ids)
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
      OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
    )
$$;

REVOKE ALL ON FUNCTION public.get_summons_dining_contacts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_summons_dining_contacts(uuid[]) TO authenticated;
