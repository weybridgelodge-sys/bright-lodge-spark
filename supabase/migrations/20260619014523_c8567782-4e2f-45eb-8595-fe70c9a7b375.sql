CREATE OR REPLACE FUNCTION public.current_lodge_year()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXTRACT(MONTH FROM now())::int >= 10 THEN EXTRACT(YEAR FROM now())::int
    ELSE EXTRACT(YEAR FROM now())::int - 1
  END
$$;