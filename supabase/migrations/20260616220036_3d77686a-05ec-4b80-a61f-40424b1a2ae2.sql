
-- ============ lodge_events ============
CREATE TABLE public.lodge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  intro text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  tyling_time text NOT NULL DEFAULT '',
  dining_time text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT 'Guildford Masonic Centre, Hitherbury Close, Portsmouth Road, Guildford GU2 4DR',
  dress_code text NOT NULL DEFAULT 'Normal Masonic attire — Provincial, Black or Craft Tie, Dark Suit and White Gloves',
  booking_deadline date,
  intro_heading text,
  published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lodge_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lodge_events TO authenticated;
GRANT ALL ON public.lodge_events TO service_role;
ALTER TABLE public.lodge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published events"
  ON public.lodge_events FOR SELECT
  USING (published = true);

CREATE POLICY "Admins and secretary can read all events"
  ON public.lodge_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Admins and secretary can insert events"
  ON public.lodge_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Admins and secretary can update events"
  ON public.lodge_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Admins and secretary can delete events"
  ON public.lodge_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER set_lodge_events_updated_at
  BEFORE UPDATE ON public.lodge_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ lodge_event_courses ============
CREATE TABLE public.lodge_event_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.lodge_events(id) ON DELETE CASCADE,
  course_label text NOT NULL,
  dish text NOT NULL,
  description text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodge_event_courses_event ON public.lodge_event_courses(event_id, position);
GRANT SELECT ON public.lodge_event_courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lodge_event_courses TO authenticated;
GRANT ALL ON public.lodge_event_courses TO service_role;
ALTER TABLE public.lodge_event_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read courses of published events"
  ON public.lodge_event_courses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lodge_events e WHERE e.id = event_id AND e.published = true));

CREATE POLICY "Admins and secretary can manage courses"
  ON public.lodge_event_courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER set_lodge_event_courses_updated_at
  BEFORE UPDATE ON public.lodge_event_courses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ lodge_event_dining_options ============
CREATE TABLE public.lodge_event_dining_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.lodge_events(id) ON DELETE CASCADE,
  label text NOT NULL,
  price_pence int NOT NULL CHECK (price_pence >= 0),
  position int NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodge_event_dining_event ON public.lodge_event_dining_options(event_id, position);
GRANT SELECT ON public.lodge_event_dining_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lodge_event_dining_options TO authenticated;
GRANT ALL ON public.lodge_event_dining_options TO service_role;
ALTER TABLE public.lodge_event_dining_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read dining options of published events"
  ON public.lodge_event_dining_options FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lodge_events e WHERE e.id = event_id AND e.published = true));

CREATE POLICY "Admins and secretary can manage dining options"
  ON public.lodge_event_dining_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER set_lodge_event_dining_options_updated_at
  BEFORE UPDATE ON public.lodge_event_dining_options
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Seed current April 2026 meeting ============
INSERT INTO public.lodge_events (slug, title, intro, event_date, tyling_time, dining_time, booking_deadline, intro_heading)
VALUES (
  'festive_board_april_2026',
  'Initiation Ceremony — April Meeting',
  E'W Bro. Julien Tidmarsh, Worshipful Master of Weybridge Lodge No. 6787, cordially invites you to attend an Initiation Meeting on **Wednesday, 15th April 2026, commencing at 6.00 pm**.\n\nWeybridge Lodge is delighted to announce a truly special occasion: another initiation ceremony welcoming one more new candidate into Freemasonry, our fifth of the year.\n\nFor those who remember their own initiation, this is a chance to revisit the solemnity and symbolism of that first step. Come and share this experience with us as we witness our new initiate begin their Masonic journey.\n\nFollowing the ceremony, we''ll gather for a festive board filled with cheer, good food, and heartfelt fellowship. Let''s come together to welcome our newest member and celebrate the enduring spirit of Freemasonry.',
  '2026-04-15 18:00:00+01',
  'Tyling at 6.00 pm prompt',
  'Festive Board Dining at 7:45 pm',
  '2026-04-08',
  'Initiation Ceremony — April Meeting'
);

WITH e AS (SELECT id FROM public.lodge_events WHERE slug = 'festive_board_april_2026')
INSERT INTO public.lodge_event_courses (event_id, course_label, dish, description, position)
SELECT e.id, c.course_label, c.dish, c.description, c.position FROM e, (VALUES
  ('Entree', 'Halloumi, Carrot, Orange & Watercress Salad', 'With honey & mustard dressing.', 1),
  ('Main', 'Irish Stew with Soda Bread', 'Lamb, smoked bacon, root vegetables, potatoes & pearl barley, slowly cooked.', 2),
  ('Dessert', 'Warm Chocolate Brownie (Gluten-Free)', 'Served with sauce & ice cream.', 3),
  ('Cheese & Port', 'Worshipful Masters'' Cheese & Port', 'Platters of Cheese & Biscuits with a glass of Port, courtesy of the Worshipful Master.', 4),
  ('To Finish', 'Tea or Coffee', '', 5)
) AS c(course_label, dish, description, position);

WITH e AS (SELECT id FROM public.lodge_events WHERE slug = 'festive_board_april_2026')
INSERT INTO public.lodge_event_dining_options (event_id, label, price_pence, position, is_default)
SELECT e.id, 'Festive Board (3-course dinner)', 3200, 1, true FROM e;
