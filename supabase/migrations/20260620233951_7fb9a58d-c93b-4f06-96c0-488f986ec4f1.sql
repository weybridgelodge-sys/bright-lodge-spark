-- 1) visitor_contacts: remove email from member-readable columns
REVOKE SELECT ON public.visitor_contacts FROM authenticated;
GRANT SELECT (id, name, lodge_name, lodge_number, opted_out_at, first_seen_at, last_seen_at, created_at, updated_at)
  ON public.visitor_contacts TO authenticated;

-- 2) charity_festival_settings: restrict reads to charity viewers, not anon
DROP POLICY IF EXISTS "public read festival settings" ON public.charity_festival_settings;
REVOKE SELECT ON public.charity_festival_settings FROM anon;

CREATE POLICY "charity viewers read festival settings"
  ON public.charity_festival_settings
  FOR SELECT
  TO authenticated
  USING (public.can_view_charity(auth.uid()));
