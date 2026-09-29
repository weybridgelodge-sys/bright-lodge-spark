import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, CalendarCheck, Scale, TrendingUp, Send, History, Download, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveJsPdf, saveBlob } from "@/lib/nativeDownload";
import { frozenRemarks } from "@/lib/treasurer/accountsPack";
import { acct, fetchAccounts, fetchLedgerLines, fetchMovements, fetchReportCalendar, fmtDate, money, signedBalance } from "@/lib/treasurer/reports";
import { formatEntryNumber } from "@/lib/treasurer/entryNumber";
import { buildClosingJournal, canCloseYear, FUND_CODE, fyLabel, yearEndDate, yearEndYears } from "@/lib/treasurer/yearEnd";
import EntryDrilldown from "./EntryDrilldown";
import YearSnapshotView from "./YearSnapshotView";
import { accountsDistributionStatus, accountsTargetLabel, AUDITOR_LABEL, AUDITOR_ROLES, STATUS_LABEL, canClose, canSubmit, statusOf, type Approval, type AuditStatus, type Round, type Signoff } from "@/lib/treasurer/yearAudit";

const STATUS_STYLE: Record<AuditStatus, string> = {
  draft: "border-primary-foreground/30 text-primary-foreground/80",
  submitted: "border-sky-400/60 text-sky-300",
  query: "border-amber-400/70 text-amber-300",
  approved: "border-emerald-400/70 text-emerald-300",
};

type Closed = { id: string; entry_number: number; entry_date: string; fund: number };
type Draft = ReturnType<typeof buildClosingJournal>;

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

