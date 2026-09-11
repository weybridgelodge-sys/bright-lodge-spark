import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "2026-10-01";
  const to = url.searchParams.get("to") ?? "2026-10-02";
  const cf = url.searchParams.get("cf") ?? "1000";
  const ct = url.searchParams.get("ct") ?? "5900";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error, status } = await supabase
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

  return new Response(
    JSON.stringify({ status, error, count: data?.length ?? 0, sample: (data ?? []).slice(0, 3) }, null, 2),
    { headers: { "Content-Type": "application/json" } },
  );
});
