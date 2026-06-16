CREATE OR REPLACE FUNCTION public.current_office_label(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT op.label
  FROM public.officer_appointments oa
  JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.member_id = _user_id
    AND oa.lodge_year = CASE
      WHEN EXTRACT(MONTH FROM now())::int >= 10 THEN EXTRACT(YEAR FROM now())::int
      ELSE EXTRACT(YEAR FROM now())::int - 1
    END
  ORDER BY op.order_index DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_office_label(uuid) TO authenticated;