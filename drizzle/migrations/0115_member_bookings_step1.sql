ALTER TABLE public.event_accounts ADD COLUMN IF NOT EXISTS unit_id text DEFAULT public.current_unit_id();
UPDATE public.event_accounts SET unit_id = public.current_unit_id() WHERE unit_id IS NULL;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS event_bookings_member_id_idx ON public.event_bookings(member_id);

-- Raw bookable items for the signed-in member's units; status/deadline rules live in src/lib/memberBookings.ts.
CREATE OR REPLACE FUNCTION public.get_my_bookable_items()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _units text[];
  _today date := (now() AT TIME ZONE 'Europe/London')::date;
  _out jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL OR NOT public.is_active_member(_uid) THEN RETURN _out; END IF;
  IF coalesce((SELECT value FROM module_settings WHERE key = 'member_bookings')::text, 'false') <> 'true' THEN RETURN _out; END IF;
  SELECT lower(trim(email)), ARRAY[unit_id] INTO _email, _units FROM profiles WHERE id = _uid;
  IF _units IS NULL OR _units = ARRAY[NULL::text] THEN RETURN _out; END IF;

  SELECT _out || coalesce(jsonb_agg(x), '[]'::jsonb) INTO _out FROM (
    SELECT jsonb_build_object(
      'kind', 'meeting', 'id', m.id, 'title', coalesce(nullif(le.title, ''), initcap(m.meeting_type::text) || ' meeting'),
      'meeting_type', m.meeting_type, 'event_date', m.meeting_date, 'price_pence', m.dining_price_pence,
      'booking_deadline', le.booking_deadline, 'book_path', '/bookings',
      'bookings', coalesce((
        SELECT jsonb_agg(jsonb_build_object('status', b.payment_status, 'method', b.details->>'paymentMethod', 'created_at', b.created_at))
        FROM bookings b
        WHERE (b.meeting_id = m.id OR b.event_key = m.event_key)
          AND (b.user_id = _uid OR lower(trim(b.contact_email)) = _email
               OR b.id::text IN (SELECT split_part(a.source_booking_id, '::', 1) FROM festive_board_attendance a
                                 WHERE a.meeting_id = m.id AND a.member_id = _uid AND a.source_booking_id IS NOT NULL))
      ), '[]'::jsonb)) AS x
    FROM festive_board_meetings m
    JOIN lodge_events le ON le.slug = m.event_key AND le.published AND le.archived_at IS NULL
    WHERE m.unit_id = ANY(_units) AND m.meeting_type IN ('regular', 'installation')
      AND m.cancelled_at IS NULL AND m.meeting_date >= _today
    ORDER BY m.meeting_date LIMIT 1
  ) s;

  SELECT _out || coalesce(jsonb_agg(x ORDER BY d), '[]'::jsonb) INTO _out FROM (
    SELECT e.event_date AS d, jsonb_build_object(
      'kind', 'event', 'id', e.id, 'title', coalesce(nullif(e.public_title, ''), e.name),
      'event_date', e.event_date, 'price_pence', e.adult_price_pence, 'child_price_pence', e.child_price_pence,
      'booking_deadline', e.booking_deadline, 'book_path', '/events/' || e.slug,
      'bookings', coalesce((
        SELECT jsonb_agg(jsonb_build_object('status', b.payment_status, 'method', b.payment_method, 'created_at', b.created_at))
        FROM event_bookings b
        WHERE b.event_id = e.id AND (b.member_id = _uid OR (b.member_id IS NULL AND lower(trim(b.contact_email)) = _email))
      ), '[]'::jsonb)) AS x
    FROM event_accounts e
    WHERE e.unit_id = ANY(_units) AND e.is_public AND e.slug IS NOT NULL AND e.archived_at IS NULL
      AND e.adult_price_pence IS NOT NULL AND e.event_date >= _today
  ) s;
  RETURN _out;
END $$;
REVOKE ALL ON FUNCTION public.get_my_bookable_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_bookable_items() TO authenticated;