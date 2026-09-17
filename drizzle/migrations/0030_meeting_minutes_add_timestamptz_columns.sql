ALTER TABLE public.meeting_minutes
  ADD COLUMN IF NOT EXISTS meeting_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_meeting_at timestamptz;

UPDATE public.meeting_minutes
SET meeting_at = COALESCE(meeting_at, meeting_date::timestamptz),
    next_meeting_at = COALESCE(next_meeting_at, next_meeting_date::timestamptz);

ALTER TABLE public.meeting_minutes ALTER COLUMN meeting_date DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_meeting_minutes_sync_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.meeting_at IS NULL AND NEW.meeting_date IS NOT NULL THEN
    NEW.meeting_at := NEW.meeting_date::timestamptz;
  END IF;
  IF NEW.meeting_at IS NOT NULL THEN
    NEW.meeting_date := (NEW.meeting_at AT TIME ZONE 'UTC')::date;
  END IF;

  IF NEW.next_meeting_at IS NULL AND NEW.next_meeting_date IS NOT NULL THEN
    NEW.next_meeting_at := NEW.next_meeting_date::timestamptz;
  END IF;
  IF NEW.next_meeting_at IS NOT NULL THEN
    NEW.next_meeting_date := (NEW.next_meeting_at AT TIME ZONE 'UTC')::date;
  ELSE
    NEW.next_meeting_date := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meeting_minutes_sync_dates ON public.meeting_minutes;
CREATE TRIGGER meeting_minutes_sync_dates
BEFORE INSERT OR UPDATE ON public.meeting_minutes
FOR EACH ROW EXECUTE FUNCTION public.tg_meeting_minutes_sync_dates();