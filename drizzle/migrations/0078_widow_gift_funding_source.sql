ALTER TABLE public.almoner_widow_gifts ADD COLUMN funding_source text NOT NULL DEFAULT 'none';
UPDATE public.almoner_widow_gifts SET funding_source = CASE WHEN funding_collection_id IS NOT NULL THEN 'raffle' ELSE 'none' END;
ALTER TABLE public.almoner_widow_gifts ADD CONSTRAINT almoner_widow_gifts_funding_source_chk CHECK (funding_source IN ('none','lodge_account','almoner_fund','raffle'));
ALTER TABLE public.almoner_widow_gifts ADD CONSTRAINT almoner_widow_gifts_funding_link_chk CHECK ((funding_source = 'raffle') = (funding_collection_id IS NOT NULL));