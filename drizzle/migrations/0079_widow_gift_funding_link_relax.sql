-- Allow a raffle-funded gift to keep its category if the Charity Steward later deletes the collection (FK is ON DELETE SET NULL).
ALTER TABLE public.almoner_widow_gifts DROP CONSTRAINT almoner_widow_gifts_funding_link_chk;
ALTER TABLE public.almoner_widow_gifts ADD CONSTRAINT almoner_widow_gifts_funding_link_chk CHECK (funding_collection_id IS NULL OR funding_source = 'raffle');