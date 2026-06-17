
-- lodge_template (singleton)
CREATE TABLE public.lodge_template (
  id text PRIMARY KEY DEFAULT 'default',
  lodge_name text NOT NULL DEFAULT 'Weybridge Lodge',
  lodge_number text NOT NULL DEFAULT '6787',
  province text NOT NULL DEFAULT 'Surrey',
  consecration_date date,
  logo_url text,
  venue_address text,
  regular_meeting_pattern text,
  loi_details text,
  provincial_website text,
  mcf_contact text,
  dining_booking_url text,
  data_protection_text text,
  data_protection_text_short text,
  overseas_attendance_text text,
  progression_notice_text text,
  wm_contact text,
  secretary_contact text,
  royal_arch_rep text,
  honorary_members text,
  lodge_representatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lodge_template_single CHECK (id = 'default')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lodge_template TO authenticated;
GRANT ALL ON public.lodge_template TO service_role;

ALTER TABLE public.lodge_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members read lodge template"
ON public.lodge_template FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Secretaries manage lodge template"
ON public.lodge_template FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
);

CREATE TRIGGER trg_lodge_template_updated
BEFORE UPDATE ON public.lodge_template
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.lodge_template (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- summons status enum
CREATE TYPE public.summons_status AS ENUM ('draft','finalised','sent');

CREATE TABLE public.summonses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_number integer NOT NULL,
  lodge_event_id uuid REFERENCES public.lodge_events(id) ON DELETE SET NULL,
  meeting_date date,
  meeting_time text,
  meeting_type text,
  dress_code text,
  minutes_confirmation_date date,
  next_meeting_date date,
  officer_night_date date,
  agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  dining_enquiry_name text,
  dining_enquiry_email text,
  notice_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_storage_path text,
  status public.summons_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  sent_to_count integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX summonses_meeting_date_idx ON public.summonses(meeting_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.summonses TO authenticated;
GRANT ALL ON public.summonses TO service_role;

ALTER TABLE public.summonses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members read finalised summonses"
ON public.summonses FOR SELECT TO authenticated
USING (
  public.is_active_member(auth.uid())
  AND (
    status IN ('finalised','sent')
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'secretary'::app_role)
    OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
  )
);

CREATE POLICY "Secretaries manage summonses"
ON public.summonses FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
);

CREATE TRIGGER trg_summonses_updated
BEFORE UPDATE ON public.summonses
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.summons_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summons_id uuid NOT NULL REFERENCES public.summonses(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX summons_email_log_summons_idx ON public.summons_email_log(summons_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.summons_email_log TO authenticated;
GRANT ALL ON public.summons_email_log TO service_role;

ALTER TABLE public.summons_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Secretaries read all log"
ON public.summons_email_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
);

CREATE POLICY "Members read own log"
ON public.summons_email_log FOR SELECT TO authenticated
USING (recipient_user_id = auth.uid());

CREATE POLICY "Secretaries write log"
ON public.summons_email_log FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'assistant_secretary'::app_role)
);
