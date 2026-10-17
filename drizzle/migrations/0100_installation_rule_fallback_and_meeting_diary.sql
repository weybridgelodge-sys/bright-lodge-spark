-- KPI dashboard / Members — installation rule drives the officer-year fallback;
-- meeting diary (add / move / cancel / repeating series) on festive_board_meetings.

-- 1. Unit profile fields (Craft Year Book model) on the unit's settings row.
ALTER TABLE public.installation_rule_settings
  ADD COLUMN IF NOT EXISTS unit_number text,
  ADD COLUMN IF NOT EXISTS default_venue text,
  ADD COLUMN IF NOT EXISTS election_month integer CHECK (election_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS ritual text,
  ADD COLUMN IF NOT EXISTS consecration_date date;

-- 2. Rule date in SQL (mirrors ruleDateFor in _shared/masonicYear.ts).
CREATE OR REPLACE FUNCTION public.installation_rule_date(_year integer, _unit text DEFAULT public.current_unit_id())
RETURNS date LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.installation_rule_settings; d date; last_d date;
BEGIN
  SELECT * INTO r FROM public.installation_rule_settings WHERE unit_id = _unit ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND OR r.installation_month IS NULL THEN RETURN NULL; END IF;
  IF r.applies_from_year IS NOT NULL AND _year < r.applies_from_year THEN RETURN NULL; END IF;
  last_d := (make_date(_year, r.installation_month, 1) + interval '1 month' - interval '1 day')::date;
  IF r.mode = 'fixed_date' THEN
    IF r.fixed_day IS NULL THEN RETURN NULL; END IF;
    RETURN make_date(_year, r.installation_month, LEAST(r.fixed_day, EXTRACT(DAY FROM last_d)::int));
  END IF;
  IF r.installation_weekday IS NULL OR r.installation_ordinal IS NULL THEN RETURN NULL; END IF;
  IF r.installation_ordinal = 'last' THEN
    RETURN last_d - ((EXTRACT(DOW FROM last_d)::int - r.installation_weekday + 7) % 7);
  END IF;
  d := make_date(_year, r.installation_month, 1);
  RETURN d + ((r.installation_weekday - EXTRACT(DOW FROM d)::int + 7) % 7) + 7 * (r.installation_ordinal::int - 1);
END $$;

-- 3. Officer year start: stored date, else the unit's rule (no literal rule).
CREATE OR REPLACE FUNCTION public.officer_year_start(_year integer)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT installation_date FROM public.officer_installation_dates WHERE lodge_year = _year),
    public.installation_rule_date(_year)
  )
$$;

-- 4. Stored overrides carry unit_id; current Secretary office may manage them.
ALTER TABLE public.officer_installation_dates ADD COLUMN IF NOT EXISTS unit_id text NOT NULL DEFAULT public.current_unit_id();
DROP POLICY IF EXISTS "Admin or Secretary manage installation dates" ON public.officer_installation_dates;
CREATE POLICY "Admin or Secretary manage installation dates" ON public.officer_installation_dates
  FOR ALL TO authenticated
  USING (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(), 'admin') OR public.is_lodge_secretary(auth.uid())))
  WITH CHECK (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(), 'admin') OR public.is_lodge_secretary(auth.uid())));

-- 5. Repeating meeting series.
CREATE TABLE public.meeting_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL DEFAULT public.current_unit_id(),
  name text NOT NULL,
  meeting_type public.festive_meeting_type NOT NULL DEFAULT 'regular',
  ordinal text NOT NULL CHECK (ordinal IN ('1','2','3','4','last')),
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  months integer[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.meeting_series TO authenticated;
GRANT ALL ON public.meeting_series TO service_role;
ALTER TABLE public.meeting_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read unit series" ON public.meeting_series FOR SELECT TO authenticated
  USING (unit_id = public.current_unit_id() AND public.is_active_member(auth.uid()));
CREATE POLICY "Admin or Secretary insert series" ON public.meeting_series FOR INSERT TO authenticated
  WITH CHECK (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(), 'admin') OR public.is_lodge_secretary(auth.uid())));
CREATE POLICY "Admin or Secretary update series" ON public.meeting_series FOR UPDATE TO authenticated
  USING (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(), 'admin') OR public.is_lodge_secretary(auth.uid())))
  WITH CHECK (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(), 'admin') OR public.is_lodge_secretary(auth.uid())));

