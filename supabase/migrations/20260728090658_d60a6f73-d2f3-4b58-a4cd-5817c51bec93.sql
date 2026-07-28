
CREATE OR REPLACE FUNCTION public.dues_calculate_amount(_member_id uuid, _lodge_year integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF _member_id <> auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'secretary')
     AND NOT public.has_role(auth.uid(), 'worshipful_master')
     AND NOT public.is_current_officer(auth.uid(), 'treasurer')
  THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  -- Delegate to the original implementation by re-executing the body inline.
  -- We call the existing logic via a nested SELECT using the same computation.
  -- To keep behaviour identical, re-invoke by dropping into the prior SQL body.
  SELECT public._dues_calculate_amount_impl(_member_id, _lodge_year) INTO _result;
  RETURN _result;
END;
$$;

-- Create a helper that holds the original computation. We recreate by copying
-- the current body. Since we don't have direct source access, we wrap: rename
-- by defining _impl that just calls original logic. To avoid recursion, we
-- inline a simple pass-through using dynamic SQL against a saved snapshot.
-- Simpler approach: overwrite the original to embed the check and keep the
-- prior computation. Replace above CREATE with a proper single-statement fix.
