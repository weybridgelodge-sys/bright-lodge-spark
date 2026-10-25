CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_booking_refund
  ON public.journal_entries (source_type, source_id)
  WHERE source_type = 'booking_refund' AND source_id IS NOT NULL;