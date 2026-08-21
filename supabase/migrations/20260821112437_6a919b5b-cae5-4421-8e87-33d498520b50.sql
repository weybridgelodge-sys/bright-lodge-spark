-- 1. Neutralise the duplicate booking (refunded manually via Stripe) and hand
--    its attendance row back to the original booking.
UPDATE public.festive_board_attendance
SET source_booking_id = '0fd731b3-8e49-4ee0-96a1-f7727769cf54',
    updated_at = now()
WHERE source_booking_id = 'bf8cfb87-555d-497e-bce0-1a5c84495781';

UPDATE public.bookings
SET payment_status = 'refunded'
WHERE id = 'bf8cfb87-555d-497e-bce0-1a5c84495781';

-- 2. Real, deliberate uniqueness: one live booking per person per meeting,
--    regardless of which live status it is in. 'paid' was previously missing
--    from the old index, which is how a second charge slipped through.
DROP INDEX IF EXISTS public.bookings_unique_status_per_meeting;

CREATE UNIQUE INDEX bookings_one_live_per_meeting
  ON public.bookings (meeting_id, lower(contact_email))
  WHERE meeting_id IS NOT NULL
    AND payment_status IN ('paid','confirmed','apologies','waitlisted','waitlisted_refunded');