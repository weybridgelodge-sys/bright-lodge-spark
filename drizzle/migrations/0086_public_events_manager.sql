ALTER TABLE public.event_accounts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS useful_stuff jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS menu_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dietary_choices jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.event_guests ADD COLUMN IF NOT EXISTS dietary_choice text;

CREATE OR REPLACE FUNCTION public.can_manage_public_events(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR public.has_role(_uid, 'secretary') OR public.is_current_officer(_uid, 'secretary')
$$;

CREATE POLICY event_accounts_select_public_mgr ON public.event_accounts FOR SELECT TO authenticated USING (public.can_manage_public_events(auth.uid()));
CREATE POLICY event_accounts_insert_public_mgr ON public.event_accounts FOR INSERT TO authenticated WITH CHECK (public.can_manage_public_events(auth.uid()));
CREATE POLICY event_accounts_update_public_mgr ON public.event_accounts FOR UPDATE TO authenticated USING (public.can_manage_public_events(auth.uid())) WITH CHECK (public.can_manage_public_events(auth.uid()));
CREATE POLICY event_accounts_delete_public_mgr ON public.event_accounts FOR DELETE TO authenticated USING (public.can_manage_public_events(auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_event_account_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.event_bookings WHERE event_id = OLD.id) THEN
    RAISE EXCEPTION 'This event has bookings and cannot be deleted. Archive it instead.';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_guard_event_account_delete ON public.event_accounts;
CREATE TRIGGER trg_guard_event_account_delete BEFORE DELETE ON public.event_accounts FOR EACH ROW EXECUTE FUNCTION public.guard_event_account_delete();

CREATE OR REPLACE FUNCTION public.guard_event_account_publish()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_public AND (NEW.adult_price_pence IS NULL OR NEW.child_price_pence IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL OR NEW.slug IS NULL OR NEW.archived_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Set both prices, start and end times and a slug before publishing (archived events cannot be published).';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_event_account_publish ON public.event_accounts;
CREATE TRIGGER trg_guard_event_account_publish BEFORE INSERT OR UPDATE ON public.event_accounts FOR EACH ROW EXECUTE FUNCTION public.guard_event_account_publish();

CREATE OR REPLACE VIEW public.public_events
WITH (security_invoker = false) AS
SELECT id, slug, COALESCE(public_title, name) AS public_title, name, tagline, intro_copy, theme,
       event_date, start_time, end_time, venue, booking_deadline, capacity,
       adult_price_pence, child_price_pence, hosting_lodges, highlights, dress_code,
       (SELECT COALESCE(sum(b.adult_count + b.child_count),0)::int FROM public.event_bookings b
          WHERE b.event_id = e.id AND b.source = 'public' AND b.payment_status <> 'cancelled') AS seats_taken,
       useful_stuff, menu_items, dietary_choices
FROM public.event_accounts e
WHERE is_public = true AND slug IS NOT NULL AND archived_at IS NULL;
GRANT SELECT ON public.public_events TO anon, authenticated;