
-- ============ welfare_life_events ============
CREATE TABLE public.welfare_life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('birthday','initiation_anniversary','wedding_anniversary','bereavement','other')),
  event_date date NOT NULL,
  recurring boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_life_events TO authenticated;
GRANT ALL ON public.welfare_life_events TO service_role;
ALTER TABLE public.welfare_life_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "almoner read life events" ON public.welfare_life_events FOR SELECT TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner insert life events" ON public.welfare_life_events FOR INSERT TO authenticated WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner update life events" ON public.welfare_life_events FOR UPDATE TO authenticated USING (public.can_access_almoner(auth.uid())) WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner delete life events" ON public.welfare_life_events FOR DELETE TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE TRIGGER tg_welfare_life_events_updated_at BEFORE UPDATE ON public.welfare_life_events FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_welfare_life_events_member ON public.welfare_life_events(member_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_welfare_life_events_date ON public.welfare_life_events(event_date) WHERE deleted_at IS NULL;

-- ============ welfare_correspondence ============
CREATE TABLE public.welfare_correspondence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  correspondence_date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL CHECK (direction IN ('outgoing','incoming')),
  method text NOT NULL CHECK (method IN ('card','letter','email','phone','flowers','gift','other')),
  subject text NOT NULL,
  body text,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_correspondence TO authenticated;
GRANT ALL ON public.welfare_correspondence TO service_role;
ALTER TABLE public.welfare_correspondence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "almoner read correspondence" ON public.welfare_correspondence FOR SELECT TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner insert correspondence" ON public.welfare_correspondence FOR INSERT TO authenticated WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner update correspondence" ON public.welfare_correspondence FOR UPDATE TO authenticated USING (public.can_access_almoner(auth.uid())) WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner delete correspondence" ON public.welfare_correspondence FOR DELETE TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE TRIGGER tg_welfare_correspondence_updated_at BEFORE UPDATE ON public.welfare_correspondence FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_welfare_correspondence_date ON public.welfare_correspondence(correspondence_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_welfare_correspondence_member ON public.welfare_correspondence(member_id) WHERE deleted_at IS NULL;

-- ============ welfare_rmtgb_referrals ============
CREATE TABLE public.welfare_rmtgb_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_date date NOT NULL DEFAULT CURRENT_DATE,
  referral_type text NOT NULL CHECK (referral_type IN ('financial_grant','education','medical','relief_chest','bereavement_support','other')),
  status text NOT NULL DEFAULT 'considering' CHECK (status IN ('considering','submitted','under_review','approved','declined','closed')),
  summary text NOT NULL,
  outcome text,
  closed_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_rmtgb_referrals TO authenticated;
GRANT ALL ON public.welfare_rmtgb_referrals TO service_role;
ALTER TABLE public.welfare_rmtgb_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "almoner read referrals" ON public.welfare_rmtgb_referrals FOR SELECT TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner insert referrals" ON public.welfare_rmtgb_referrals FOR INSERT TO authenticated WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner update referrals" ON public.welfare_rmtgb_referrals FOR UPDATE TO authenticated USING (public.can_access_almoner(auth.uid())) WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner delete referrals" ON public.welfare_rmtgb_referrals FOR DELETE TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE TRIGGER tg_welfare_rmtgb_referrals_updated_at BEFORE UPDATE ON public.welfare_rmtgb_referrals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_welfare_rmtgb_referrals_member ON public.welfare_rmtgb_referrals(member_id) WHERE deleted_at IS NULL;

-- ============ welfare_absences ============
CREATE TABLE public.welfare_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date,
  reason text NOT NULL CHECK (reason IN ('illness','hospitalisation','bereavement','work','travel','personal','other')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_absences TO authenticated;
GRANT ALL ON public.welfare_absences TO service_role;
ALTER TABLE public.welfare_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "almoner read absences" ON public.welfare_absences FOR SELECT TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner insert absences" ON public.welfare_absences FOR INSERT TO authenticated WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner update absences" ON public.welfare_absences FOR UPDATE TO authenticated USING (public.can_access_almoner(auth.uid())) WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "almoner delete absences" ON public.welfare_absences FOR DELETE TO authenticated USING (public.can_access_almoner(auth.uid()));
CREATE TRIGGER tg_welfare_absences_updated_at BEFORE UPDATE ON public.welfare_absences FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_welfare_absences_member ON public.welfare_absences(member_id) WHERE deleted_at IS NULL;
