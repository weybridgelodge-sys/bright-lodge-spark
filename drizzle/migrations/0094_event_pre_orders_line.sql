CREATE OR REPLACE FUNCTION public.seed_event_system_budget_lines(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan integer := 0; _type text;
BEGIN
  SELECT COALESCE(adult_price_pence * capacity, 0), event_type INTO _plan, _type FROM public.event_accounts WHERE id = _event_id;
  INSERT INTO public.event_budget_lines(event_id, category, planned_pence, line_type, system_key)
  SELECT _event_id, v.cat, v.p, v.t, v.k FROM (VALUES
    ('Ticket sales', COALESCE(_plan,0), 'income', 'ticket_sales'),
    ('Fee contributions', 0, 'income', 'fee_contributions'),
    ('Stripe fees', 0, 'expense', 'stripe_fees')) v(cat, p, t, k)
  WHERE NOT EXISTS (SELECT 1 FROM public.event_budget_lines b WHERE b.event_id = _event_id AND b.system_key = v.k);
  -- Pre-orders (drinks/vouchers) line only for non-simple events; never removed once created.
  IF COALESCE(_type, 'simple') <> 'simple' THEN
    INSERT INTO public.event_budget_lines(event_id, category, planned_pence, line_type, system_key)
    SELECT _event_id, 'Pre-orders', 0, 'income', 'pre_orders'
    WHERE NOT EXISTS (SELECT 1 FROM public.event_budget_lines b WHERE b.event_id = _event_id AND b.system_key = 'pre_orders');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.event_accounts_type_seed_lines_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.seed_event_system_budget_lines(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS event_accounts_type_seed_lines ON public.event_accounts;
CREATE TRIGGER event_accounts_type_seed_lines AFTER UPDATE OF event_type ON public.event_accounts
FOR EACH ROW WHEN (NEW.event_type IS DISTINCT FROM OLD.event_type) EXECUTE FUNCTION public.event_accounts_type_seed_lines_trg();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.event_accounts WHERE event_type <> 'simple' LOOP PERFORM public.seed_event_system_budget_lines(r.id); END LOOP;
END $$;