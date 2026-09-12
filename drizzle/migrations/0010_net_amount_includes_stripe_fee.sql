-- PostgreSQL cannot alter a stored generation expression in place, and dropping
-- the column is disallowed. Convert net_amount to a plain maintained column:
-- drop the old expression (keeps existing values), backfill with the corrected
-- formula, then keep it in sync via trigger.
ALTER TABLE public.charity_collections ALTER COLUMN net_amount DROP EXPRESSION;

UPDATE public.charity_collections
SET net_amount = gross_amount - costs - COALESCE(stripe_fee, 0);

ALTER TABLE public.charity_collections ALTER COLUMN net_amount SET NOT NULL;
ALTER TABLE public.charity_collections ALTER COLUMN net_amount SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.tg_charity_collection_net_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.net_amount := NEW.gross_amount - NEW.costs - COALESCE(NEW.stripe_fee, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER charity_collections_net_amount
  BEFORE INSERT OR UPDATE OF gross_amount, costs, stripe_fee
  ON public.charity_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_charity_collection_net_amount();