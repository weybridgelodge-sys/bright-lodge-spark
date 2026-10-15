REVOKE ALL ON public.event_booking_balance_tokens FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.event_booking_payments FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.event_booking_payments FROM authenticated;
REVOKE ALL ON public.event_booking_reminders FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.event_booking_reminders FROM authenticated;
GRANT SELECT ON public.event_booking_payments TO authenticated;
GRANT SELECT ON public.event_booking_reminders TO authenticated;
GRANT ALL ON public.event_booking_balance_tokens, public.event_booking_payments, public.event_booking_reminders TO service_role;