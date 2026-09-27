CREATE OR REPLACE FUNCTION public.approve_unlock_treasurer_period(_period_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_is_treasurer boolean := public.is_current_officer(auth.uid(),'treasurer');
  v_is_secretary boolean := public.is_current_officer(auth.uid(),'secretary');
  v_both boolean;
BEGIN
  IF NOT (v_is_treasurer OR v_is_secretary) THEN
    RAISE EXCEPTION 'only the current Treasurer or Secretary can approve unlock';
  END IF;
  UPDATE public.treasurer_periods
  SET unlock_approved_by_treasurer = CASE WHEN v_is_treasurer THEN true ELSE unlock_approved_by_treasurer END,
      unlock_approved_by_secretary = CASE WHEN v_is_secretary THEN true ELSE unlock_approved_by_secretary END,
      updated_at = now()
  WHERE id = _period_id AND status = 'locked';
  SELECT (unlock_approved_by_treasurer AND unlock_approved_by_secretary) INTO v_both
  FROM public.treasurer_periods WHERE id = _period_id;
  IF v_both THEN
    UPDATE public.treasurer_periods
    SET status = 'open', locked_at = NULL, locked_by = NULL,
        unlock_requested_by = NULL, unlock_requested_at = NULL, unlock_reason = NULL,
        unlock_approved_by_treasurer = false, unlock_approved_by_secretary = false,
        updated_at = now()
    WHERE id = _period_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_unlock_treasurer_period(_period_id uuid, _reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role)
          OR public.is_current_officer(auth.uid(),'treasurer')
          OR public.is_current_officer(auth.uid(),'secretary')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  UPDATE public.treasurer_periods
  SET unlock_requested_by = auth.uid(), unlock_requested_at = now(), unlock_reason = _reason,
      unlock_approved_by_treasurer = false, unlock_approved_by_secretary = false,
      updated_at = now()
  WHERE id = _period_id AND status = 'locked';
END;
$function$;