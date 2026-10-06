CREATE TABLE public.almoner_widow_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widow_id uuid NOT NULL REFERENCES public.almoner_widows(id) ON DELETE CASCADE,
  lodge_year integer NOT NULL,
  gift_type text NOT NULL CHECK (gift_type IN ('hamper','cheque','voucher','other')),
  description text CHECK (description IS NULL OR length(description) <= 300),
  amount numeric(10,2) CHECK (amount IS NULL OR amount > 0),
  date_sent date NOT NULL,
  funding_collection_id uuid REFERENCES public.charity_collections(id) ON DELETE SET NULL,
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  logged_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT almoner_widow_gifts_hamper_no_amount CHECK (gift_type <> 'hamper' OR amount IS NULL),
  CONSTRAINT almoner_widow_gifts_money_amount CHECK (gift_type NOT IN ('cheque','voucher') OR amount IS NOT NULL)
);
CREATE INDEX almoner_widow_gifts_widow_idx ON public.almoner_widow_gifts(widow_id, date_sent);
CREATE INDEX almoner_widow_gifts_collection_idx ON public.almoner_widow_gifts(funding_collection_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.almoner_widow_gifts TO authenticated;
GRANT ALL ON public.almoner_widow_gifts TO service_role;
ALTER TABLE public.almoner_widow_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Almoner viewers read gifts" ON public.almoner_widow_gifts FOR SELECT TO authenticated USING (public.can_view_almoner(auth.uid()));
CREATE POLICY "Almoner editors add gifts" ON public.almoner_widow_gifts FOR INSERT TO authenticated WITH CHECK (public.can_edit_almoner(auth.uid()));
CREATE POLICY "Almoner editors update gifts" ON public.almoner_widow_gifts FOR UPDATE TO authenticated USING (public.can_edit_almoner(auth.uid())) WITH CHECK (public.can_edit_almoner(auth.uid()));
CREATE POLICY "Almoner editors delete gifts" ON public.almoner_widow_gifts FOR DELETE TO authenticated USING (public.can_edit_almoner(auth.uid()));

CREATE OR REPLACE FUNCTION public.almoner_widow_gifts_set_year()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.lodge_year := public.officer_year_at(NEW.date_sent);
  IF NEW.gift_type = 'hamper' THEN NEW.amount := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER almoner_widow_gifts_year BEFORE INSERT OR UPDATE ON public.almoner_widow_gifts
  FOR EACH ROW EXECUTE FUNCTION public.almoner_widow_gifts_set_year();
CREATE TRIGGER almoner_widow_gifts_updated BEFORE UPDATE ON public.almoner_widow_gifts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.get_almoner_raffle_collections()
RETURNS TABLE(id uuid, collection_date date, event_title text, net_amount numeric, allocated numeric, notes text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.collection_date, e.title, c.net_amount,
         COALESCE((SELECT sum(g.amount) FROM public.almoner_widow_gifts g WHERE g.funding_collection_id = c.id), 0),
         c.notes
  FROM public.charity_collections c
  LEFT JOIN public.lodge_events e ON e.id = c.lodge_event_id
  WHERE c.collection_type = 'raffle' AND public.can_view_almoner(auth.uid())
  ORDER BY (extract(month FROM c.collection_date) = 12) DESC, c.collection_date DESC
$$;
REVOKE ALL ON FUNCTION public.get_almoner_raffle_collections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_almoner_raffle_collections() TO authenticated;