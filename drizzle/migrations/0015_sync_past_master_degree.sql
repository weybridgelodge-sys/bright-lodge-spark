-- Extend degree sync: is_past_master=true advances degree to installed_master (rank 4, never downgrades).
CREATE OR REPLACE FUNCTION public.sync_degree_from_dates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE implied public.masonic_degree; implied_rank int; current_rank int;
BEGIN
  -- Past Master one-way sync: true -> installed_master (rank 4, only ever forward).
  -- When is_past_master is false, degree is left untouched.
  IF NEW.is_past_master IS TRUE THEN
    IF COALESCE(public.degree_level(NEW.degree), 0) < public.degree_level('installed_master'::public.masonic_degree) THEN
      NEW.degree := 'installed_master';
    END IF;
  END IF;

  -- Ceremony-date sync (only advances, never downgrades).
  IF NEW.raising_date IS NOT NULL THEN implied := 'master_mason';
  ELSIF NEW.passing_date IS NOT NULL THEN implied := 'fellow_craft';
  ELSIF NEW.initiation_date IS NOT NULL THEN implied := 'entered_apprentice';
  ELSE RETURN NEW; END IF;

  implied_rank := public.degree_level(implied);
  current_rank := COALESCE(public.degree_level(NEW.degree), 0);
  IF implied_rank >= current_rank THEN NEW.degree := implied; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_degree_from_dates ON public.profiles;
CREATE TRIGGER trg_sync_degree_from_dates
BEFORE INSERT OR UPDATE OF initiation_date, passing_date, raising_date, is_past_master
ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_degree_from_dates();

-- One-time backfill: advance all current Past Masters to installed_master.
UPDATE public.profiles
SET degree = 'installed_master'
WHERE is_past_master IS TRUE AND degree IS DISTINCT FROM 'installed_master';