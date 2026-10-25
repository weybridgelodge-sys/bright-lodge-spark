-- Stage 3: a new sign-in must carry a trusted lodge (pending_account_units, or
-- server-set app_metadata.unit_id). Otherwise account creation is refused.
-- Only runs on INSERT, so existing users re-signing in are never affected.
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
  IF _unit IS NULL THEN
    _unit := NULLIF(btrim(NEW.raw_app_meta_data->>'unit_id'), '');
  END IF;
  IF _unit IS NULL THEN
    RAISE EXCEPTION 'no_membership_for_account' USING ERRCODE = 'P0001',
      HINT = 'Accounts are created by the lodge Secretary; use Request portal access.';
  END IF;
  -- Grand Lodge Ref. No. is never taken from sign-in metadata; only admin/Secretary set it.
  INSERT INTO public.profiles (id, email, full_name, mother_lodge, status, unit_id)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'mother_lodge', ''), 'pending', _unit);
  DELETE FROM public.pending_account_units WHERE email = lower(btrim(NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;