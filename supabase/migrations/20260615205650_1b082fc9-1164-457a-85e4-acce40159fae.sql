
ALTER TABLE public.officer_positions
  ADD COLUMN IF NOT EXISTS is_progressive boolean NOT NULL DEFAULT true;

-- Drop unique constraint temporarily so we can renumber safely
ALTER TABLE public.officer_positions
  DROP CONSTRAINT IF EXISTS officer_positions_order_index_key;

-- Renumber existing progressive offices (gaps of 10 to leave room)
UPDATE public.officer_positions SET order_index = 30, is_progressive = true WHERE key = 'inner_guard';
UPDATE public.officer_positions SET order_index = 40, is_progressive = true WHERE key = 'junior_deacon';
UPDATE public.officer_positions SET order_index = 50, is_progressive = true WHERE key = 'senior_deacon';
UPDATE public.officer_positions SET order_index = 60, is_progressive = true WHERE key = 'junior_warden';
UPDATE public.officer_positions SET order_index = 70, is_progressive = true WHERE key = 'senior_warden';
UPDATE public.officer_positions SET order_index = 80, is_progressive = true WHERE key = 'worshipful_master';

-- Insert new progressive offices below Inner Guard
INSERT INTO public.officer_positions (key, label, order_index, is_progressive) VALUES
  ('steward',         'Steward',         10, true),
  ('senior_steward',  'Senior Steward',  20, true)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, order_index = EXCLUDED.order_index, is_progressive = true;

-- Insert non-progressive offices
INSERT INTO public.officer_positions (key, label, order_index, is_progressive) VALUES
  ('immediate_past_master',              'Immediate Past Master',              100, false),
  ('chaplain',                           'Chaplain',                           110, false),
  ('treasurer',                          'Treasurer',                          120, false),
  ('secretary',                          'Secretary',                          130, false),
  ('assistant_secretary',                'Assistant Secretary',                140, false),
  ('director_of_ceremonies',             'Director of Ceremonies',             150, false),
  ('assistant_director_of_ceremonies',   'Assistant Director of Ceremonies',   160, false),
  ('almoner',                            'Almoner',                            170, false),
  ('charity_steward',                    'Charity Steward',                    180, false),
  ('tyler',                              'Tyler',                              190, false),
  ('assistant_tyler',                    'Assistant Tyler',                    200, false)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, order_index = EXCLUDED.order_index, is_progressive = EXCLUDED.is_progressive;

-- Restore unique constraint
ALTER TABLE public.officer_positions
  ADD CONSTRAINT officer_positions_order_index_key UNIQUE (order_index);
