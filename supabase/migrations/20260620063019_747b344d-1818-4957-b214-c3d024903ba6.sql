
ALTER TABLE public.newsletter_broadcasts
  ADD COLUMN IF NOT EXISTS content_visitors jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS audience text;

COMMENT ON COLUMN public.newsletter_broadcasts.content_visitors IS 'Visitor/Public audience variant of the newsletter body. The existing content column holds the Members variant.';
COMMENT ON COLUMN public.newsletter_broadcasts.audience IS 'For sent/archived rows: members | visitors. Null on drafts.';
