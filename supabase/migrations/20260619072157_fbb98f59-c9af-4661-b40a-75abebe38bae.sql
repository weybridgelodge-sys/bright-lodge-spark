
CREATE TABLE public.member_engagement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurred_on date NOT NULL,
  category text NOT NULL CHECK (category IN ('social','blog','charity','working_group','mentor_contact','visit','provincial','other')),
  summary text NOT NULL,
  logged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.member_engagement_log(member_id, occurred_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_engagement_log TO authenticated;
GRANT ALL ON public.member_engagement_log TO service_role;
ALTER TABLE public.member_engagement_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "engagement read own or mgmt" ON public.member_engagement_log FOR SELECT TO authenticated
USING (
  member_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'worshipful_master')
  OR public.has_role(auth.uid(),'secretary')
  OR public.has_role(auth.uid(),'director_of_ceremonies')
  OR public.can_edit_member_development(auth.uid(), member_id)
);
CREATE POLICY "engagement insert mgmt" ON public.member_engagement_log FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'worshipful_master')
  OR public.has_role(auth.uid(),'secretary')
  OR public.can_edit_member_development(auth.uid(), member_id)
  OR member_id = auth.uid()
);
CREATE POLICY "engagement update mgmt" ON public.member_engagement_log FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'worshipful_master')
  OR public.has_role(auth.uid(),'secretary')
  OR public.can_edit_member_development(auth.uid(), member_id)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'worshipful_master')
  OR public.has_role(auth.uid(),'secretary')
  OR public.can_edit_member_development(auth.uid(), member_id)
);
CREATE POLICY "engagement delete mgmt" ON public.member_engagement_log FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'worshipful_master')
  OR public.has_role(auth.uid(),'secretary')
);
CREATE TRIGGER set_updated_at_engagement BEFORE UPDATE ON public.member_engagement_log
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.last_engagement_date(_member uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    COALESCE((SELECT MAX(occurred_on) FROM public.member_engagement_log WHERE member_id = _member), 'epoch'::date),
    COALESCE((SELECT MAX(ls.session_date) FROM public.loi_attendance la
              JOIN public.loi_sessions ls ON ls.id = la.session_id
              WHERE la.member_id = _member), 'epoch'::date),
    COALESCE((SELECT r.last_checkin_date FROM public.member_development_records r WHERE r.member_id = _member), 'epoch'::date)
  )
$$;

CREATE TABLE public.working_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  remit text NOT NULL,
  founding_statement text,
  lead_member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_groups TO authenticated;
GRANT ALL ON public.working_groups TO service_role;
ALTER TABLE public.working_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wg read active" ON public.working_groups FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()));
CREATE POLICY "wg write mgmt" ON public.working_groups FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'worshipful_master') OR public.has_role(auth.uid(),'secretary'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'worshipful_master') OR public.has_role(auth.uid(),'secretary'));
CREATE TRIGGER set_updated_at_wg BEFORE UPDATE ON public.working_groups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.working_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  working_group_id uuid NOT NULL REFERENCES public.working_groups(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('lead','member')),
  joined_on date DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (working_group_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_group_members TO authenticated;
GRANT ALL ON public.working_group_members TO service_role;
ALTER TABLE public.working_group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_working_group_lead(_user uuid, _group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.working_groups g WHERE g.id = _group AND g.lead_member_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.working_group_members m
    WHERE m.working_group_id = _group AND m.member_id = _user AND m.role = 'lead'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_working_group_member(_user uuid, _group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.working_group_members m WHERE m.working_group_id = _group AND m.member_id = _user)
$$;

CREATE POLICY "wgm read active" ON public.working_group_members FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()));
CREATE POLICY "wgm write mgmt" ON public.working_group_members FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'worshipful_master') OR public.has_role(auth.uid(),'secretary')
  OR public.is_working_group_lead(auth.uid(), working_group_id)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'worshipful_master') OR public.has_role(auth.uid(),'secretary')
  OR public.is_working_group_lead(auth.uid(), working_group_id)
);

CREATE TABLE public.working_group_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  working_group_id uuid NOT NULL REFERENCES public.working_groups(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('meeting','event','outcome')),
  title text NOT NULL,
  notes text,
  logged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.working_group_activities(working_group_id, activity_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_group_activities TO authenticated;
GRANT ALL ON public.working_group_activities TO service_role;
ALTER TABLE public.working_group_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wga read active" ON public.working_group_activities FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()));
CREATE POLICY "wga write mgmt or member" ON public.working_group_activities FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'worshipful_master') OR public.has_role(auth.uid(),'secretary')
  OR public.is_working_group_lead(auth.uid(), working_group_id)
  OR public.is_working_group_member(auth.uid(), working_group_id)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'worshipful_master') OR public.has_role(auth.uid(),'secretary')
  OR public.is_working_group_lead(auth.uid(), working_group_id)
  OR public.is_working_group_member(auth.uid(), working_group_id)
);
CREATE TRIGGER set_updated_at_wga BEFORE UPDATE ON public.working_group_activities
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.can_edit_member_development(_editor uuid, _member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_editor, 'admin'::public.app_role)
    OR public.has_role(_editor, 'worshipful_master'::public.app_role)
    OR public.has_role(_editor, 'secretary'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.member_development_records r
      WHERE r.member_id = _member AND r.assigned_mentor_id = _editor
    );
$$;

INSERT INTO public.working_groups (slug, name, remit) VALUES
('social-committee','Social Committee',
 'Organise the informal social calendar including darts nights, Topgolf, golf days, pub nights, and clay pigeon shoots. Plan, book, and communicate all social events to lodge members.'),
('charity-fundraising','Charity & Fundraising Group',
 'Research charitable causes, organise fundraising activities, and report to the lodge at meetings. Link charitable activities to the Charity Steward and ensure lodge giving targets are met.'),
('community-volunteering','Community & Volunteering Group',
 'Identify and coordinate volunteering opportunities including local food banks, community events, and representation at Provincial public engagement activities.'),
('lodge-visits','Lodge Visits & Experiences Group',
 'Organise visiting other lodges, coordinate attendance at Provincial events, and arrange group attendance at the Annual Provincial Meeting and other significant Masonic occasions.'),
('comms-heritage','Communications & Heritage Group',
 'Write lodge news blog posts, maintain the lodge history timeline, photograph social events for the website, and contribute to lodge communications.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.module_settings (key, value) VALUES
('working_groups_philosophy', '"Weybridge Lodge operates on the principle of the beehive. Every brother, from the newest Entered Apprentice to the most senior Past Master, contributes to the life of the lodge. Working groups exist so that every member has a role, a purpose, and a home in the lodge beyond the progressive offices."'::jsonb)
ON CONFLICT (key) DO NOTHING;
