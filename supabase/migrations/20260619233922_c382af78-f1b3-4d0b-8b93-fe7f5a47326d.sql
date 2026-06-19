
-- Newsletter subscribers (public signup)
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'public_signup',
  confirmed boolean NOT NULL DEFAULT true,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT ALL ON public.newsletter_subscribers TO service_role;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Lowercase emails on insert/update
CREATE OR REPLACE FUNCTION public.tg_lowercase_email()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.email = lower(trim(NEW.email)); RETURN NEW; END $$;

CREATE TRIGGER newsletter_subscribers_lower_email
  BEFORE INSERT OR UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.tg_lowercase_email();

CREATE TRIGGER newsletter_subscribers_set_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Editor capability function (admin, WM, secretary, or member of Communications & Heritage Group)
CREATE OR REPLACE FUNCTION public.can_edit_newsletter(_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user, 'admin'::public.app_role)
    OR public.has_role(_user, 'worshipful_master'::public.app_role)
    OR public.has_role(_user, 'secretary'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.working_group_members m
      JOIN public.working_groups g ON g.id = m.working_group_id
      WHERE m.member_id = _user
        AND lower(g.name) LIKE '%communications%heritage%'
    );
$$;

-- Public can subscribe (insert only)
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Editors can read/manage list
CREATE POLICY "Editors can view subscribers"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (public.can_edit_newsletter(auth.uid()));

CREATE POLICY "Editors can update subscribers"
  ON public.newsletter_subscribers FOR UPDATE
  TO authenticated
  USING (public.can_edit_newsletter(auth.uid()));

CREATE POLICY "Editors can delete subscribers"
  ON public.newsletter_subscribers FOR DELETE
  TO authenticated
  USING (public.can_edit_newsletter(auth.uid()));

-- Broadcast audit log
CREATE TABLE public.newsletter_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  target_list text NOT NULL,
  content jsonb NOT NULL,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  resend_broadcast_id text,
  resend_audience_id text,
  status text NOT NULL DEFAULT 'sending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.newsletter_broadcasts TO authenticated;
GRANT ALL ON public.newsletter_broadcasts TO service_role;

ALTER TABLE public.newsletter_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can view broadcasts"
  ON public.newsletter_broadcasts FOR SELECT
  TO authenticated
  USING (public.can_edit_newsletter(auth.uid()));
