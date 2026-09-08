import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const money = (pence: number) =>
  `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type RowKey = "ugle_over" | "ugle_under" | "pgl_over" | "pgl_under" | "spcf" | "pgm";

type Row = { key: RowKey; label: string; rate: string; count: string };

const DEFAULT_ROWS: Row[] = [
  { key: "ugle_over", label: "UGLE Fee (25 and over)", rate: "70.00", count: "0" },
  { key: "ugle_under", label: "UGLE Fee (under 25)", rate: "35.00", count: "0" },
  { key: "pgl_over", label: "PGL Fee (25 and over)", rate: "25.80", count: "0" },
  { key: "pgl_under", label: "PGL Fee (under 25)", rate: "12.90", count: "0" },
  { key: "spcf", label: "SPCF contribution", rate: "1.50", count: "0" },
  { key: "pgm", label: "PGM's Fund (flat, per lodge)", rate: "40.00", count: "1" },
];

const defaultReturnYear = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  // most recently passed 30 September
  const passed = now >= new Date(Date.UTC(y, 8, 30));
  return passed ? y : y - 1;
};

type ReviewMember = { id: string; name: string; status: string };

export default function AnnualReturnCalculator({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [year, setYear] = useState<number>(defaultReturnYear());
  const [suggesting, setSuggesting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [review, setReview] = useState<ReviewMember[]>([]);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Map<string, string>>(new Map());
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: accts }, { data: period }] = await Promise.all([
      supabase
        .from("chart_of_accounts" as any)
        .select("id,code")
        .in("code", ["2000", "5000", "5100"]),
      supabase
        .from("treasurer_periods" as any)
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const map = new Map<string, string>();
    for (const a of (accts as any[]) ?? []) if (a.code && a.id) map.set(a.code as string, a.id as string);
    setAccounts(map);
    setOpenPeriodId((period as any)?.id ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setRow = (key: RowKey, field: "rate" | "count", value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const subtotal = (r: Row) => {
    const rate = Math.round(parseFloat(r.rate || "0") * 100);
    const count = Math.round(parseFloat(r.count || "0"));
    if (!Number.isFinite(rate) || !Number.isFinite(count)) return 0;
    return rate * count;
  };

  const byKey = useMemo(() => {
    const m = new Map<RowKey, { row: Row; sub: number }>();
    for (const r of rows) m.set(r.key, { row: r, sub: subtotal(r) });
    return m;
  }, [rows]);

  const ugleTotal = (byKey.get("ugle_over")?.sub ?? 0) + (byKey.get("ugle_under")?.sub ?? 0);
  const pglTotal =
    (byKey.get("pgl_over")?.sub ?? 0) +
    (byKey.get("pgl_under")?.sub ?? 0) +
    (byKey.get("spcf")?.sub ?? 0) +
    (byKey.get("pgm")?.sub ?? 0);

  const suggest = async () => {
    setSuggesting(true);
    setReview([]);
    setSuggestNote(null);

    const yearEnd = `${year}-09-30`;
    const yearStart = `${year - 1}-10-01`; // return year end minus 1 year, plus 1 day

    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,first_name,last_name,status,status_changed_at,date_of_birth,is_honorary_member")
      .eq("is_honorary_member", false)
      .neq("status", "pending");

    if (error) {
      setSuggesting(false);
      toast({ title: "Could not load members", description: error.message, variant: "destructive" });
      return;
    }

    const NON_MEMBER = ["resigned", "suspended", "excluded", "deceased"];
    let over = 0;
    let under = 0;
    const needsReview: ReviewMember[] = [];

    for (const p of (data as any[]) ?? []) {
      const status = p.status as string;
      let chargeable = false;
      if (status === "active" || status === "year_out") {
        chargeable = true;
      } else if (NON_MEMBER.includes(status)) {
        if (!p.status_changed_at) {
          needsReview.push({
            id: p.id,
            name: p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id,
            status,
          });
          continue;
        }
        chargeable = (p.status_changed_at as string) >= yearStart;
      }
      if (!chargeable) continue;

      // Age as at the return year end (30 September). Unknown DOB → counted as 25+.
      let is25Plus = true;
      if (p.date_of_birth) {
        const dob = new Date(`${p.date_of_birth}T00:00:00Z`);
        const end = new Date(`${yearEnd}T00:00:00Z`);
        let age = end.getUTCFullYear() - dob.getUTCFullYear();
        const m = end.getUTCMonth() - dob.getUTCMonth();
        if (m < 0 || (m === 0 && end.getUTCDate() < dob.getUTCDate())) age--;
        is25Plus = age >= 25;
      }
      if (is25Plus) over++; else under++;
    }

    setRows((rs) =>
      rs.map((r) => {
        if (r.key === "ugle_over" || r.key === "pgl_over") return { ...r, count: String(over) };
        if (r.key === "ugle_under" || r.key === "pgl_under") return { ...r, count: String(under) };
        if (r.key === "spcf") return { ...r, count: String(over + under) };
        return r;
      }),
    );
    setReview(needsReview);
    setSuggestNote(`Suggested from members: ${over} aged 25 and over, ${under} under 25 (${over + under} chargeable).`);
    setSuggesting(false);
  };

  const postEntry = async (
    description: string,
    payee: string,
    expenseAccountId: string,
    creditorsId: string,
    pence: number,
    userId: string | null,
  ) => {
    const { data: entry, error: entryErr } = await supabase
      .from("journal_entries" as any)
      .insert({
        entry_date: `${year}-09-30`,
        description,
        source_type: "creditor_recognition",
        payee,
        period_id: openPeriodId,
        created_by: userId,
      })
      .select("id")
      .single();
    if (entryErr || !entry) throw new Error(entryErr?.message ?? "Could not create journal entry");

    const entryId = (entry as any).id as string;
    const { error: lineErr } = await supabase.from("journal_lines" as any).insert([
      { entry_id: entryId, account_id: expenseAccountId, debit_pence: pence, credit_pence: 0 },
      { entry_id: entryId, account_id: creditorsId, debit_pence: 0, credit_pence: pence },
    ]);
    if (lineErr) {
      await supabase.from("journal_entries" as any).delete().eq("id", entryId);
      throw new Error(lineErr.message);
    }
  };

  const post = async () => {
    if (ugleTotal <= 0 && pglTotal <= 0) {
      toast({ title: "Nothing to post", description: "Enter rates and counts first.", variant: "destructive" });
      return;
    }
    const creditors = accounts.get("2000");
    const ugleAcct = accounts.get("5000");
    const pglAcct = accounts.get("5100");
    if (!creditors || !ugleAcct || !pglAcct) {
      toast({ title: "Accounts 2000 / 5000 / 5100 not found", variant: "destructive" });
      return;
    }

    setPosting(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;

    const r = (k: RowKey) => byKey.get(k)!.row;
    const ugleDesc =
      `UGLE Annual Return — year ending 30 Sept ${year} — ` +
      `${r("ugle_over").count} @ £${r("ugle_over").rate} + ${r("ugle_under").count} @ £${r("ugle_under").rate}`;
    const pglDesc =
      `PGL Annual Return — year ending 30 Sept ${year} — ` +
      `${r("pgl_over").count} @ £${r("pgl_over").rate} + ${r("pgl_under").count} @ £${r("pgl_under").rate} + ` +
      `SPCF ${r("spcf").count} @ £${r("spcf").rate} + PGM's Fund ${r("pgm").count} @ £${r("pgm").rate}`;

    try {
      if (ugleTotal > 0) await postEntry(ugleDesc, "UGLE", ugleAcct, creditors, ugleTotal, uid);
      if (pglTotal > 0) await postEntry(pglDesc, "Provincial Grand Lodge", pglAcct, creditors, pglTotal, uid);
      toast({ title: "Annual Return posted to ledger" });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
    setPosting(false);
  };

  const years = Array.from({ length: 12 }, (_, i) => defaultReturnYear() + 1 - i);

  return (
    <section className="rounded-lg border-2 border-gold/40 bg-primary-foreground/[0.07] p-4">
      <h2 className="font-serif text-lg text-gold mb-1">UGLE &amp; PGL Annual Return Calculator</h2>
      <p className="text-primary-foreground/60 text-sm mb-4">
        Every rate and count is editable — fee schedules change. Posts two separate liabilities:
        Dr 5000 UGLE Fees / Cr 2000 Creditors, and Dr 5100 PGL Fees / Cr 2000 Creditors.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div>
          <Label>Return year ending 30 September</Label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={!canEdit}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {years.map((y) => <option key={y} value={y}>30 September {y}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" disabled={!canEdit || suggesting} onClick={suggest}>
            {suggesting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Suggest counts from members
          </Button>
        </div>
      </div>

      {suggestNote && (
        <p className="text-sm text-primary-foreground/70 mb-2">
          {suggestNote} This is a starting suggestion to review — not authoritative.
        </p>
      )}

      {review.length > 0 && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm text-primary-foreground mb-2">
            {review.length} member{review.length === 1 ? " has" : "s have"} an unknown status-change date and
            {review.length === 1 ? " was" : " were"} excluded from the suggestion — check these manually.
          </p>
          <ul className="text-sm text-primary-foreground/80 list-disc pl-5">
            {review.map((m) => <li key={m.id}>{m.name} — {m.status.replace("_", " ")}</li>)}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-primary-foreground/60 border-b border-gold/20">
              <th className="py-2">Line</th>
              <th className="py-2 w-32">Rate (£)</th>
              <th className="py-2 w-28">Count</th>
              <th className="py-2 text-right w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-gold/10">
                <td className="py-2 text-primary-foreground pr-3">{r.label}</td>
                <td className="py-2 pr-2">
                  <Input type="number" step="0.01" min="0" value={r.rate} disabled={!canEdit}
                    onChange={(e) => setRow(r.key, "rate", e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <Input type="number" step="1" min="0" value={r.count} disabled={!canEdit}
                    onChange={(e) => setRow(r.key, "count", e.target.value)} />
                </td>
                <td className="py-2 text-right text-primary-foreground">{money(subtotal(r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mt-4">
        <div className="rounded-md border border-gold/20 p-3">
          <p className="text-primary-foreground/60 text-sm">Total Due to UGLE</p>
          <p className="text-gold font-serif text-2xl">{money(ugleTotal)}</p>
        </div>
        <div className="rounded-md border border-gold/20 p-3">
          <p className="text-primary-foreground/60 text-sm">Total Due to PGL</p>
          <p className="text-gold font-serif text-2xl">{money(pglTotal)}</p>
        </div>
      </div>

      <div className="mt-4">
        <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || posting} onClick={post}>
          {posting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Post to Ledger
        </Button>
      </div>
    </section>
  );
}
