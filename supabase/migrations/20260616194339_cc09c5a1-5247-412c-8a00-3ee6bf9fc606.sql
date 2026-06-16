DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;
REVOKE INSERT ON public.bookings FROM anon, authenticated;
-- Bookings are inserted exclusively by the create-checkout edge function (service_role), which validates pricing server-side.