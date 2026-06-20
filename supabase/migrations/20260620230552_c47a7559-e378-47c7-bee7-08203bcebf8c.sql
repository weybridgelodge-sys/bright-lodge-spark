DROP INDEX IF EXISTS public.uniq_attendance_per_booking;
CREATE INDEX IF NOT EXISTS idx_attendance_source_booking
  ON public.festive_board_attendance (source_booking_id)
  WHERE source_booking_id IS NOT NULL;