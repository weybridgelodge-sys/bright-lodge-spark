UPDATE public.charity_donations d
SET is_festival_contribution = true,
    updated_at = now()
FROM public.charity_ledger l
WHERE l.id = d.charity_id
  AND d.is_festival_contribution = false
  AND (
    lower(trim(l.name)) = 'surrey 2030 festival'
    OR lower(l.name) LIKE '%surrey 2030%'
    OR lower(l.name) LIKE '%2030 festival%'
  );