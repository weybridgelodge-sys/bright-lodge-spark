ALTER TABLE public.event_budget_lines ADD COLUMN IF NOT EXISTS system_key text;
CREATE UNIQUE INDEX IF NOT EXISTS event_budget_lines_system_key_uq ON public.event_budget_lines(event_id, system_key) WHERE system_key IS NOT NULL;

UPDATE public.event_budget_lines bl SET system_key = 'ticket_sales'
WHERE bl.system_key IS NULL AND bl.line_type = 'income' AND lower(trim(bl.category)) = 'ticket sales'
  AND bl.id = (SELECT x.id FROM public.event_budget_lines x WHERE x.event_id = bl.event_id AND x.line_type='income' AND lower(trim(x.category))='ticket sales' ORDER BY x.created_at LIMIT 1);

CREATE OR REPLACE FUNCTION public.seed_event_system_budget_lines(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan integer := 0;
BEGIN
  SELECT COALESCE(adult_price_pence * capacity, 0) INTO _plan FROM public.event_accounts WHERE id = _event_id;
  INSERT INTO public.event_budget_lines(event_id, category, planned_pence, line_type, system_key)
  SELECT _event_id, v.cat, v.p, v.t, v.k FROM (VALUES
    ('Ticket sales', COALESCE(_plan,0), 'income', 'ticket_sales'),
    ('Fee contributions', 0, 'income', 'fee_contributions'),
    ('Stripe fees', 0, 'expense', 'stripe_fees')) v(cat, p, t, k)
  WHERE NOT EXISTS (SELECT 1 FROM public.event_budget_lines b WHERE b.event_id = _event_id AND b.system_key = v.k);
END $$;

CREATE OR REPLACE FUNCTION public.event_accounts_seed_lines_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.seed_event_system_budget_lines(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS event_accounts_seed_lines ON public.event_accounts;
CREATE TRIGGER event_accounts_seed_lines AFTER INSERT ON public.event_accounts
FOR EACH ROW EXECUTE FUNCTION public.event_accounts_seed_lines_trg();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.event_accounts LOOP PERFORM public.seed_event_system_budget_lines(r.id); END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.guard_event_system_budget_lines()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.system_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.event_accounts e WHERE e.id = OLD.event_id) THEN
      RAISE EXCEPTION 'Fixed budget lines cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.system_key IS NOT NULL AND (NEW.category IS DISTINCT FROM OLD.category OR NEW.line_type IS DISTINCT FROM OLD.line_type
     OR NEW.system_key IS DISTINCT FROM OLD.system_key OR NEW.event_id IS DISTINCT FROM OLD.event_id) THEN
    RAISE EXCEPTION 'Fixed budget lines cannot be renamed or moved';
  END IF;
  IF OLD.system_key IS NULL AND NEW.system_key IS NOT NULL THEN RAISE EXCEPTION 'Cannot mark a line as fixed'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_event_system_budget_lines ON public.event_budget_lines;
CREATE TRIGGER guard_event_system_budget_lines BEFORE UPDATE OR DELETE ON public.event_budget_lines
FOR EACH ROW EXECUTE FUNCTION public.guard_event_system_budget_lines();

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS stripe_fee_pence integer,
  ADD COLUMN IF NOT EXISTS stripe_net_pence integer,
  ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id text,
  ADD COLUMN IF NOT EXISTS stripe_other_fees_pence integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.event_bookings.stripe_other_fees_pence IS 'Stripe refund/dispute fees on this booking''s charge (events account).';

CREATE TABLE public.event_stripe_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payout_id text NOT NULL UNIQUE,
  amount_pence integer NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  arrival_date date NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_stripe_payouts TO authenticated;
GRANT ALL ON public.event_stripe_payouts TO service_role;
ALTER TABLE public.event_stripe_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_stripe_payouts_select ON public.event_stripe_payouts FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1') OR is_current_officer(auth.uid(), 'auditor_2') OR is_current_officer(auth.uid(), 'worshipful_master'));

CREATE TABLE public.event_payout_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.event_stripe_payouts(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  amount_pence integer NOT NULL CHECK (amount_pence > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (payout_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_payout_allocations TO authenticated;
GRANT ALL ON public.event_payout_allocations TO service_role;
ALTER TABLE public.event_payout_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_payout_allocations_select ON public.event_payout_allocations FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1') OR is_current_officer(auth.uid(), 'auditor_2') OR is_current_officer(auth.uid(), 'worshipful_master'));
CREATE POLICY event_payout_allocations_insert ON public.event_payout_allocations FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_payout_allocations_update ON public.event_payout_allocations FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_payout_allocations_delete ON public.event_payout_allocations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE OR REPLACE FUNCTION public.guard_event_payout_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total integer; _used integer;
BEGIN
  SELECT amount_pence INTO _total FROM public.event_stripe_payouts WHERE id = NEW.payout_id;
  SELECT COALESCE(sum(amount_pence),0) INTO _used FROM public.event_payout_allocations WHERE payout_id = NEW.payout_id AND id <> NEW.id;
  IF _used + NEW.amount_pence > _total THEN RAISE EXCEPTION 'Allocation exceeds the payout amount'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_event_payout_allocation BEFORE INSERT OR UPDATE ON public.event_payout_allocations
FOR EACH ROW EXECUTE FUNCTION public.guard_event_payout_allocation();