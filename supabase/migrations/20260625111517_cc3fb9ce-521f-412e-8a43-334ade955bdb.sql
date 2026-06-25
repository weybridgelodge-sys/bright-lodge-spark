-- 0. Deduplicate existing bookings, keeping the earliest per (meeting_id, lower(email), payment_status)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY meeting_id, lower(contact_email), payment_status
           ORDER BY created_at ASC
         ) AS rn
  FROM public.bookings
  WHERE meeting_id IS NOT NULL
    AND payment_status IN ('confirmed','apologies')
)
DELETE FROM public.bookings b
USING ranked r
WHERE b.id = r.id AND r.rn > 1;

-- 1. Add 'apologies' value to enum if missing
ALTER TYPE public.festive_attendance_status ADD VALUE IF NOT EXISTS 'apologies';

-- 2. Prevent duplicate non-card bookings from rapid double-clicks.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_non_card_per_meeting
  ON public.bookings (meeting_id, lower(contact_email), payment_status)
  WHERE meeting_id IS NOT NULL
    AND payment_status IN ('confirmed','apologies');
