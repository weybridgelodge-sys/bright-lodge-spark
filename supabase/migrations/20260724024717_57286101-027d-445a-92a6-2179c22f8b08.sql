
-- Tighten bookings SELECT: drop the contact_email fallback so only the linked user can read their bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Restrict anon column access on festive_board_meetings: revoke sensitive internal columns
REVOKE SELECT ON public.festive_board_meetings FROM anon;
GRANT SELECT (id, meeting_date, meeting_type, status, is_white_table, dining_price_pence, event_key, created_at, updated_at)
  ON public.festive_board_meetings TO anon;
