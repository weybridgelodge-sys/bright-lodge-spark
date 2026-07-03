
CREATE OR REPLACE FUNCTION public.get_officers_public(_year integer DEFAULT NULL)
RETURNS TABLE (
  position_key text,
  title text,
  first_name text,
  middle_name text,
  last_name text,
  post_nominals text,
  provincial_rank text,
  grand_rank text,
  is_past_master boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oa.position_key::text,
    p.title,
    p.first_name,
    p.middle_name,
    p.last_name,
    p.post_nominals,
    p.provincial_rank,
    p.grand_rank,
    COALESCE(p.is_past_master, false)
  FROM public.officer_appointments oa
  JOIN public.profiles p ON p.id = oa.member_id
  WHERE oa.lodge_year = COALESCE(_year, public.current_lodge_year())
$$;

REVOKE ALL ON FUNCTION public.get_officers_public(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_officers_public(integer) TO anon, authenticated;
