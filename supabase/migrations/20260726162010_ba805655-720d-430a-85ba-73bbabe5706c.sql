DROP POLICY IF EXISTS "Anyone can view published meetings" ON public.festive_board_meetings;

REVOKE SELECT ON public.festive_board_meetings FROM anon;

CREATE OR REPLACE FUNCTION public.is_event_meeting_published(_event_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.festive_board_meetings
    WHERE event_key = _event_key
      AND status = 'published'::public.meeting_status
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_event_meeting_published(text) TO anon, authenticated;