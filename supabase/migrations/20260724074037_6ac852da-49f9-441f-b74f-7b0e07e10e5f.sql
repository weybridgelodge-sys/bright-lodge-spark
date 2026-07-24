
-- =========================================================================
-- Dues / Subscriptions data model
-- =========================================================================

CREATE TABLE public.dues_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_amount_pence INT NOT NULL CHECK (annual_amount_pence > 0),
  effective_lodge_year INT NOT NULL,
  notice_required BOOLEAN NOT NULL DEFAULT true,
  notice_sent_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(effective_lodge_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dues_settings TO authenticated;
GRANT ALL ON public.dues_settings TO service_role;
ALTER TABLE public.dues_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dues settings"
  ON public.dues_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_dues_settings_updated
  BEFORE UPDATE ON public.dues_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- -------------------------------------------------------------------------

CREATE TABLE public.dues_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lodge_year INT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('lump_sum','monthly')),
  method TEXT NOT NULL CHECK (method IN ('card','bacs')),
  status TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup','active','past_due','canceled','completed','paused','failed')),
  amount_pence INT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_price_id TEXT,
  stripe_checkout_session_id TEXT,
  credit_balance_pence INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, lodge_year)
);

CREATE INDEX idx_dues_subs_member ON public.dues_subscriptions(member_id);
CREATE INDEX idx_dues_subs_stripe_sub ON public.dues_subscriptions(stripe_subscription_id);
CREATE INDEX idx_dues_subs_stripe_session ON public.dues_subscriptions(stripe_checkout_session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dues_subscriptions TO authenticated;
GRANT ALL ON public.dues_subscriptions TO service_role;
ALTER TABLE public.dues_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all dues subscriptions"
  ON public.dues_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Members can view their own dues subscription"
  ON public.dues_subscriptions FOR SELECT TO authenticated
  USING (member_id = auth.uid());

CREATE TRIGGER trg_dues_subs_updated
  BEFORE UPDATE ON public.dues_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- -------------------------------------------------------------------------

CREATE TABLE public.dues_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.dues_subscriptions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment','refund')),
  amount_pence INT NOT NULL CHECK (amount_pence > 0),
  method TEXT CHECK (method IN ('card','bacs')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  stripe_invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'succeeded'
    CHECK (status IN ('succeeded','pending','failed','requires_action')),
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dues_payments_sub ON public.dues_payments(subscription_id);
CREATE INDEX idx_dues_payments_member ON public.dues_payments(member_id);
CREATE UNIQUE INDEX ux_dues_payments_pi
  ON public.dues_payments(stripe_payment_intent_id, type)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX ux_dues_payments_refund
  ON public.dues_payments(stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dues_payments TO authenticated;
GRANT ALL ON public.dues_payments TO service_role;
ALTER TABLE public.dues_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all dues payments"
  ON public.dues_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Members can view their own dues payments"
  ON public.dues_payments FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- -------------------------------------------------------------------------
-- Seed current annual amount (£250) for the current lodge year
INSERT INTO public.dues_settings (annual_amount_pence, effective_lodge_year, notice_required, applied_at)
VALUES (25000, public.current_lodge_year(), false, now())
ON CONFLICT (effective_lodge_year) DO NOTHING;
