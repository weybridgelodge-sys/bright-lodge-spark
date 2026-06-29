
-- Lock down sensitive columns at the privilege level so direct table SELECTs
-- can never expose PII or contact tokens to ordinary members. Access to these
-- fields is only available through SECURITY DEFINER functions
-- (get_profiles_pii, get_summons_dining_contacts) and the service_role.

-- profiles: revoke PII columns from anon/authenticated
REVOKE SELECT (date_of_birth, phone, address_line1, address_line2, address_line3, town, county, postcode, ugle_reg_number)
  ON public.profiles FROM anon, authenticated;

-- summonses: revoke dining contact email from anon/authenticated
REVOKE SELECT (dining_enquiry_email) ON public.summonses FROM anon, authenticated;

-- visitor_contacts: revoke email + unsubscribe token from anon/authenticated
REVOKE SELECT (email, unsubscribe_token) ON public.visitor_contacts FROM anon, authenticated;
