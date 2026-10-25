-- Job BW fix: officer positions with no unit (all of them today) stay visible to every unit,
-- so passing a unit never hides a holder whose position is not yet unit-scoped.
CREATE OR REPLACE FUNCTION public.current_officer_holder(_position_key text, _at date DEFAULT NULL::date, _unit text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oa.member_id
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = _position_key AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND (coalesce(_unit, '') = '' OR coalesce(op.unit_id, '') = '' OR op.unit_id = _unit)
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= COALESCE(_at, (now() AT TIME ZONE 'Europe/London')::date)
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$function$;