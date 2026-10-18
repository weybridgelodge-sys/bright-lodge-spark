# Treasurer rules
- Journal numbers come only from the immutable sequence trigger; show with formatEntryNumber. document_number remains free text.
- Split bank matches use the primary line plus bank_statement_match_lines, only through link/unlink RPCs; taken checks use both.
- Report ranges use reportPeriods helpers and shared AccountDrilldown so report totals reconcile.
- Year close uses one closing period and post_year_close; exclude it from month/year movement and carry it into General Fund b/f.
- Audit rounds/signoffs are immutable server workflows; closing requires approval. Certified packs are frozen and never overwritten.
- Subscription recognition uses splitSubscription once; receipts and prepayment clears never split again. Under-25 means age on 1 October.
- Event Accounts is a funds-held subledger (2300): fixed budget lines (system_key) take actuals from paid event_bookings and real events-Stripe fees; bank side is tagged Lloyds 1000 lines plus event_payout_allocations; tie-out lives in src/lib/treasurer/eventTieOut.ts. Why: event money is agency money and must never post to lodge income.
- Lodge default fees (UGLE/PGL, under-25 %) live in lodge_fee_settings, read/written only via get/update_lodge_fee_settings (admin or current Treasurer); they only pre-fill the New Member Fees form. Annual rate stays in subscription_settings. Why: one public source, posted entries never change.
