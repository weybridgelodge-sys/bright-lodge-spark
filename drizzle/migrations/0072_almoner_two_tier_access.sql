CREATE OR REPLACE FUNCTION public.can_edit_almoner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'almoner'::public.app_role)
    OR public.is_current_officer(_user_id, 'almoner')
    OR public.is_lodge_secretary(_user_id))
$$;

CREATE OR REPLACE FUNCTION public.can_view_almoner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND (
    public.can_edit_almoner(_user_id)
    OR public.is_current_officer(_user_id, 'worshipful_master'))
$$;

CREATE OR REPLACE FUNCTION public.can_access_almoner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_view_almoner(_user_id)
$$;
COMMENT ON FUNCTION public.can_access_almoner(uuid) IS 'DEPRECATED: alias of can_view_almoner; use can_view_almoner / can_edit_almoner';

DO $$
DECLARE r record; v text; e text;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies
           WHERE (coalesce(qual,'')||coalesce(with_check,'')) LIKE '%can_access_almoner%'
             AND ((schemaname='public' AND tablename IN ('welfare_absences','welfare_life_events','welfare_correspondence','welfare_rmtgb_referrals','welfare_member_status','welfare_log_entries','almoner_reports'))
               OR (schemaname='storage' AND tablename='objects'))
  LOOP
    IF r.cmd = 'SELECT' THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.policyname, r.schemaname, r.tablename, replace(r.qual,'can_access_almoner','public.can_view_almoner'));
    ELSE
      IF r.qual IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.policyname, r.schemaname, r.tablename, replace(r.qual,'can_access_almoner','public.can_edit_almoner'));
      END IF;
      IF r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, replace(r.with_check,'can_access_almoner','public.can_edit_almoner'));
      END IF;
    END IF;
  END LOOP;
END $$;