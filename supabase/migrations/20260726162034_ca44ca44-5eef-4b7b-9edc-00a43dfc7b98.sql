DROP FUNCTION IF EXISTS public.is_event_meeting_published(text);

CREATE OR REPLACE FUNCTION public.get_published_meeting_for_event(_event_key text)
RETURNS TABLE(id uuid, event_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.event_key
  FROM public.festive_board_meetings m
  WHERE m.event_key = _event_key
    AND m.status = 'published'::public.meeting_status
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_published_meeting_for_event(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_published_meeting_for_event(text) TO anon, authenticated;