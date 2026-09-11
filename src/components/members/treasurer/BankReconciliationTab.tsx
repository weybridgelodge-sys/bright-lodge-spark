import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Check, X, FileDown, Zap } from "lucide-react";
import { saveJsPdf } from "@/lib/nativeDownload";
import {
  reportPdfDoc, reportSection, reportTable, fmtDate as fmtLong,
} from "@/lib/treasurer/reports";
import {
  BankLine, Suggestion, OutstandingBalance, BankLedgerLine,
  money, isBankCharge, isUnreconciled, buildSuggestions,
  fetchOutstandingCreditors, fetchOutstandingDebtors, fetchAccountMap, fetchOpenPeriodId,
  postEntry, markMatched, fetchBankLedgerLines, fetchBankNominalBalance,
} from "@/lib/treasurer/bankRecon";

type Statement = { id: string; period_label: string; file_name: string };

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function BankReconciliationTab({ canEdit }: { canEdit: boolean }) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [statementId, setStatementId] = useState<string>("");
  const [lines, setLines] = useState<BankLine[]>([]);
  const [debtors, setDebtors] = useState<OutstandingBalance[]>([]);
  const [creditors, setCreditors] = useState<OutstandingBalance[]>([]);
  const [ledger, setLedger] = useState<BankLedgerLine[]>([]);
  const [nominal, setNominal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bank_statements" as any)
        .select("id,period_label,file_name")
        .order("uploaded_at", { ascending: false });
      const rows = ((data as unknown as Statement[]) ?? []);
      setStatements(rows);
      setStatementId((prev) => prev || rows[0]?.id || "");
      if (!rows.length) setLoading(false);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!statementId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_statement_transactions" as any)
        .select("*")
        .eq("statement_id", statementId)
        .order("transaction_date", { ascending: true })
        .order("parse_order", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = ((data as unknown as BankLine[]) ?? []);
      setLines(rows);

      const dates = rows.map((r) => r.transaction_date).filter(Boolean) as string[];
      const from = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : new Date().toISOString().slice(0, 10);
      const to = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : from;

      const [d, c, l, n] = await Promise.all([
        fetchOutstandingDebtors(),
        fetchOutstandingCreditors(),
        fetchBankLedgerLines(from, to),
        fetchBankNominalBalance(to),
      ]);
      setDebtors(d);
      setCreditors(c);
      setLedger(l);
      setNominal(n);
    } catch (e: any) {
      toast({ title: "Could not load reconciliation data", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statementId]);

  useEffect(() => { load(); }, [load]);

  const charges = useMemo(() => lines.filter((l) => isUnreconciled(l) && isBankCharge(l)), [lines]);
  const suggestions = useMemo(() => buildSuggestions(lines, debtors, creditors), [lines, debtors, creditors]);
  const suggestedIds = useMemo(() => new Set(suggestions.map((s) => s.line.id)), [suggestions]);
  const unmatched = useMemo(
    () => lines.filter((l) => isUnreconciled(l) && !isBankCharge(l) && !suggestedIds.has(l.id)),
    [lines, suggestedIds],
  );
  const matched = useMemo(() => lines.filter((l) => !isUnreconciled(l)), [lines]);

  const period = useMemo(() => {
    const dates = lines.map((l) => l.transaction_date).filter(Boolean) as string[];
    if (!dates.length) return null;
    return {
      from: dates.reduce((a, b) => (a < b ? a : b)),
      to: dates.reduce((a, b) => (a > b ? a : b)),
    };
  }, [lines]);

  /** Statement closing balance — sum of its own transactions (no balance column captured in QIF). */
  const statementClosing = useMemo(() => lines.reduce((s, l) => s + l.amount_pence, 0), [lines]);

  const matchedEntryIds = useMemo(
    () => new Set(lines.map((l) => l.matched_entry_id).filter(Boolean) as string[]),
    [lines],
  );
  const unmatchedLedgerReceipts = useMemo(
    () => ledger.filter((l) => l.debit_pence > 0 && !matchedEntryIds.has(l.entry_id)),
    [ledger, matchedEntryIds],
  );
  const unmatchedLedgerPayments = useMemo(
    () => ledger.filter((l) => l.credit_pence > 0 && !matchedEntryIds.has(l.entry_id)),
    [ledger, matchedEntryIds],
  );
  const addTotal = unmatchedLedgerReceipts.reduce((s, l) => s + l.debit_pence, 0);
  const lessTotal = unmatchedLedgerPayments.reduce((s, l) => s + l.credit_pence, 0);
  const adjusted = statementClosing + addTotal - lessTotal;
  const balanced = adjusted === nominal;

  // ---- 1. Bank charges: silent auto-post -------------------------------------
  const postCharges = async () => {
    if (!charges.length) return;
    setBusy("charges");
    try {
      const accounts = await fetchAccountMap(["1000", "5410"]);
      const bank = accounts.get("1000");
      const chargeAcct = accounts.get("5410");
      if (!bank || !chargeAcct) throw new Error("Accounts 1000 / 5410 not found.");
      const periodId = await fetchOpenPeriodId();
      let done = 0;
      for (const l of charges) {
        const pence = Math.abs(l.amount_pence);
        if (pence <= 0) continue;
        const date = l.transaction_date ?? new Date().toISOString().slice(0, 10);
        const desc = (l.description ?? "Bank charge").trim();
        const { entryId, lineIds } = await postEntry(
          { entry_date: date, description: `Bank charge — ${desc}`, source_type: "bank_charge", period_id: periodId },
          [
            { account_id: chargeAcct, debit_pence: pence, credit_pence: 0, description: desc },
            { account_id: bank, debit_pence: 0, credit_pence: pence, description: desc },
          ],
        );
        await markMatched(l.id, "bank_charge", entryId, lineIds[1] ?? null);
        done += 1;
      }
      toast({ title: `${done} bank charge${done === 1 ? "" : "s"} posted` });
      await load();
    } catch (e: any) {
      toast({ title: "Could not post bank charges", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // ---- 3. Suggested matches: confirm / reject --------------------------------
  const confirm = async (s: Suggestion) => {
    setBusy(s.line.id);
    try {
      const accounts = await fetchAccountMap(["1000", "1100", "2000"]);
      const bank = accounts.get("1000");
      const periodId = await fetchOpenPeriodId();
      const date = s.line.transaction_date ?? new Date().toISOString().slice(0, 10);
      const pence = Math.abs(s.line.amount_pence);
      if (!bank) throw new Error("Account 1000 not found.");

      let entryId: string;
      let bankLineId: string | null;

      if (s.kind === "subscription") {
        const debtors1100 = accounts.get("1100");
        if (!debtors1100) throw new Error("Account 1100 not found.");
        const r = await postEntry(
          {
            entry_date: date,
            description: `Subscription received — ${s.target.key}`,
            source_type: "bank_reconciliation",
            period_id: periodId,
          },
          [
            { account_id: bank, debit_pence: pence, credit_pence: 0, description: s.target.key },
            { account_id: debtors1100, debit_pence: 0, credit_pence: pence, description: s.target.key },
          ],
        );
        entryId = r.entryId; bankLineId = r.lineIds[0] ?? null;
      } else {
        const creditors2000 = accounts.get("2000");
        if (!creditors2000) throw new Error("Account 2000 not found.");
        const r = await postEntry(
          {
            entry_date: date,
            description: `Payment to ${s.target.key} — bank reconciliation`,
            source_type: "bank_reconciliation",
            payee: s.target.key,
            period_id: periodId,
          },
          [
            { account_id: creditors2000, debit_pence: pence, credit_pence: 0, description: s.target.key },
            { account_id: bank, debit_pence: 0, credit_pence: pence, description: s.target.key },
          ],
        );
        entryId = r.entryId; bankLineId = r.lineIds[1] ?? null;
      }

      await markMatched(s.line.id, s.kind === "subscription" ? "subscription" : "creditor", entryId, bankLineId);
      toast({ title: "Match confirmed and posted" });
      await load();
    } catch (e: any) {
      toast({ title: "Could not post the settlement", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const reject = async (s: Suggestion) => {
    setBusy(s.line.id);
    const { error } = await supabase
      .from("bank_statement_transactions" as any)
      .update({ match_rejected: true })
      .eq("id", s.line.id);
    setBusy(null);
    if (error) { toast({ title: "Could not reject", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Suggestion rejected — left for manual handling" });
    await load();
  };

  // ---- 4. Branded PDF report -------------------------------------------------
  const exportPdf = async () => {
    const stmt = statements.find((s) => s.id === statementId);
    const periodLine = period
      ? `${fmtLong(period.from)} – ${fmtLong(period.to)}`
      : (stmt?.period_label ?? "");
    const { doc, pageW, margin } = await reportPdfDoc("Bank Reconciliation", periodLine);
    let y = 140;

    y = reportSection(doc, pageW, margin, y, `Statement — ${stmt?.period_label ?? ""}`);
    y = reportTable(doc, margin, y,
      [["", "", "Amount"]],
      [
        ["Bank statement closing balance", "", money(statementClosing)],
        [`Add: ledger receipts not on the statement (${unmatchedLedgerReceipts.length})`, "", money(addTotal)],
        [`Less: ledger payments not on the statement (${unmatchedLedgerPayments.length})`, "", `(${money(lessTotal)})`],
        ["Adjusted balance", "", money(adjusted)],
        [`1000 Bank nominal balance as at ${period ? fmtLong(period.to) : "date"}`, "", money(nominal)],
        [balanced ? "BALANCED" : "OUT OF BALANCE", "", money(adjusted - nominal)],
      ],
    );

    if (unmatchedLedgerReceipts.length || unmatchedLedgerPayments.length) {
      y = reportSection(doc, pageW, margin, y, "Unpresented ledger items");
      y = reportTable(doc, margin, y,
        [["Date", "Description", "Amount"]],
        [
          ...unmatchedLedgerReceipts.map((l) => [fmtDate(l.entry_date), l.description ?? "—", money(l.debit_pence)]),
          ...unmatchedLedgerPayments.map((l) => [fmtDate(l.entry_date), l.description ?? "—", `(${money(l.credit_pence)})`]),
        ],
      );
    }

    const remaining = lines.filter((l) => isUnreconciled(l));
    if (remaining.length) {
      reportSection(doc, pageW, margin, y, "Bank lines still unreconciled");
      reportTable(doc, margin, y + 0,
        [["Date", "Description", "Amount"]],
        remaining.map((l) => [fmtDate(l.transaction_date), l.description ?? "—", money(l.amount_pence)]),
      );
    }

    await saveJsPdf(doc, `bank-reconciliation-${(stmt?.period_label ?? "statement").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  };

  if (!statements.length && !loading) {
    return <p className="text-primary-foreground/60 italic">Upload a statement in the Bank Statement Repository first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <Label>Statement</Label>
        <Select value={statementId} onValueChange={setStatementId}>
          <SelectTrigger><SelectValue placeholder="Choose a statement" /></SelectTrigger>
          <SelectContent>
            {statements.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.period_label} — {s.file_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
      ) : (
        <>
          {/* 1. Bank charges */}
          <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
            <h2 className="font-serif text-lg text-gold mb-1">Bank charges</h2>
            <p className="text-primary-foreground/60 text-sm mb-3">
              Posted automatically as Dr 5410 Bank Charges / Cr 1000 Bank, dated to the statement line.
            </p>
            {charges.length === 0 ? (
              <p className="text-primary-foreground/60 text-sm italic">No unposted bank charges on this statement.</p>
            ) : (
              <>
                <ul className="text-sm mb-3 space-y-1">
                  {charges.map((c) => (
                    <li key={c.id} className="text-primary-foreground">
                      {fmtDate(c.transaction_date)} · {c.description} · <span className="text-red-300">{money(c.amount_pence)}</span>
                    </li>
                  ))}
                </ul>
                <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || busy === "charges"} onClick={postCharges}>
                  {busy === "charges" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                  Post {charges.length} bank charge{charges.length === 1 ? "" : "s"}
                </Button>
              </>
            )}
          </section>

          {/* 3. Suggested matches */}
          <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
            <h2 className="font-serif text-lg text-gold mb-1">Suggested matches</h2>
            <p className="text-primary-foreground/60 text-sm mb-3">
              Nothing is posted until you confirm. Rejecting leaves the line for manual handling.
            </p>
            {suggestions.length === 0 ? (
              <p className="text-primary-foreground/60 text-sm italic">No suggestions for this statement.</p>
            ) : (
              <ul className="space-y-2">
                {suggestions.map((s) => (
                  <li key={s.line.id} className="flex flex-wrap items-center gap-2 border-b border-gold/10 pb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-primary-foreground text-sm">
                        {fmtDate(s.line.transaction_date)} · {s.line.description} · {money(s.line.amount_pence)}
                      </p>
                      <p className="text-gold/80 text-xs">{s.label}</p>
                    </div>
                    <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || busy === s.line.id} onClick={() => confirm(s)}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Confirm
                    </Button>
                    <Button size="sm" variant="outline" disabled={!canEdit || busy === s.line.id} onClick={() => reject(s)}>
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Unmatched */}
          <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
            <h2 className="font-serif text-lg text-gold mb-3">Unmatched bank lines ({unmatched.length})</h2>
            {unmatched.length === 0 ? (
              <p className="text-primary-foreground/60 text-sm italic">Nothing outstanding.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {unmatched.map((l) => (
                  <li key={l.id} className="text-primary-foreground/85">
                    {fmtDate(l.transaction_date)} · {l.description} · {money(l.amount_pence)}
                    {l.match_rejected && <span className="text-amber-300 text-xs"> · suggestion rejected</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4. Report */}
          <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-serif text-lg text-gold">Bank Reconciliation Report</h2>
              <Button variant="outline" onClick={exportPdf}>
                <FileDown className="w-4 h-4 mr-1" /> Export PDF
              </Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gold/10">
                  <td className="py-2 text-primary-foreground/80">Bank statement closing balance</td>
                  <td className="py-2 text-right text-primary-foreground tabular-nums">{money(statementClosing)}</td>
                </tr>
                <tr className="border-b border-gold/10">
                  <td className="py-2 text-primary-foreground/80">Add: ledger receipts with no bank line ({unmatchedLedgerReceipts.length})</td>
                  <td className="py-2 text-right text-primary-foreground tabular-nums">{money(addTotal)}</td>
                </tr>
                <tr className="border-b border-gold/10">
                  <td className="py-2 text-primary-foreground/80">Less: ledger payments with no bank line ({unmatchedLedgerPayments.length})</td>
                  <td className="py-2 text-right text-primary-foreground tabular-nums">({money(lessTotal)})</td>
                </tr>
                <tr className="border-b border-gold/20">
                  <td className="py-2 text-gold">Adjusted balance</td>
                  <td className="py-2 text-right text-gold font-semibold tabular-nums">{money(adjusted)}</td>
                </tr>
                <tr className="border-b border-gold/10">
                  <td className="py-2 text-primary-foreground/80">1000 Bank nominal balance{period ? ` as at ${fmtDate(period.to)}` : ""}</td>
                  <td className="py-2 text-right text-primary-foreground tabular-nums">{money(nominal)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-primary-foreground/80">Difference</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${balanced ? "text-emerald-300" : "text-red-300"}`}>
                    {balanced ? "Balanced" : money(adjusted - nominal)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-primary-foreground/50 text-xs mt-2">
              {matched.length} of {lines.length} statement lines reconciled. This report posts nothing.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
