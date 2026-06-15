
CREATE OR REPLACE FUNCTION public.degree_level(_d public.masonic_degree)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _d
    WHEN 'entered_apprentice' THEN 1
    WHEN 'fellow_craft' THEN 2
    WHEN 'master_mason' THEN 3
  END
$$;

REVOKE EXECUTE ON FUNCTION public.degree_level(public.masonic_degree) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_degree_level(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_degree_self_edit() FROM anon, authenticated;