export default function YearEndTab({ canEdit, onOpenTab }: { canEdit: boolean; onOpenTab: (tab: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<number[]>([]);
  const [closed, setClosed] = useState<Map<number, Closed>>(new Map());
  const [fundBf, setFundBf] = useState<Map<number, number>>(new Map());
  const [draft, setDraft] = useState<{ year: number; j: Draft } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const today = londonToday();
  const [approvals, setApprovals] = useState<Map<number, Approval>>(new Map());
  const [summonsNos, setSummonsNos] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const ids = [...approvals.values()].map((a) => a.accounts_sent_with_summons_id).filter(Boolean) as string[];
    if (!ids.length) return;
    supabase.from("summonses").select("id,meeting_number").in("id", ids).then(({ data }) =>
      setSummonsNos(new Map((data ?? []).map((r: any) => [r.id, r.meeting_number]))));
  }, [approvals]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [sigs, setSigs] = useState<Signoff[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [history, setHistory] = useState<number | null>(null);
  const [snapView, setSnapView] = useState<Round | null>(null);
  const [remarks, setRemarks] = useState<Map<number, string>>(new Map());
  const [savingRemarks, setSavingRemarks] = useState<number | null>(null);
  const [packBusy, setPackBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cal, ps, es, accts] = await Promise.all([
        fetchReportCalendar(),
        supabase.from("treasurer_periods" as any).select("id,masonic_year").eq("period_type", "closing"),
        supabase.from("journal_entries" as any).select("id,entry_number,entry_date,period_id,journal_lines(debit_pence,credit_pence,chart_of_accounts(code))").eq("source_type", "year_close"),
        fetchAccounts(),
      ]);
      if (ps.error) throw ps.error;
      if (es.error) throw es.error;
      const yearOf = new Map(((ps.data as any[]) ?? []).map((p) => [p.id, p.masonic_year as number]));
      const m = new Map<number, Closed>();
      for (const e of (es.data as any[]) ?? []) {
        const y = yearOf.get(e.period_id);
        if (y == null) continue;
        const fund = (e.journal_lines ?? []).filter((l: any) => l.chart_of_accounts?.code === FUND_CODE)
          .reduce((s: number, l: any) => s + Number(l.credit_pence) - Number(l.debit_pence), 0);
        m.set(y, { id: e.id, entry_number: e.entry_number, entry_date: e.entry_date, fund });
      }
      const ys = yearEndYears(cal.dates, today);
      // General Fund before each closed year's closing journal (all entries to 30 Sep).
      const fundAcct = accts.find((a) => a.code === FUND_CODE);
      const bf = new Map<number, number>();
      if (fundAcct) {
        await Promise.all([...m.keys()].map(async (y) => {
          const mv = await fetchMovements(null, yearEndDate(y));
          bf.set(y, signedBalance("equity", mv.get(fundAcct.id)));
        }));
      }
      const [ap, rd, sg] = await Promise.all([
        supabase.from("treasurer_year_approvals" as any).select("*"),
        supabase.from("treasurer_year_approval_rounds" as any).select("*").order("round_number", { ascending: false }),
        supabase.from("treasurer_year_signoffs" as any).select("*").order("signed_at"),
      ]);
      const apList = ((ap.data as any[]) ?? []) as Approval[];
      const sgList = ((sg.data as any[]) ?? []) as Signoff[];
      const rdList = ((rd.data as any[]) ?? []) as Round[];
      const people = [...new Set([...sgList.map((x) => x.signed_by), ...rdList.map((x) => x.submitted_by).filter(Boolean) as string[]])];
      const nm = new Map<string, string>();
      if (people.length) {
        const { data: pr } = await supabase.from("profiles").select("id,full_name").in("id", people);
        for (const p of (pr as any[]) ?? []) nm.set(p.id, p.full_name ?? "");
      }
      setRemarks(new Map(apList.map((a) => [a.masonic_year, a.treasurer_remarks ?? ""])));
      if (canEdit) {
        // Safety net: an approved year without a stored certified pack gets one now.
        for (const a of apList.filter((x) => x.status === "approved" && !x.certified_pack_path)) {
          import("@/lib/treasurer/accountsPackPdf").then((m) => m.storeCertifiedPack(a.masonic_year)).catch(() => {});
        }
      }
      setApprovals(new Map(apList.map((a) => [a.masonic_year, a]))); setRounds(rdList); setSigs(sgList); setNames(nm);
      setYears(ys); setClosed(m); setFundBf(bf);
    } catch (e: any) {
      toast({ title: "Could not load Year End", description: e?.message, variant: "destructive" });
    }
    setLoading(false);
  }, [today, canEdit]);

  useEffect(() => { load(); }, [load]);

  const preview = async (year: number) => {
    setBusy(year);
    try {
      const [accts, lines] = await Promise.all([fetchAccounts(), fetchLedgerLines(yearEndDate(year))]);
      setDraft({ year, j: buildClosingJournal(accts, lines, year) });
    } catch (e: any) {
      toast({ title: "Could not build closing journal", description: e?.message, variant: "destructive" });
    }
    setBusy(null);
  };

  const submit = async (year: number) => {
    setSubmitting(year);
    const { data, error } = await supabase.rpc("submit_year_for_audit" as any, { _year: year } as any);
    setSubmitting(null);
    if (error) { toast({ title: "Not submitted", description: error.message, variant: "destructive" }); return; }
    supabase.functions.invoke("notify-year-audit", { body: { approval_id: data } }).catch(() => {});
    toast({ title: `${fyLabel(year)} submitted for audit review`, description: "Figures snapshotted; Auditor 1 and Auditor 2 have been emailed." });
    load();
  };
  const saveRemarks = async (year: number) => {
    setSavingRemarks(year);
    const { error } = await supabase.rpc("save_year_remarks" as any, { _year: year, _remarks: remarks.get(year) ?? "" } as any);
    setSavingRemarks(null);
    if (error) { toast({ title: "Remarks not saved", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Treasurer's Remarks saved" });
    load();
  };

  const downloadPack = async (year: number) => {
    setPackBusy(year);
    try {
      const a = approvals.get(year);
      const name = `weybridge-annual-accounts-${year}-${year + 1}`;
      if (a?.status === "approved" && a.certified_pack_path) {
        const { data, error } = await supabase.storage.from("lodge-docs").download(a.certified_pack_path);
        if (error) throw error;
        await saveBlob(data, `${name}-certified.pdf`);
      } else {
        const m = await import("@/lib/treasurer/accountsPackPdf");
        const { doc, src } = await m.generateAccountsPack(year);
        await saveJsPdf(doc, `${name}${src.draft ? "-DRAFT" : "-certified"}.pdf`);
      }
    } catch (e: any) {
      toast({ title: "Could not create accounts pack", description: e?.message, variant: "destructive" });
    }
    setPackBusy(null);
  };

  const who = (id: string | null) => (id && names.get(id)) || "Unknown";

  const post = async () => {
    if (!draft) return;
    setPosting(true);
    const { error } = await supabase.rpc("post_year_close" as any, { _year: draft.year, _expected_net: draft.j.surplus } as any);
    setPosting(false);
    if (error) { toast({ title: "Closing journal not posted", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${fyLabel(draft.year)} closed`, description: "Closing journal posted and the closing period locked." });
    setDraft(null);
    load();
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">Year End</h2>
        <p className="text-primary-foreground/60 text-sm font-sans">
          The closing journal only sets next year's opening General Fund (3000): it moves the year's income and
          expenditure into the fund, dated 1 October, in that year's own closing period, which is then locked.
          Reports read live figures, so you can review the accounts before closing.
        </p>
      </section>

      {loading ? (
        <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
      ) : (
        <ul className="space-y-3">
          {years.map((y) => {
            const c = closed.get(y);
            const guard = canCloseYear(y, today, !!c);
            return (
              <li key={y} className="min-w-0 rounded-lg border border-gold/20 bg-navy-light/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-gold">{fyLabel(y)}</h3>
                    <p className="text-xs text-primary-foreground/60">1 Oct {y} – 30 Sep {y + 1}</p>
                  </div>
                  {c
                    ? <Badge variant="outline" className="border-gold/60 text-gold"><Lock className="w-3 h-3 mr-1" />Closed</Badge>
                    : <Badge variant="outline" className={`max-w-full whitespace-normal text-center ${STATUS_STYLE[statusOf(approvals.get(y))]}`}>Not closed · {STATUS_LABEL[statusOf(approvals.get(y))]}</Badge>}
                </div>

                {c ? (
                  <div className="space-y-2 text-sm font-sans">
                    {approvals.get(y)?.status === "approved" && <AccountsSentNote year={y} a={approvals.get(y)!} today={today} summonsNo={summonsNos} />}
                    <Button variant="outline" className="min-h-[48px] w-full whitespace-normal sm:w-auto" onClick={() => setEntryId(c.id)} aria-label={`Open closing journal ${formatEntryNumber(c.entry_number)}`}>
                      Closing journal {formatEntryNumber(c.entry_number)} · {fmtDate(c.entry_date)}
                    </Button>
                    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 max-w-md">
                      <dt className="text-primary-foreground/70">General Fund at 30 Sep {y + 1}</dt>
                      <dd className="text-right tabular-nums">{acct(fundBf.get(y) ?? 0)}</dd>
                      <dt className="text-primary-foreground/70">{c.fund >= 0 ? "Surplus" : "Deficit"} transferred</dt>
                      <dd className="text-right tabular-nums">{acct(c.fund)}</dd>
                      <dt className="text-gold">Opening General Fund 1 Oct {y + 1}</dt>
                      <dd className="text-right tabular-nums text-gold">{acct((fundBf.get(y) ?? 0) + c.fund)}</dd>
                    </dl>
                  </div>
) : (
                  <div className="space-y-3">
                    {(() => {
                      const a = approvals.get(y);
                      const st = statusOf(a);
                      const round = a ? sigs.filter((x) => x.approval_id === a.id && x.round_number === a.round_number) : [];
                      const q = round.find((x) => x.decision === "query");
                      return (
                        <div className="space-y-2 text-sm font-sans">
                          {st === "submitted" && a && (
                            <p className="break-words text-primary-foreground/80">
                              Round {a.round_number} submitted {a.submitted_at ? fmtDate(a.submitted_at.slice(0, 10)) : ""}.{" "}
                              {AUDITOR_ROLES.map((r) => {
                                const sg = round.find((x) => x.officer_role === r);
                                return `${AUDITOR_LABEL[r]}: ${sg ? `confirmed by ${who(sg.signed_by)}` : "awaiting"}`;
                              }).join(" · ")}
                            </p>
                          )}
                          {st === "query" && q && (
                            <div className="rounded border border-amber-400/50 bg-amber-400/10 p-3">
                              <p className="break-words font-semibold text-amber-300">Query from {who(q.signed_by)} ({AUDITOR_LABEL[q.officer_role]}) · {fmtDate(q.signed_at.slice(0, 10))}</p>
                              <p className="mt-1 whitespace-pre-wrap break-words">{q.note}</p>
                              <p className="mt-1 text-xs text-primary-foreground/60">Make any corrections as normal (e.g. General Journal), then resubmit.</p>
                            </div>
                          )}
                          {st === "approved" && (
                            <ul className="break-words text-emerald-300">
                              {round.filter((x) => x.decision === "confirmed").map((x) => (
                                <li key={x.id}>{AUDITOR_LABEL[x.officer_role]}: {who(x.signed_by)} · confirmed {fmtDate(x.signed_at.slice(0, 10))}</li>
                              ))}
                            </ul>
                          )}
                          {st === "approved" && a && <AccountsSentNote year={y} a={a} today={today} summonsNo={summonsNos} />}
                        </div>
                      );
                    })()}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button variant="outline" className="min-h-[48px] w-full whitespace-normal sm:w-auto" onClick={() => onOpenTab("balance-sheet")}>
                        <Scale className="w-4 h-4 mr-1" /> Review Balance Sheet
                      </Button>
                      <Button variant="outline" className="min-h-[48px] w-full whitespace-normal sm:w-auto" onClick={() => onOpenTab("income-expenditure")}>
                        <TrendingUp className="w-4 h-4 mr-1" /> Review Income &amp; Expenditure
                      </Button>
                      {canEdit && canSubmit(statusOf(approvals.get(y))) && (
                        <Button className="min-h-[48px] w-full whitespace-normal bg-gold text-navy hover:bg-gold/90 sm:w-auto" disabled={submitting === y} onClick={() => submit(y)}>
                          {submitting === y ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                          {statusOf(approvals.get(y)) === "query" ? "Resubmit for audit review" : "Submit for audit review"}
                        </Button>
                      )}
                      {canEdit && guard.ok && canClose(statusOf(approvals.get(y))) && (
                        <Button className="min-h-[48px] w-full whitespace-normal bg-gold text-navy hover:bg-gold/90 sm:w-auto" disabled={busy === y} onClick={() => preview(y)}>
                          {busy === y ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarCheck className="w-4 h-4 mr-1" />}
                          Close {fyLabel(y)}
                        </Button>
                      )}
                    </div>
                    {!guard.ok && "reason" in guard && <p className="text-xs text-primary-foreground/60">{guard.reason}</p>}
                    {guard.ok && !canClose(statusOf(approvals.get(y))) && (
                      <p className="text-xs text-primary-foreground/60">Closing becomes available once both auditors have approved the accounts.</p>
                    )}
                  </div>
                )}
                {(() => {
                  const a = approvals.get(y);
                  const st = statusOf(a);
                  const frozen = frozenRemarks(a, rounds);
                  return (
                    <div className="space-y-2 text-sm font-sans">
                      {st !== "draft" && (
                        <div className="rounded border border-gold/20 p-3">
                          <p className="text-xs text-gold mb-1">Treasurer's Remarks as submitted · round {a?.round_number}</p>
                          <p className="whitespace-pre-wrap break-words text-primary-foreground/80">{frozen || "No remarks were included in this round."}</p>
                        </div>
                      )}
                      {canEdit && !c && (
                        <div className="space-y-1">
                          <Label htmlFor={`remarks-${y}`} className="text-primary-foreground/80">
                            Treasurer's Remarks{st !== "draft" ? " (draft for the next submission)" : ""}
                          </Label>
                          <Textarea id={`remarks-${y}`} rows={5} value={remarks.get(y) ?? ""}
                            onChange={(e) => setRemarks((m) => new Map(m).set(y, e.target.value))}
                             placeholder="Notes to the accounts: explain exceptions, one-off items and anything that would look odd unexplained, e.g. a deferred-income release or a re-dated levy." />
                          <p className="text-xs text-primary-foreground/60">Printed in the accounts pack and frozen with the figures each time you submit for audit review.</p>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {canEdit && !c && (
                          <Button variant="outline" className="min-h-[48px] w-full whitespace-normal sm:w-auto" disabled={savingRemarks === y} onClick={() => saveRemarks(y)}>
                            {savingRemarks === y ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save remarks
                          </Button>
                        )}
                        <Button variant="outline" className="min-h-[48px] w-full whitespace-normal sm:w-auto" disabled={packBusy === y} onClick={() => downloadPack(y)}>
                          {packBusy === y ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                          Download accounts pack{st === "approved" ? " (certified)" : " (draft)"}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const a = approvals.get(y);
                  const rs = a ? rounds.filter((r) => r.approval_id === a.id) : [];
                  if (!rs.length) return null;
                  return (
                    <div>
                      <Button variant="ghost" className="min-h-[48px] max-w-full whitespace-normal text-gold px-2" onClick={() => setHistory(history === y ? null : y)} aria-expanded={history === y}>
                        <History className="w-4 h-4 mr-1" /> Review history ({rs.length} round{rs.length > 1 ? "s" : ""})
                      </Button>
                      {history === y && (
                        <ol className="space-y-2 text-xs font-sans mt-1">
                          {rs.map((r) => (
                            <li key={r.id} className="min-w-0 break-words rounded border border-gold/15 p-2">
                              <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                <span className="min-w-0 break-words text-primary-foreground/80">
                                  Round {r.round_number} · submitted {fmtDate(r.submitted_at.slice(0, 10))} by {who(r.submitted_by)} ·{" "}
                                  {r.outcome === "approved" ? "Approved" : r.outcome === "query" ? "Query raised" : "Awaiting sign-off"}
                                </span>
                                <Button variant="outline" size="sm" className="min-h-[40px] w-full sm:w-auto" onClick={() => setSnapView(r)}>View snapshot</Button>
                              </div>
                              <ul className="mt-1 space-y-0.5">
                                {sigs.filter((x) => x.approval_id === r.approval_id && x.round_number === r.round_number).map((x) => (
                                  <li className="break-words" key={x.id}>
                                    {AUDITOR_LABEL[x.officer_role]} ({who(x.signed_by)}) · {x.decision === "confirmed" ? "confirmed" : "query"} · {fmtDate(x.signed_at.slice(0, 10))}
                                    {x.note ? <span className="text-primary-foreground/60"> — {x.note}</span> : null}
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!draft} onOpenChange={(v) => { if (!v && !posting) setDraft(null); }}>
        <DialogContent className="bg-navy-light text-primary-foreground border-gold/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-gold">Close {fyLabel(draft.year)} — preview</DialogTitle>
                <DialogDescription className="text-primary-foreground/70 font-sans">
                  Dated {fmtDate(draft.j.entryDate)} in “{draft.j.periodLabel}”, which locks straight after posting.
                  Nothing is posted until you confirm.
                </DialogDescription>
              </DialogHeader>
              {draft.j.fundMissing && <p className="text-sm text-destructive">Account 3000 General Fund is missing from the chart of accounts.</p>}
              {draft.j.lines.length === 0 ? (
                <p className="text-sm text-primary-foreground/70">No income or expenditure to close for this year.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-sans">
                    <thead><tr className="text-primary-foreground/60 border-b border-gold/20">
                      <th className="text-left py-2 font-normal">Account</th>
                      <th className="text-right py-2 font-normal">Debit</th>
                      <th className="text-right py-2 font-normal">Credit</th>
                    </tr></thead>
                    <tbody>
                      {draft.j.lines.map((l) => (
                        <tr key={l.account.id} className={`border-b border-gold/10 ${l.account.code === FUND_CODE ? "text-gold" : ""}`}>
                          <td className="py-2">{l.account.code} — {l.account.name}</td>
                          <td className="py-2 text-right tabular-nums">{l.debit ? money(l.debit) : ""}</td>
                          <td className="py-2 text-right tabular-nums">{l.credit ? money(l.credit) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="font-semibold">
                      <td className="py-2">Total {draft.j.balanced ? "✓ balanced" : "✗ unbalanced"}</td>
                      <td className="py-2 text-right tabular-nums">{money(draft.j.debit)}</td>
                      <td className="py-2 text-right tabular-nums">{money(draft.j.credit)}</td>
                    </tr></tfoot>
                  </table>
                  <p className="mt-2 text-sm">{draft.j.surplus >= 0 ? "Surplus" : "Deficit"} for the year: <strong>{acct(draft.j.surplus)}</strong></p>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" className="min-h-[48px]" disabled={posting} onClick={() => setDraft(null)}>Cancel</Button>
                <Button className="min-h-[48px] bg-gold text-navy hover:bg-gold/90"
                  disabled={posting || !draft.j.balanced || draft.j.lines.length === 0 || draft.j.fundMissing}
                  onClick={post}>
                  {posting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Post closing journal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!snapView} onOpenChange={(v) => { if (!v) setSnapView(null); }}>
        <DialogContent className="bg-navy-light text-primary-foreground border-gold/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          {snapView && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-gold">{fyLabel(snapView.figures_snapshot.masonic_year)} — round {snapView.round_number} snapshot</DialogTitle>
                <DialogDescription className="text-primary-foreground/70 font-sans">Figures as submitted for audit review.</DialogDescription>
              </DialogHeader>
              <YearSnapshotView snap={snapView.figures_snapshot} round={snapView.round_number} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <EntryDrilldown entryId={entryId} onClose={() => setEntryId(null)} />
    </div>
  );
}

function AccountsSentNote({ year, a, today, summonsNo }: { year: number; a: Approval; today: string; summonsNo: Map<string, number> }) {
  const st = accountsDistributionStatus(year, a.accounts_sent_at, today);
  if (st === "sent") {
    const n = a.accounts_sent_with_summons_id ? summonsNo.get(a.accounts_sent_with_summons_id) : undefined;
    return <p className="break-words text-emerald-300">Accounts sent to members{n ? ` with Summons #${n}` : " with a summons"} on {fmtDate(a.accounts_sent_at!.slice(0, 10))}.</p>;
  }
  if (st === "past_may") return (
    <p className="rounded border border-red-400/60 bg-red-400/10 p-2 text-red-300">Accounts not yet sent to members — now past the May meeting (target was the {accountsTargetLabel(year)}). Please attach them to the next summons.</p>
  );
  if (st === "past_feb") return (
    <p className="rounded border border-amber-400/50 bg-amber-400/10 p-2 text-amber-300">Accounts not yet sent to members — the {accountsTargetLabel(year)} target has passed. Attach them to the next summons.</p>
  );
  return <p className="text-primary-foreground/70">Accounts not yet sent to members · target: {accountsTargetLabel(year)}. Attach them in the Summons Builder.</p>;
}