-- 6. Meeting register: unit, cancellation (never hard delete from the diary), series link.
ALTER TABLE public.festive_board_meetings
  ADD COLUMN IF NOT EXISTS unit_id text NOT NULL DEFAULT public.current_unit_id(),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.meeting_series(id) ON DELETE SET NULL;

-- 7. Audit log.
CREATE TABLE public.meeting_diary_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL DEFAULT public.current_unit_id(),
  actor uuid,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meeting_diary_audit TO authenticated;
GRANT ALL ON public.meeting_diary_audit TO service_role;
ALTER TABLE public.meeting_diary_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin or Secretary read diary audit" ON public.meeting_diary_audit FOR SELECT TO authenticated
  USING (unit_id = public.current_unit_id() AND (public.has_role(auth.uid(), 'admin') OR public.is_lodge_secretary(auth.uid())));

CREATE OR REPLACE FUNCTION public.log_meeting_diary_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    INSERT INTO public.meeting_diary_audit(actor, action, target_table, target_id, before, after)
    VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME,
      COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id'), (to_jsonb(NEW)->>'lodge_year'), (to_jsonb(OLD)->>'lodge_year')),
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_audit_installation_rule AFTER INSERT OR UPDATE OR DELETE ON public.installation_rule_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_meeting_diary_change();
CREATE TRIGGER trg_audit_installation_dates AFTER INSERT OR UPDATE OR DELETE ON public.officer_installation_dates
  FOR EACH ROW EXECUTE FUNCTION public.log_meeting_diary_change();
CREATE TRIGGER trg_audit_meeting_series AFTER INSERT OR UPDATE OR DELETE ON public.meeting_series
  FOR EACH ROW EXECUTE FUNCTION public.log_meeting_diary_change();
CREATE TRIGGER trg_audit_meetings AFTER INSERT OR UPDATE OR DELETE ON public.festive_board_meetings
  FOR EACH ROW EXECUTE FUNCTION public.log_meeting_diary_change();

