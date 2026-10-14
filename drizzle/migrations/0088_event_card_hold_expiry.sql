CREATE OR REPLACE FUNCTION public.event_booking_holds_seat(_status text, _method text, _created timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _status = 'paid' OR (_status = 'pending' AND (_method = 'bank_transfer' OR _created > now() - interval '30 minutes'))
$$;
ALTER FUNCTION public.event_booking_holds_seat(text,text,timestamptz) STABLE;

CREATE OR REPLACE VIEW public.public_events AS
SELECT id, slug, COALESCE(public_title, name) AS public_title, name, tagline, intro_copy, theme, event_date, start_time, end_time, venue,
  booking_deadline, capacity, adult_price_pence, child_price_pence, hosting_lodges, highlights, dress_code,
  (SELECT COALESCE(sum(b.adult_count + b.child_count), 0)::integer FROM public.event_bookings b
    WHERE b.event_id = e.id AND b.source = 'public'
      AND public.event_booking_holds_seat(b.payment_status, b.payment_method, b.created_at)) AS seats_taken,
  useful_stuff, menu_items, dietary_choices
FROM public.event_accounts e
WHERE is_public = true AND slug IS NOT NULL AND archived_at IS NULL;
GRANT SELECT ON public.public_events TO anon, authenticated;

UPDATE public.event_accounts SET events_notify_email = 'secretary@weybridgelodge.org.uk, webmaster@weybridgelodge.org.uk'
WHERE id = '5ab49da3-445b-465b-9936-0e69aa96f4bf';