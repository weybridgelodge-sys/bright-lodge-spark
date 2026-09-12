import { supabase } from "@/integrations/supabase/client";
import type { Collection, Donation, CollectionType } from "@/lib/charity/queries";

const pence = (n: number) => Math.round(Number(n || 0) * 100);

type Line = { code: string; debit: number; credit: number; description?: string | null };

async function accountIdsByCode(codes: string[]): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("chart_of_accounts" as any)
    .select("id,code")
    .in("code", codes);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of ((data as any[]) ?? [])) map.set(r.code, r.id);
  for (const c of codes) if (!map.has(c)) throw new Error(`Chart of accounts is missing code ${c}`);
  return map;
}

async function openPeriodId(): Promise<string | null> {
  const { data } = await supabase
    .from("treasurer_periods" as any)
    .select("id")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

/** Posts one balanced journal entry with the given lines, rolling back the entry if the lines fail. */
async function postEntry(opts: {
  entry_date: string;
  description: string;
  source_type: string;
  source_id: string;
  lines: Line[];
}): Promise<string> {
  const codes = Array.from(new Set(opts.lines.map((l) => l.code)));
  const accounts = await accountIdsByCode(codes);
  const periodId = await openPeriodId();
  const { data: u } = await supabase.auth.getUser();

  const debits = opts.lines.reduce((a, l) => a + l.debit, 0);
  const credits = opts.lines.reduce((a, l) => a + l.credit, 0);
  if (debits !== credits || debits <= 0) {
    throw new Error("This record does not produce a balanced entry — check the amounts.");
  }

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries" as any)
    .insert({
      entry_date: opts.entry_date,
      description: opts.description,
      source_type: opts.source_type,
      source_id: opts.source_id,
      period_id: periodId,
      created_by: u.user?.id ?? null,
    })
    .select("id")
    .single();

  if (entryErr || !entry) throw new Error(entryErr?.message ?? "Could not create the journal entry");
  const entryId = (entry as any).id as string;

  const { error: lineErr } = await supabase.from("journal_lines" as any).insert(
    opts.lines.map((l) => ({
      entry_id: entryId,
      account_id: accounts.get(l.code)!,
      debit_pence: l.debit,
      credit_pence: l.credit,
      description: l.description ?? null,
    })),
  );

  if (lineErr) {
    await supabase.from("journal_entries" as any).delete().eq("id", entryId);
    throw new Error(lineErr.message);
  }

  return entryId;
}

const INCOME_CODE: Record<CollectionType, string> = {
  charity_column: "4200",
  raffle: "4300",
  relief_chest: "2200", // liability, not income
  ad_hoc: "4900",
  other: "4900",
};

export async function postCollectionToLedger(c: Collection, typeLabel: string): Promise<string> {
  if (!c.banked_date) throw new Error("Enter banked date first");
  const gross = pence(c.gross_amount);
  const costs = pence(c.costs);
  const stripeFee = pence(c.stripe_fee ?? 0);
  const bank = gross - costs - stripeFee;
  if (bank < 0) throw new Error("Costs and Stripe fee together exceed the gross amount");

  const lines: Line[] = [
    { code: "1000", debit: bank, credit: 0, description: "Banked" },
    { code: INCOME_CODE[c.collection_type], debit: 0, credit: gross, description: typeLabel },
  ];
  if (costs > 0) lines.push({ code: "5310", debit: costs, credit: 0, description: "Raffle prizes / collection costs" });
  if (stripeFee > 0) lines.push({ code: "5420", debit: stripeFee, credit: 0, description: "Stripe card processing fee" });

  const meeting = new Date(c.collection_date).toLocaleDateString("en-GB");
  const description = `${typeLabel} collection, meeting ${meeting}${c.banked_by ? ` — banked by ${c.banked_by}` : ""}`;

  const entryId = await postEntry({
    entry_date: c.banked_date,
    description,
    source_type: "charity_collection",
    source_id: c.id,
    lines,
  });

  const { error } = await supabase
    .from("charity_collections")
    .update({ journal_entry_id: entryId } as any)
    .eq("id", c.id);
  if (error) {
    await supabase.from("journal_entries" as any).delete().eq("id", entryId);
    throw new Error(error.message);
  }
  return entryId;
}

export async function postDonationToLedger(d: Donation, charityName: string): Promise<string> {
  if (d.is_festival_contribution) throw new Error("Festival contributions are memorandum only and are never posted");
  if (!d.banked_date) throw new Error("Enter banked date first");

  const amount = pence(d.amount);
  const debitCode = d.from_relief_chest ? "2200" : "5300";
  const lines: Line[] = [
    { code: debitCode, debit: amount, credit: 0, description: charityName },
    { code: "1000", debit: 0, credit: amount, description: "Paid from bank" },
  ];

  const description = `Donation to ${charityName}${d.banked_by ? ` — paid by ${d.banked_by}` : ""}`;

  const entryId = await postEntry({
    entry_date: d.banked_date,
    description,
    source_type: "charity_donation",
    source_id: d.id,
    lines,
  });

  const { error } = await supabase
    .from("charity_donations")
    .update({ journal_entry_id: entryId } as any)
    .eq("id", d.id);
  if (error) {
    await supabase.from("journal_entries" as any).delete().eq("id", entryId);
    throw new Error(error.message);
  }
  return entryId;
}