-- 8. Diary RPCs (Admin / current Secretary only).
CREATE OR REPLACE FUNCTION public.can_manage_diary(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (public.has_role(_uid, 'admin') OR public.is_lodge_secretary(_uid))
$$;

CREATE OR REPLACE FUNCTION public.meeting_dependencies(_meeting_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.festive_board_meetings;
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO m FROM public.festive_board_meetings WHERE id = _meeting_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  RETURN jsonb_build_object(
    'attendance', (SELECT count(*) FROM public.festive_board_attendance WHERE meeting_id = m.id),
    'bookings', (SELECT count(*) FROM public.bookings b WHERE b.meeting_id = m.id OR (m.event_key IS NOT NULL AND b.event_key = m.event_key)),
    'summonses', (SELECT count(*) FROM public.summonses s WHERE s.meeting_date = m.meeting_date),
    'dining_invoices', (SELECT count(*) FROM public.treasurer_dining_invoices d WHERE d.meeting_id = m.id),
    'booking_page', (SELECT count(*) FROM public.lodge_events e WHERE m.event_key IS NOT NULL AND e.slug = m.event_key)
  );
END $$;

CREATE OR REPLACE FUNCTION public.diary_add_meeting(_date date, _type public.festive_meeting_type, _series_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.festive_board_meetings WHERE meeting_date = _date AND cancelled_at IS NULL AND unit_id = public.current_unit_id()) THEN
    RAISE EXCEPTION 'A meeting already exists on %', _date;
  END IF;
  INSERT INTO public.festive_board_meetings(meeting_date, meeting_type, notes, status, event_key, series_id, created_by)
  VALUES (_date, _type, _notes, 'draft', 'festive-board-' || _date::text, _series_id, auth.uid())
  RETURNING id INTO new_id;
  IF _type = 'installation' THEN
    INSERT INTO public.officer_installation_dates(lodge_year, installation_date)
    VALUES (EXTRACT(YEAR FROM _date)::int, _date)
    ON CONFLICT (lodge_year) DO UPDATE SET installation_date = EXCLUDED.installation_date, updated_at = now();
  END IF;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.diary_move_meeting(_meeting_id uuid, _new_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.festive_board_meetings; shift integer;
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO m FROM public.festive_board_meetings WHERE id = _meeting_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  IF m.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Restore the meeting before moving it'; END IF;
  IF EXISTS (SELECT 1 FROM public.festive_board_meetings WHERE meeting_date = _new_date AND cancelled_at IS NULL AND id <> m.id AND unit_id = m.unit_id) THEN
    RAISE EXCEPTION 'A meeting already exists on %', _new_date;
  END IF;
  shift := _new_date - m.meeting_date;
  UPDATE public.festive_board_meetings SET meeting_date = _new_date, updated_at = now() WHERE id = m.id;
  IF m.event_key IS NOT NULL THEN
    UPDATE public.lodge_events SET event_date = event_date + make_interval(days => shift), updated_at = now() WHERE slug = m.event_key;
  END IF;
  IF m.meeting_type = 'installation' THEN
    INSERT INTO public.officer_installation_dates(lodge_year, installation_date)
    VALUES (EXTRACT(YEAR FROM _new_date)::int, _new_date)
    ON CONFLICT (lodge_year) DO UPDATE SET installation_date = EXCLUDED.installation_date, updated_at = now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.diary_cancel_meeting(_meeting_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.festive_board_meetings
    SET cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = NULLIF(btrim(_reason), ''),
        status = CASE WHEN status = 'published' THEN 'draft'::public.meeting_status ELSE status END, updated_at = now()
    WHERE id = _meeting_id AND cancelled_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found or already cancelled'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.diary_restore_meeting(_meeting_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date;
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT meeting_date INTO d FROM public.festive_board_meetings WHERE id = _meeting_id;
  IF EXISTS (SELECT 1 FROM public.festive_board_meetings WHERE meeting_date = d AND cancelled_at IS NULL AND id <> _meeting_id) THEN
    RAISE EXCEPTION 'Another meeting is already on %', d;
  END IF;
  UPDATE public.festive_board_meetings SET cancelled_at = NULL, cancelled_by = NULL, cancel_reason = NULL, updated_at = now()
    WHERE id = _meeting_id AND cancelled_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found or not cancelled'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.meeting_dependencies(uuid), public.diary_add_meeting(date, public.festive_meeting_type, uuid, text),
  public.diary_move_meeting(uuid, date), public.diary_cancel_meeting(uuid, text), public.diary_restore_meeting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meeting_dependencies(uuid), public.diary_add_meeting(date, public.festive_meeting_type, uuid, text),
  public.diary_move_meeting(uuid, date), public.diary_cancel_meeting(uuid, text), public.diary_restore_meeting(uuid), public.can_manage_diary(uuid) TO authenticated;

-- 9. Cancelled meetings never appear on public surfaces.
CREATE OR REPLACE FUNCTION public.get_next_public_meeting()
 RETURNS TABLE(meeting_date date, ceremony text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT m.meeting_date,
    (SELECT CASE WHEN c ~* '(initiation|passing|raising|installation|ceremony|festive|ladies|white table|emergency)' THEN c ELSE NULL END
       FROM (SELECT btrim(regexp_replace(coalesce(m.notes, ''), '^[^-–—]*[-–—]\s*', '')) AS c) s) AS ceremony
  FROM public.festive_board_meetings m
  WHERE m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
    AND m.status <> 'completed' AND m.cancelled_at IS NULL
    AND NOT public.is_event_key_archived(m.event_key)
  ORDER BY m.meeting_date ASC LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_upcoming_public_meetings()
 RETURNS TABLE(meeting_date date, ceremony text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT m.meeting_date,
    (SELECT CASE WHEN c ~* '(initiation|passing|raising|installation|ceremony|festive|ladies|white table|emergency)' THEN c ELSE NULL END
       FROM (SELECT btrim(regexp_replace(coalesce(m.notes, ''), '^[^-–—]*[-–—]\s*', '')) AS c) s) AS ceremony
  FROM public.festive_board_meetings m
  WHERE m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
    AND m.status <> 'completed' AND m.cancelled_at IS NULL
    AND NOT public.is_event_key_archived(m.event_key)
  ORDER BY m.meeting_date ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_published_meeting_for_event(_event_key text)
 RETURNS TABLE(id uuid, event_key text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT m.id, m.event_key FROM public.festive_board_meetings m
  WHERE m.event_key = _event_key AND m.status = 'published'::public.meeting_status AND m.cancelled_at IS NULL
    AND NOT public.is_event_key_archived(m.event_key)
  LIMIT 1;
$function$;