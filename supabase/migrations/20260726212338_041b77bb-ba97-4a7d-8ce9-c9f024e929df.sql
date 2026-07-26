
-- Generic officer check
CREATE OR REPLACE FUNCTION public.is_current_officer(_user_id uuid, _position_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.officer_appointments oa
    WHERE oa.member_id = _user_id
      AND oa.lodge_year = public.current_lodge_year()
      AND oa.position_key = _position_key
  )
$$;

-- treasurer_periods
CREATE TABLE public.treasurer_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  meeting_id uuid REFERENCES public.festive_board_meetings(id) ON DELETE SET NULL,
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked')),
  locked_at timestamptz,
  locked_by uuid REFERENCES public.profiles(id),
  unlock_requested_by uuid REFERENCES public.profiles(id),
  unlock_requested_at timestamptz,
  unlock_reason text,
  unlock_approved_by_treasurer boolean NOT NULL DEFAULT false,
  unlock_approved_by_secretary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasurer_periods TO authenticated;
GRANT ALL ON public.treasurer_periods TO service_role;
ALTER TABLE public.treasurer_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasurer_periods_select"
ON public.treasurer_periods FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
  OR public.is_current_officer(auth.uid(), 'treasurer')
  OR public.is_current_officer(auth.uid(), 'auditor_1')
  OR public.is_current_officer(auth.uid(), 'auditor_2')
  OR public.is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY "treasurer_periods_write"
ON public.treasurer_periods FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_current_officer(auth.uid(), 'treasurer')
);

CREATE POLICY "treasurer_periods_update"
ON public.treasurer_periods FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_current_officer(auth.uid(), 'treasurer')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_current_officer(auth.uid(), 'treasurer')
);

CREATE POLICY "treasurer_periods_delete"
ON public.treasurer_periods FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_current_officer(auth.uid(), 'treasurer')
);

CREATE TRIGGER trg_treasurer_periods_updated
BEFORE UPDATE ON public.treasurer_periods
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- treasurer_transactions
CREATE TABLE public.treasurer_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid REFERENCES public.treasurer_periods(id) ON DELETE SET NULL,
  transaction_date date NOT NULL,
  direction text NOT NULL CHECK (direction IN ('income','expense')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','cheque','bank_transfer','stripe','other')),
  category text NOT NULL,
  amount_pence integer NOT NULL CHECK (amount_pence > 0),
  description text,
  reconciled boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasurer_transactions TO authenticated;
GRANT ALL ON public.treasurer_transactions TO service_role;
ALTER TABLE public.treasurer_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_treasurer_tx_period ON public.treasurer_transactions(period_id);
CREATE INDEX idx_treasurer_tx_date ON public.treasurer_transactions(transaction_date DESC);

CREATE POLICY "treasurer_tx_select"
ON public.treasurer_transactions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
  OR public.is_current_officer(auth.uid(), 'treasurer')
  OR public.is_current_officer(auth.uid(), 'auditor_1')
  OR public.is_current_officer(auth.uid(), 'auditor_2')
  OR public.is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY "treasurer_tx_insert"
ON public.treasurer_transactions FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
   OR public.is_current_officer(auth.uid(), 'treasurer'))
  AND (
    period_id IS NULL
    OR EXISTS (SELECT 1 FROM public.treasurer_periods p WHERE p.id = period_id AND p.status = 'open')
  )
);

CREATE POLICY "treasurer_tx_update"
ON public.treasurer_transactions FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
   OR public.is_current_officer(auth.uid(), 'treasurer'))
  AND (
    period_id IS NULL
    OR EXISTS (SELECT 1 FROM public.treasurer_periods p WHERE p.id = period_id AND p.status = 'open')
  )
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
   OR public.is_current_officer(auth.uid(), 'treasurer'))
  AND (
    period_id IS NULL
    OR EXISTS (SELECT 1 FROM public.treasurer_periods p WHERE p.id = period_id AND p.status = 'open')
  )
);

CREATE POLICY "treasurer_tx_delete"
ON public.treasurer_transactions FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
   OR public.is_current_officer(auth.uid(), 'treasurer'))
  AND (
    period_id IS NULL
    OR EXISTS (SELECT 1 FROM public.treasurer_periods p WHERE p.id = period_id AND p.status = 'open')
  )
);

CREATE TRIGGER trg_treasurer_tx_updated
BEFORE UPDATE ON public.treasurer_transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Governance RPCs
CREATE OR REPLACE FUNCTION public.lock_treasurer_period(_period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role)
          OR public.is_current_officer(auth.uid(),'treasurer')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  UPDATE public.treasurer_periods
  SET status = 'locked',
      locked_at = now(),
      locked_by = auth.uid(),
      unlock_requested_by = NULL,
      unlock_requested_at = NULL,
      unlock_reason = NULL,
      unlock_approved_by_treasurer = false,
      unlock_approved_by_secretary = false,
      updated_at = now()
  WHERE id = _period_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_unlock_treasurer_period(_period_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role)
          OR public.is_current_officer(auth.uid(),'treasurer')
          OR public.has_role(auth.uid(),'secretary'::public.app_role)) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  UPDATE public.treasurer_periods
  SET unlock_requested_by = auth.uid(),
      unlock_requested_at = now(),
      unlock_reason = _reason,
      unlock_approved_by_treasurer = false,
      unlock_approved_by_secretary = false,
      updated_at = now()
  WHERE id = _period_id AND status = 'locked';
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_unlock_treasurer_period(_period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_treasurer boolean := public.is_current_officer(auth.uid(),'treasurer');
  v_is_secretary boolean := public.has_role(auth.uid(),'secretary'::public.app_role);
  v_both boolean;
BEGIN
  -- Deliberately exclude admin here so unlock always needs the actual two officers.
  IF NOT (v_is_treasurer OR v_is_secretary) THEN
    RAISE EXCEPTION 'only the current Treasurer or Secretary can approve unlock';
  END IF;

  UPDATE public.treasurer_periods
  SET unlock_approved_by_treasurer = CASE WHEN v_is_treasurer THEN true ELSE unlock_approved_by_treasurer END,
      unlock_approved_by_secretary = CASE WHEN v_is_secretary THEN true ELSE unlock_approved_by_secretary END,
      updated_at = now()
  WHERE id = _period_id AND status = 'locked';

  SELECT (unlock_approved_by_treasurer AND unlock_approved_by_secretary)
    INTO v_both
  FROM public.treasurer_periods WHERE id = _period_id;

  IF v_both THEN
    UPDATE public.treasurer_periods
    SET status = 'open',
        locked_at = NULL,
        locked_by = NULL,
        unlock_requested_by = NULL,
        unlock_requested_at = NULL,
        unlock_reason = NULL,
        unlock_approved_by_treasurer = false,
        unlock_approved_by_secretary = false,
        updated_at = now()
    WHERE id = _period_id;
  END IF;
END;
$$;
