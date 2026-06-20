REVOKE SELECT ON public.visitor_contacts FROM authenticated;
GRANT SELECT (id, email, name, lodge_name, lodge_number, opted_out_at, first_seen_at, last_seen_at, created_at, updated_at)
  ON public.visitor_contacts TO authenticated;