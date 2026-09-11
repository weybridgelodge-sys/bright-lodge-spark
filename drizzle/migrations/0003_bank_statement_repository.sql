CREATE TABLE public.bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size integer,
  parse_status text NOT NULL DEFAULT 'parsed',
  parse_message text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid
);

CREATE TABLE public.bank_statement_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  transaction_date date,
  description text,
  amount_pence integer NOT NULL,
  raw_memo text,
  parse_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bank_statement_tx_statement_idx ON public.bank_statement_transactions (statement_id, parse_order);

GRANT SELECT, INSERT, DELETE ON public.bank_statements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.bank_statement_transactions TO authenticated;
GRANT ALL ON public.bank_statements TO service_role;
GRANT ALL ON public.bank_statement_transactions TO service_role;

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_statements_select ON public.bank_statements
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer'::text)
  OR is_current_officer(auth.uid(), 'auditor_1'::text)
  OR is_current_officer(auth.uid(), 'auditor_2'::text)
  OR is_current_officer(auth.uid(), 'worshipful_master'::text)
);

CREATE POLICY bank_statements_insert ON public.bank_statements
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer'::text)
);

CREATE POLICY bank_statements_delete ON public.bank_statements
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer'::text)
);

CREATE POLICY bank_statement_tx_select ON public.bank_statement_transactions
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.bank_statements s WHERE s.id = statement_id)
);

CREATE POLICY bank_statement_tx_insert ON public.bank_statement_transactions
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer'::text)
);

CREATE POLICY bank_statement_tx_delete ON public.bank_statement_transactions
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer'::text)
);

CREATE POLICY "bank statements read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'bank-statements' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'secretary'::app_role)
    OR is_current_officer(auth.uid(), 'treasurer'::text)
    OR is_current_officer(auth.uid(), 'auditor_1'::text)
    OR is_current_officer(auth.uid(), 'auditor_2'::text)
    OR is_current_officer(auth.uid(), 'worshipful_master'::text)
  )
);

CREATE POLICY "bank statements insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'bank-statements' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_current_officer(auth.uid(), 'treasurer'::text)
  )
);

CREATE POLICY "bank statements delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'bank-statements' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_current_officer(auth.uid(), 'treasurer'::text)
  )
);