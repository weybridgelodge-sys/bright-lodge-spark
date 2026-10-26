-- JOB DB3 (Job DA stage 3): the five diary/status writers take the lodge from the row they act on,
-- not from current_unit_id(). CREATE OR REPLACE keeps owner, SECURITY DEFINER, search_path and grants.
-- Original bodies: supabase/tests/jobdb3_rollback.sql.

CREATE OR REPLACE FUNCTION public.log_member_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_unit text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_unit := nullif(btrim(NEW.unit_id), '');
    IF v_unit IS NULL THEN
      RAISE EXCEPTION 'This member has no lodge set, so the status change cannot be recorded. Set the member''s lodge first.'
        USING ERRCODE = 'P0001', HINT = 'no_unit_for_write';
    END IF;
    INSERT INTO public.member_status_history (profile_id, kind, status, effective_date, recorded_by, unit_id)
    VALUES (NEW.id, 'status', NEW.status::text, COALESCE(NEW.status_changed_at, current_date), auth.uid(), v_unit);
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.log_meeting_diary_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.meeting_diary_audit(actor, action, target_table, target_id, before, after, unit_id)
    VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME,
      COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id'), (to_jsonb(NEW)->>'lodge_year'), (to_jsonb(OLD)->>'lodge_year')),
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      nullif(btrim(COALESCE(to_jsonb(NEW)->>'unit_id', to_jsonb(OLD)->>'unit_id')), ''));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END $function$;

CREATE OR REPLACE FUNCTION public.sync_festive_board_from_lodge_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_meeting_id uuid;
  v_status public.meeting_status;
BEGIN
  v_status := CASE WHEN NEW.published THEN 'published'::public.meeting_status ELSE 'draft'::public.meeting_status END;

  IF NEW.published THEN
    UPDATE public.festive_board_meetings
    SET status = 'draft'::public.meeting_status, updated_at = now()
    WHERE status = 'published'::public.meeting_status
      AND lodge_event_id IS DISTINCT FROM NEW.id AND event_key <> NEW.slug;
  END IF;

  SELECT id INTO v_meeting_id FROM public.festive_board_meetings WHERE lodge_event_id = NEW.id LIMIT 1;
  IF v_meeting_id IS NULL THEN
    SELECT id INTO v_meeting_id FROM public.festive_board_meetings
    WHERE event_key = NEW.slug OR (TG_OP = 'UPDATE' AND event_key = OLD.slug) LIMIT 1;
  END IF;
  IF v_meeting_id IS NULL THEN
    SELECT id INTO v_meeting_id FROM public.festive_board_meetings
    WHERE meeting_date = NEW.event_date::date AND lodge_event_id IS NULL
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_meeting_id IS NULL THEN
    INSERT INTO public.festive_board_meetings (meeting_date, meeting_type, notes, event_key, lodge_event_id, status, is_white_table, dining_price_pence, unit_id)
    VALUES (NEW.event_date::date, 'regular'::public.festive_meeting_type, NEW.title, NEW.slug, NEW.id, v_status, false, 3500, NEW.unit_id)
    RETURNING id INTO v_meeting_id;
  ELSE
    UPDATE public.festive_board_meetings
    SET meeting_date = NEW.event_date::date,
        lodge_event_id = NEW.id,
        event_key = NEW.slug,
        status = CASE WHEN status = 'completed'::public.meeting_status AND NOT NEW.published
                      THEN 'completed'::public.meeting_status ELSE v_status END,
        updated_at = now()
    WHERE id = v_meeting_id;
  END IF;

  UPDATE public.bookings SET meeting_id = v_meeting_id, updated_at = now()
  WHERE meeting_id IS NULL AND event_key = NEW.slug;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.diary_add_meeting(_date date, _type festive_meeting_type, _series_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid := gen_random_uuid(); v_unit text; v_caller text;
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  v_caller := (SELECT nullif(btrim(p.unit_id), '') FROM public.profiles p WHERE p.id = auth.uid());
  IF _series_id IS NOT NULL THEN
    v_unit := (SELECT nullif(btrim(s.unit_id), '') FROM public.meeting_series s WHERE s.id = _series_id);
    IF v_unit IS DISTINCT FROM v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;
  ELSE
    v_unit := v_caller;
  END IF;
  IF v_unit IS NULL THEN
    RAISE EXCEPTION 'No lodge is set on your member record, so this cannot be saved. Ask your Secretary to set your lodge.'
      USING ERRCODE = 'P0001', HINT = 'no_unit_for_write';
  END IF;
  IF EXISTS (SELECT 1 FROM public.festive_board_meetings WHERE meeting_date = _date AND cancelled_at IS NULL AND unit_id = v_unit) THEN
    RAISE EXCEPTION 'A meeting already exists on %', _date;
  END IF;
  INSERT INTO public.festive_board_meetings(id, meeting_date, meeting_type, notes, status, event_key, series_id, created_by, unit_id)
  VALUES (new_id, _date, _type, _notes, 'draft', 'unlinked-' || new_id::text, _series_id, auth.uid(), v_unit);
  IF _type = 'installation' THEN
    INSERT INTO public.officer_installation_dates(lodge_year, installation_date, unit_id)
    VALUES (EXTRACT(YEAR FROM _date)::int, _date, v_unit)
    ON CONFLICT (lodge_year) DO UPDATE SET installation_date = EXCLUDED.installation_date, updated_at = now();
  END IF;
  RETURN new_id;
END $function$;

CREATE OR REPLACE FUNCTION public.diary_move_meeting(_meeting_id uuid, _new_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.officer_installation_dates(lodge_year, installation_date, unit_id)
    VALUES (EXTRACT(YEAR FROM _new_date)::int, _new_date, m.unit_id)
    ON CONFLICT (lodge_year) DO UPDATE SET installation_date = EXCLUDED.installation_date, updated_at = now();
  END IF;
END $function$;