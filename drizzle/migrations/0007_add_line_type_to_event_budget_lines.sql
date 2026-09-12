ALTER TABLE public.event_budget_lines
  ADD COLUMN IF NOT EXISTS line_type text NOT NULL DEFAULT 'expense';

ALTER TABLE public.event_budget_lines
  ADD CONSTRAINT event_budget_lines_line_type_check
  CHECK (line_type IN ('income','expense'));