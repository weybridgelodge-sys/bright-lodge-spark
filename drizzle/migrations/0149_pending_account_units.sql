-- Server-only record of which lodge a new account belongs to. Written by
-- admin-invite-member / admin-import-members / reviewer-signin (service role)
-- BEFORE the sign-in is created; read and removed by handle_new_user.
CREATE TABLE public.pending_account_units (
  email text PRIMARY KEY CHECK (email = lower(btrim(email)) AND email <> ''),
  unit_id text NOT NULL CHECK (btrim(unit_id) <> ''),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pending_account_units TO service_role;
ALTER TABLE public.pending_account_units ENABLE ROW LEVEL SECURITY;
-- No policies: no client access at all.

-- Stage 1 (transitional): use the trusted unit when present; otherwise keep the
-- old behaviour (column default) so invites from not-yet-redeployed functions still work.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _unit text;
BEGIN
  SELECT unit_id INTO _unit FROM public.pending_account_units WHERE email = lower(btrim(NEW.email));
  -- Grand Lodge Ref. No. is never taken from sign-in metadata; only admin/Secretary set it.
  IF _unit IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, mother_lodge, status, unit_id)
    VALUES (NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'mother_lodge', ''), 'pending', _unit);
    DELETE FROM public.pending_account_units WHERE email = lower(btrim(NEW.email));
  ELSE
    INSERT INTO public.profiles (id, email, full_name, mother_lodge, status)
    VALUES (NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'mother_lodge', ''), 'pending');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;