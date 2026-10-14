CREATE OR REPLACE FUNCTION public.can_manage_public_events(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (public.has_role(_uid, 'admin'::public.app_role) OR public.is_lodge_secretary(_uid))
$$;

CREATE OR REPLACE FUNCTION public.guard_event_account_private_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_current_officer(auth.uid(), 'treasurer') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.promote_publicly IS DISTINCT FROM OLD.promote_publicly
      OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN
    RAISE EXCEPTION 'Only the Treasurer or an admin can change event account settings.';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_event_account_private_fields ON public.event_accounts;
CREATE TRIGGER trg_guard_event_account_private_fields BEFORE INSERT OR UPDATE ON public.event_accounts FOR EACH ROW EXECUTE FUNCTION public.guard_event_account_private_fields();