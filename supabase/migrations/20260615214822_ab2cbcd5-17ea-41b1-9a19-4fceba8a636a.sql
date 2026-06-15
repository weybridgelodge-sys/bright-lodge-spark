
-- Expand Steward to 5 slots (Steward 1..5). Existing 'steward' (most senior) becomes 'steward_1'.
UPDATE public.officer_positions SET key='steward_1', label='Steward 1' WHERE key='steward';
INSERT INTO public.officer_positions (key, label, is_progressive, order_index) VALUES
  ('steward_2','Steward 2', true, 9),
  ('steward_3','Steward 3', true, 8),
  ('steward_4','Steward 4', true, 7),
  ('steward_5','Steward 5', true, 6)
ON CONFLICT (key) DO NOTHING;

UPDATE public.officer_appointments SET position_key='steward_1' WHERE position_key='steward';
