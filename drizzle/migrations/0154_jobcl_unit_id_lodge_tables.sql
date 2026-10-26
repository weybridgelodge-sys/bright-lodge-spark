-- JOB CL: unit_id on lodge-owned tables (nullable, no default), backfilled from the single unit.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.units;
  IF n <> 1 THEN
    RAISE EXCEPTION 'JOB CL backfill needs exactly one row in public.units (found %); nothing applied', n;
  END IF;
END $$;

ALTER TABLE public.secretary_returns ADD COLUMN IF NOT EXISTS unit_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secretary_returns_unit_id_fkey') THEN
    ALTER TABLE public.secretary_returns ADD CONSTRAINT secretary_returns_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
END $$;
UPDATE public.secretary_returns SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
CREATE INDEX IF NOT EXISTS secretary_returns_unit_id_idx ON public.secretary_returns (unit_id);

ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS unit_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidates_unit_id_fkey') THEN
    ALTER TABLE public.candidates ADD CONSTRAINT candidates_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
END $$;
UPDATE public.candidates SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
CREATE INDEX IF NOT EXISTS candidates_unit_id_idx ON public.candidates (unit_id);

ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS unit_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polls_unit_id_fkey') THEN
    ALTER TABLE public.polls ADD CONSTRAINT polls_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
END $$;
UPDATE public.polls SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
CREATE INDEX IF NOT EXISTS polls_unit_id_idx ON public.polls (unit_id);

ALTER TABLE public.lodge_events ADD COLUMN IF NOT EXISTS unit_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lodge_events_unit_id_fkey') THEN
    ALTER TABLE public.lodge_events ADD CONSTRAINT lodge_events_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
END $$;
UPDATE public.lodge_events SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
CREATE INDEX IF NOT EXISTS lodge_events_unit_id_idx ON public.lodge_events (unit_id);

ALTER TABLE public.lodge_socials ADD COLUMN IF NOT EXISTS unit_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lodge_socials_unit_id_fkey') THEN
    ALTER TABLE public.lodge_socials ADD CONSTRAINT lodge_socials_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
END $$;
UPDATE public.lodge_socials SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
CREATE INDEX IF NOT EXISTS lodge_socials_unit_id_idx ON public.lodge_socials (unit_id);

ALTER TABLE public.summonses ADD COLUMN IF NOT EXISTS unit_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'summonses_unit_id_fkey') THEN
    ALTER TABLE public.summonses ADD CONSTRAINT summonses_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
END $$;
UPDATE public.summonses SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
CREATE INDEX IF NOT EXISTS summonses_unit_id_idx ON public.summonses (unit_id);

ALTER TABLE public.loi_schedule_entries ADD COLUMN IF NOT EXISTS unit_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loi_schedule_entries_unit_id_fkey') THEN
    ALTER TABLE public.loi_schedule_entries ADD CONSTRAINT loi_schedule_entries_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
END $$;
UPDATE public.loi_schedule_entries SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
CREATE INDEX IF NOT EXISTS loi_schedule_entries_unit_id_idx ON public.loi_schedule_entries (unit_id);

-- Browser/RPC inserts with no unit take the signed-in caller's own profile unit; none = refuse. Never a default.
CREATE OR REPLACE FUNCTION public.fill_unit_from_caller()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF coalesce(btrim(NEW.unit_id), '') = '' THEN
    NEW.unit_id := (SELECT nullif(btrim(p.unit_id), '') FROM public.profiles p WHERE p.id = auth.uid());
  END IF;
  IF NEW.unit_id IS NULL THEN
    RAISE EXCEPTION 'No lodge is set on your member record, so this cannot be saved. Ask your Secretary to set your lodge.'
      USING ERRCODE = 'P0001', HINT = 'no_unit_for_write';
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.fill_unit_from_caller() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS secretary_returns_fill_unit ON public.secretary_returns;
CREATE TRIGGER secretary_returns_fill_unit BEFORE INSERT ON public.secretary_returns FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
DROP TRIGGER IF EXISTS candidates_fill_unit ON public.candidates;
CREATE TRIGGER candidates_fill_unit BEFORE INSERT ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
DROP TRIGGER IF EXISTS polls_fill_unit ON public.polls;
CREATE TRIGGER polls_fill_unit BEFORE INSERT ON public.polls FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
DROP TRIGGER IF EXISTS lodge_events_fill_unit ON public.lodge_events;
CREATE TRIGGER lodge_events_fill_unit BEFORE INSERT ON public.lodge_events FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
DROP TRIGGER IF EXISTS lodge_socials_fill_unit ON public.lodge_socials;
CREATE TRIGGER lodge_socials_fill_unit BEFORE INSERT ON public.lodge_socials FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
DROP TRIGGER IF EXISTS summonses_fill_unit ON public.summonses;
CREATE TRIGGER summonses_fill_unit BEFORE INSERT ON public.summonses FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
DROP TRIGGER IF EXISTS loi_schedule_entries_fill_unit ON public.loi_schedule_entries;
CREATE TRIGGER loi_schedule_entries_fill_unit BEFORE INSERT ON public.loi_schedule_entries FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();

-- Expose the event's own unit on the public view (appended last; existing columns unchanged).
CREATE OR REPLACE VIEW public.public_events AS
 SELECT id,
    slug,
    COALESCE(public_title, name) AS public_title,
    name,
    tagline,
    intro_copy,
    theme,
    event_date,
    start_time,
    end_time,
    venue,
    booking_deadline,
    capacity,
    adult_price_pence,
    child_price_pence,
    hosting_lodges,
    highlights,
    dress_code,
    ( SELECT (COALESCE(sum((b.adult_count + b.child_count)), (0)::bigint))::integer AS "coalesce"
           FROM event_bookings b
          WHERE ((b.event_id = e.id) AND (b.source = 'public'::text) AND event_booking_holds_seat(b.payment_status, b.payment_method, b.created_at))) AS seats_taken,
    useful_stuff,
    menu_items,
    dietary_choices,
    event_type,
    modules,
    payment_mode,
    deposit_percent,
    balance_due_date,
    fee_cover_enabled,
    seo_title,
    seo_description,
    og_image_url,
    unit_id
   FROM event_accounts e
  WHERE ((is_public = true) AND (slug IS NOT NULL) AND (archived_at IS NULL));
