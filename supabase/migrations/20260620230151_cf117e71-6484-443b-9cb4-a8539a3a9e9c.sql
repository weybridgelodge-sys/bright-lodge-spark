-- Enums
CREATE TYPE public.meeting_status AS ENUM ('draft','published','completed');
CREATE TYPE public.attendance_source AS ENUM ('manual','booking');

-- festive_board_meetings additions
ALTER TABLE public.festive_board_meetings
  ADD COLUMN status public.meeting_status NOT NULL DEFAULT 'draft',
  ADD COLUMN is_white_table boolean NOT NULL DEFAULT false,
  ADD COLUMN dining_price_pence integer NOT NULL DEFAULT 3500,
  ADD COLUMN event_key text;

-- Backfill event_key for existing rows
UPDATE public.festive_board_meetings
  SET event_key = 'festive-board-' || to_char(meeting_date, 'YYYY-MM-DD')
  WHERE event_key IS NULL;

ALTER TABLE public.festive_board_meetings
  ALTER COLUMN event_key SET NOT NULL,
  ADD CONSTRAINT festive_board_meetings_event_key_unique UNIQUE (event_key);

-- At most one published meeting at a time
CREATE UNIQUE INDEX one_published_meeting
  ON public.festive_board_meetings ((status))
  WHERE status = 'published';

-- bookings: link to a meeting
ALTER TABLE public.bookings
  ADD COLUMN meeting_id uuid REFERENCES public.festive_board_meetings(id) ON DELETE SET NULL;
CREATE INDEX idx_bookings_meeting_id ON public.bookings(meeting_id);

-- festive_board_attendance: source tracking
ALTER TABLE public.festive_board_attendance
  ADD COLUMN source public.attendance_source NOT NULL DEFAULT 'manual',
  ADD COLUMN source_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uniq_attendance_per_booking
  ON public.festive_board_attendance (source_booking_id)
  WHERE source_booking_id IS NOT NULL;

-- Allow the public Bookings page (anon) to read the single published meeting
CREATE POLICY "Anyone can view published meetings"
  ON public.festive_board_meetings FOR SELECT TO anon, authenticated
  USING (status = 'published');

GRANT SELECT ON public.festive_board_meetings TO anon;