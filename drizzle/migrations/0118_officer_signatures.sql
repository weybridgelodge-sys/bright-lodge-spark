CREATE TABLE public.member_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL REFERENCES public.units(id),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  content_type text NOT NULL DEFAULT 'image/png',
  width integer NOT NULL,
  height integer NOT NULL,
  byte_size integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  source text NOT NULL CHECK (source IN ('self_upload','self_drawn','on_behalf')),
  consent_note text,
  consent_date date,
  consent_recorded_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  CONSTRAINT member_signatures_consent CHECK (source <> 'on_behalf' OR (consent_note IS NOT NULL AND length(trim(consent_note)) > 0 AND consent_date IS NOT NULL AND consent_recorded_by IS NOT NULL))
);
CREATE UNIQUE INDEX member_signatures_one_active ON public.member_signatures(member_id) WHERE active;
GRANT SELECT ON public.member_signatures TO authenticated;
GRANT ALL ON public.member_signatures TO service_role;
ALTER TABLE public.member_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own signature metadata" ON public.member_signatures FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY "Officers read unit signature metadata" ON public.member_signatures FOR SELECT TO authenticated USING (
  unit_id = (SELECT unit_id FROM public.profiles WHERE id = auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid()) OR public.is_current_officer(auth.uid(),'worshipful_master')));

CREATE TABLE public.signature_event_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL REFERENCES public.units(id),
  member_id uuid NOT NULL,
  signature_id uuid,
  action text NOT NULL CHECK (action IN ('capture','replace','revoke')),
  actor_id uuid NOT NULL,
  on_behalf boolean NOT NULL DEFAULT false,
  consent_note text,
  consent_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.signature_event_audit TO authenticated;
GRANT ALL ON public.signature_event_audit TO service_role;
ALTER TABLE public.signature_event_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own signature events" ON public.signature_event_audit FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY "Admin/Secretary read signature events" ON public.signature_event_audit FOR SELECT TO authenticated USING (
  unit_id = (SELECT unit_id FROM public.profiles WHERE id = auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));

CREATE TABLE public.signature_usage_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL REFERENCES public.units(id),
  form_key text NOT NULL,
  lodge_year integer NOT NULL,
  office_key text NOT NULL,
  signer_member_id uuid NOT NULL,
  signature_id uuid NOT NULL,
  generated_by uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  output_path text
);
GRANT SELECT ON public.signature_usage_audit TO authenticated;
GRANT ALL ON public.signature_usage_audit TO service_role;
ALTER TABLE public.signature_usage_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own signature usage" ON public.signature_usage_audit FOR SELECT TO authenticated USING (signer_member_id = auth.uid());
CREATE POLICY "Admin/Secretary read signature usage" ON public.signature_usage_audit FOR SELECT TO authenticated USING (
  unit_id = (SELECT unit_id FROM public.profiles WHERE id = auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.is_lodge_secretary(auth.uid())));

INSERT INTO public.module_settings(key, value) VALUES ('officer_signatures', 'false'::jsonb) ON CONFLICT (key) DO NOTHING;