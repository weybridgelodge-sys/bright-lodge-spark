import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight, Loader2, Paperclip, Check, X } from "lucide-react";
import { fmtDate, money } from "@/lib/treasurer/reports";
import { formatEntryNumber } from "@/lib/treasurer/entryNumber";
import { sourceTypeLabel, summarizeEntryLines } from "@/lib/treasurer/entryDrilldown";

type Props = {
  entryId: string | null;
  highlightLineId?: string | null;
  onClose: () => void;
  onNavigate?: (entryId: string) => void;
};

type Loaded = {
  entry: any;
  period: any | null;
  creator: string;
  lines: { id: string; code: string; name: string; description: string; debit: number; credit: number }[];
  bankRows: any[];
  links: string[];
  prevId: string | null;
  nextId: string | null;
};

async function loadEntry(entryId: string): Promise<Loaded> {
  const { data: entry, error } = await supabase.from("journal_entries" as any).select("*").eq("id", entryId).maybeSingle();
  if (error) throw error;
  if (!entry) throw new Error("Entry not found");
  const e: any = entry;
  const [linesRes, periodRes, bankByEntry, payouts, dining, bookings, collections, donations, prev, next, creator] = await Promise.all([
    supabase.from("journal_lines" as any).select("id,description,debit_pence,credit_pence,chart_of_accounts(code,name)").eq("entry_id", entryId),
    e.period_id ? supabase.from("treasurer_periods" as any).select("label,status").eq("id", e.period_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("bank_statement_transactions" as any).select("id,statement_id,transaction_date,amount_pence,description,match_type,matched_journal_line_id,matched_entry_id,bank_statements(period_label)").eq("matched_entry_id", entryId),
    supabase.from("stripe_payouts" as any).select("stripe_payout_id").eq("journal_entry_id", entryId),
    supabase.from("treasurer_dining_invoices" as any).select("invoice_number").eq("journal_entry_id", entryId),
    supabase.from("bookings" as any).select("event_label,contact_name").or(`journal_entry_id.eq.${entryId},refund_journal_entry_id.eq.${entryId}`),
    supabase.from("charity_collections" as any).select("collection_date,collection_type").eq("journal_entry_id", entryId),
    supabase.from("charity_donations" as any).select("donation_date,purpose").eq("journal_entry_id", entryId),
    supabase.from("journal_entries" as any).select("id").lt("entry_number", e.entry_number).order("entry_number", { ascending: false }).limit(1),
    supabase.from("journal_entries" as any).select("id").gt("entry_number", e.entry_number).order("entry_number", { ascending: true }).limit(1),
    e.created_by ? supabase.from("profiles" as any).select("full_name,first_name,last_name").eq("id", e.created_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if ((linesRes as any).error) throw (linesRes as any).error;
  const lines = (((linesRes as any).data as any[]) ?? []).map((r) => ({
    id: r.id,
    code: r.chart_of_accounts?.code ?? "",
    name: r.chart_of_accounts?.name ?? "",
    description: r.description ?? "",
    debit: Number(r.debit_pence ?? 0),
    credit: Number(r.credit_pence ?? 0),
  }));
  // Primary links (by entry or line id) plus split-match links from bank_statement_match_lines.
  // Each item carries _lineId: the ledger line on THIS entry that the bank row is linked to.
  const cols = "id,statement_id,transaction_date,amount_pence,description,match_type,matched_journal_line_id,matched_entry_id,bank_statements(period_label)";
  const lineIds = new Set(lines.map((l) => l.id));
  let bankRows: any[] = (((bankByEntry as any).data as any[]) ?? []).map((r) => ({ ...r, _lineId: r.matched_journal_line_id, _split: false }));
  if (lines.length) {
    const [{ data: byLine }, { data: splits }] = await Promise.all([
      supabase.from("bank_statement_transactions" as any).select(cols).in("matched_journal_line_id", [...lineIds]),
      supabase.from("bank_statement_match_lines" as any).select(`journal_line_id,bank_statement_transactions(${cols})`).in("journal_line_id", [...lineIds]),
    ]);
    const seen = new Set(bankRows.map((r) => `${r.id}:${r._lineId}`));
    for (const r of (byLine as any[]) ?? []) {
      const k = `${r.id}:${r.matched_journal_line_id}`;
      if (!seen.has(k)) { seen.add(k); bankRows.push({ ...r, _lineId: r.matched_journal_line_id, _split: false }); }
    }
    for (const s of (splits as any[]) ?? []) {
      const r = s.bank_statement_transactions;
      if (!r) continue;
      const k = `${r.id}:${s.journal_line_id}`;
      if (!seen.has(k)) { seen.add(k); bankRows.push({ ...r, _lineId: s.journal_line_id, _split: true }); }
    }
  }
  const links: string[] = [];
  for (const p of ((payouts as any).data as any[]) ?? []) links.push(`Stripe payout ${p.stripe_payout_id}`);
  for (const d of ((dining as any).data as any[]) ?? []) links.push(`Dining invoice ${d.invoice_number ?? "(no number)"}`);
  for (const b of ((bookings as any).data as any[]) ?? []) links.push(`Booking — ${b.event_label ?? "event"}${b.contact_name ? `, ${b.contact_name}` : ""}`);
  for (const c of ((collections as any).data as any[]) ?? []) links.push(`Charity collection — ${String(c.collection_type).replace(/_/g, " ")}, ${fmtDate(c.collection_date)}`);
  for (const d of ((donations as any).data as any[]) ?? []) links.push(`Charity donation — ${d.purpose ?? ""} ${fmtDate(d.donation_date)}`.trim());
  const cp: any = (creator as any).data;
  const creatorName = !e.created_by
    ? "System (automatic)"
    : cp
      ? cp.full_name || [cp.first_name, cp.last_name].filter(Boolean).join(" ") || "Member"
      : "Member (name not available)";
  return {
    entry: e,
    period: (periodRes as any).data ?? null,
    creator: creatorName,
    lines,
    bankRows,
    links,
    prevId: ((prev as any).data as any[])?.[0]?.id ?? null,
    nextId: ((next as any).data as any[])?.[0]?.id ?? null,
  };
}

function Body({ entryId, highlightLineId, onNavigate }: Omit<Props, "onClose">) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId) return;
    let alive = true;
    setData(null);
    setError(null);
    loadEntry(entryId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.message ?? "Could not load entry"));
    return () => {
      alive = false;
    };
  }, [entryId]);

  const summary = useMemo(() => (data ? summarizeEntryLines(data.lines) : null), [data]);

  const openAttachment = async () => {
    if (!data?.entry.attachment_path) return;
    const { data: s } = await supabase.storage.from("treasurer-attachments").createSignedUrl(data.entry.attachment_path, 300);
    if (s?.signedUrl) window.open(s.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data || !summary) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const e = data.entry;
  const lineLabel = (id: string | null) => {
    const l = data.lines.find((x) => x.id === id);
    return l ? `${l.code} — ${l.name} (${l.debit ? `Dr ${money(l.debit)}` : `Cr ${money(l.credit)}`})` : "whole entry";
  };
  const Field = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>
  );

  return (
    <div className="space-y-5 font-sans text-sm">
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field k="Date" v={fmtDate(e.entry_date)} />
        <Field k="Type" v={sourceTypeLabel(e.source_type)} />
        <Field
          k="Period"
          v={data.period ? <>{data.period.label} <Badge variant={data.period.status === "locked" ? "secondary" : "outline"}>{data.period.status === "locked" ? "Locked" : "Open"}</Badge></> : "No period assigned"}
        />
        {e.payee && <Field k="Payee" v={e.payee} />}
        {e.document_number && <Field k="Reference" v={e.document_number} />}
        {e.bank_reference && <Field k="Bank reference" v={e.bank_reference} />}
        <Field k="Reconciled" v={e.reconciled ? "Yes" : "No"} />
      </dl>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium text-right">Debit</th>
              <th className="px-3 py-2 font-medium text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {summary.lines.map((l) => (
              <tr key={l.id} className={`border-t border-border ${l.id === highlightLineId ? "bg-gold/15 font-medium" : ""}`} aria-current={l.id === highlightLineId ? "true" : undefined}>
                <td className="px-3 py-2 whitespace-nowrap">{l.code} — {l.name}</td>
                <td className="px-3 py-2">{l.description || <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.debit ? money(l.debit) : ""}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.credit ? money(l.credit) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-medium">
              <td className="px-3 py-2" colSpan={2}>
                {summary.balanced ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" /> Balanced</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-destructive"><X className="h-4 w-4" /> Out of balance by {money(summary.difference)}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{money(summary.debit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(summary.credit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <section>
        <h4 className="font-serif text-base text-primary mb-1">Bank match</h4>
        {data.bankRows.length === 0 ? (
          <p className="text-muted-foreground">Not matched to a bank statement line.</p>
        ) : (
          <ul className="space-y-1">
            {data.bankRows.map((r) => (
              <li key={`${r.id}:${r._lineId}`} className="rounded border border-border px-3 py-2">
                {r.bank_statements?.period_label ?? "Statement"} · {fmtDate(r.transaction_date)} · {money(r.amount_pence)} · {r.description}
                <div className="text-xs text-muted-foreground">
                  {r.match_type ? `${r.match_type} match` : "Matched"}{r._split ? " (split — additional line)" : ""} · linked to {lineLabel(r._lineId)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="font-serif text-base text-primary mb-1">Audit</h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field k="Created by" v={data.creator} />
          <Field k="Created" v={new Date(e.created_at).toLocaleString("en-GB", { timeZone: "Europe/London" })} />
          {data.links.length > 0 && <Field k="Linked record" v={data.links.join("; ")} />}
          {e.attachment_path && (
            <Field k="Attachment" v={<Button variant="link" className="h-auto p-0" onClick={openAttachment}><Paperclip className="mr-1 h-3.5 w-3.5" />{e.attachment_name || "Open file"}</Button>} />
          )}
        </dl>
      </section>

      {onNavigate && (
        <div className="flex justify-between gap-2 pt-1">
          <Button variant="outline" className="min-h-12" disabled={!data.prevId} onClick={() => data.prevId && onNavigate(data.prevId)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <Button variant="outline" className="min-h-12" disabled={!data.nextId} onClick={() => data.nextId && onNavigate(data.nextId)}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function useTitle(entryId: string | null) {
  const [t, setT] = useState<{ num: string; desc: string }>({ num: "", desc: "" });
  useEffect(() => {
    if (!entryId) return;
    supabase.from("journal_entries" as any).select("entry_number,description").eq("id", entryId).maybeSingle()
      .then(({ data }: any) => setT({ num: formatEntryNumber(data?.entry_number), desc: data?.description ?? "" }));
  }, [entryId]);
  return t;
}

/** Read-only view of every line of one journal entry. Dialog on desktop, bottom sheet on mobile. */
export default function EntryDrilldown({ entryId, highlightLineId, onClose, onNavigate }: Props) {
  const isMobile = useIsMobile();
  const open = !!entryId;
  const t = useTitle(entryId);
  const title = <>Journal entry {t.num && <span className="font-mono text-gold">{t.num}</span>}</>;
  const body = <Body entryId={entryId} highlightLineId={highlightLineId} onNavigate={onNavigate} />;
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left mb-3">
            <SheetTitle className="font-serif">{title}</SheetTitle>
            <SheetDescription>{t.desc}</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
