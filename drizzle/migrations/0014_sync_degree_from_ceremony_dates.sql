CREATE OR REPLACE FUNCTION public.sync_degree_from_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  implied public.masonic_degree;
  implied_rank int;
  current_rank int;
BEGIN
  IF NEW.raising_date IS NOT NULL THEN
    implied := 'master_mason';
  ELSIF NEW.passing_date IS NOT NULL THEN
    implied := 'fellow_craft';
  ELSIF NEW.initiation_date IS NOT NULL THEN
    implied := 'entered_apprentice';
  ELSE
    RETURN NEW;
  END IF;

  implied_rank := public.degree_level(implied);
  current_rank := COALESCE(public.degree_level(NEW.degree), 0);

  IF implied_rank >= current_rank THEN
    NEW.degree := implied;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_degree_from_dates ON public.profiles;

CREATE TRIGGER trg_sync_degree_from_dates
BEFORE INSERT OR UPDATE OF initiation_date, passing_date, raising_date
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_degree_from_dates();