do $$
declare k text; pid bigint;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'email_queue_service_role_key';
  select net.http_post(
    url := 'https://kntcjlztmcgmagwgheyx.supabase.co/functions/v1/send-summons-email',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||k),
    body := jsonb_build_object(
      'summons_id','00f45c2a-cc82-4c92-a00b-34c4f082718d',
      'resend_recipients', jsonb_build_array('peterlaw77@gmail.com','paulvrtak@gmail.com')
    )
  ) into pid;
  raise notice 'request %', pid;
end $$;