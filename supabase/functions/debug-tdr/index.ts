import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "2026-10-01";
  const to = url.searchParams.get("to") ?? "2026-10-02";
  const cf = url.searchParams.get("cf") ?? "1000";
  const ct = url.searchParams.get("ct") ?? "5900";
  const email = url.searchParams.get("email") ?? "julientidmarsh@pm.me";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) {
    return new Response(JSON.stringify({ stage: "generateLink", error: linkErr }), { status: 200 });
  }

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: sess, error: otpErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: (link.properties as any).hashed_token,
  });
  if (otpErr || !sess.session) {
    return new Response(JSON.stringify({ stage: "verifyOtp", error: otpErr }), { status: 200 });
  }

  const q = async (client: any) =>
    await client
      .from("journal_lines")
      .select(
        "id,debit_pence,credit_pence,description," +
          "journal_entries!inner(id,entry_date,description,source_type,payee,reconciled)," +
          "chart_of_accounts!inner(code,name)",
      )
      .gte("journal_entries.entry_date", from)
      .lte("journal_entries.entry_date", to)
      .gte("chart_of_accounts.code", cf)
      .lte("chart_of_accounts.code", ct)
      .order("entry_date", { referencedTable: "journal_entries" })
      .order("code", { referencedTable: "chart_of_accounts" });

  const res = await q(anon);
  const accts = await anon.from("chart_of_accounts").select("id,code,name,account_type").order("code");

  return new Response(
    JSON.stringify(
      {
        user: sess.session.user.email,
        status: res.status,
        error: res.error,
        count: res.data?.length ?? 0,
        codes: (res.data ?? []).map((r: any) => r.chart_of_accounts.code),
        accountsError: accts.error,
        accountsFirstLast: accts.data ? [accts.data[0]?.code, accts.data[accts.data.length - 1]?.code, accts.data.length] : null,
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json" } },
  );
});
