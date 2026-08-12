CREATE OR REPLACE FUNCTION public.get_upcoming_public_meetings()
RETURNS TABLE(meeting_date date, ceremony text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.meeting_date,
         (
           SELECT CASE
             WHEN c ~* '(initiation|passing|raising|installation|ceremony|festive|ladies|white table|emergency)'
               THEN c
             ELSE NULL
           END
           FROM (
             SELECT btrim(regexp_replace(coalesce(m.notes, ''), '^[^-–—]*[-–—]\s*', '')) AS c
           ) s
         ) AS ceremony
  FROM public.festive_board_meetings m
  WHERE m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
    AND m.status <> 'completed'
  ORDER BY m.meeting_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_public_meetings() TO anon, authenticated;