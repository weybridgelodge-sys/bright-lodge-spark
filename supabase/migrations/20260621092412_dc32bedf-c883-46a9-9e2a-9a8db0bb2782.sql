
ALTER TABLE public.festive_board_attendance
  DROP CONSTRAINT IF EXISTS festive_board_attendance_source_booking_id_fkey;
ALTER TABLE public.festive_board_attendance
  ALTER COLUMN source_booking_id TYPE text USING source_booking_id::text;

UPDATE public.bookings SET meeting_id = meeting_id WHERE meeting_id IS NOT NULL;
