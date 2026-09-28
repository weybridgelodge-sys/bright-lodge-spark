import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { acct, fetchClosingPeriodIds, fmtDate, money } from "@/lib/treasurer/reports";
import { formatEntryNumber, entryNumberMatches } from "@/lib/treasurer/entryNumber";
import { agreement, buildAccountDrill, type DrillSourceLine } from "@/lib/treasurer/reportPeriods";
import { EntryDrilldownBody } from "./EntryDrilldown";

export type DrillAccount = { id: string; code: string; name: string; account_type: string };
export type DrillTarget = {
  account: DrillAccount;
  /** null = cumulative from inception (balance-sheet accounts) */
  start: string | null;
  end: string;
  periodLabel: string;
  /** The figure shown in the report, in pence, same sign convention. */
  expected: number;
  /** Also include closing-journal lines dated after `end` up to this date (fund b/f). */
  includeClosingTo?: string;
};

async function fetchAccountLines(t: DrillTarget): Promise<DrillSourceLine[]> {
  const data: any[] = [];
  const closing = await fetchClosingPeriodIds();
  const isPl = t.account.account_type === "income" || t.account.account_type === "expense";
  const fetchTo = t.includeClosingTo && t.includeClosingTo > t.end ? t.includeClosingTo : t.end;
  for (let offset = 0; ; offset += 1000) {
    let q = supabase
      .from("journal_lines" as any)
      .select("id,entry_id,description,debit_pence,credit_pence,journal_entries!inner(entry_number,entry_date,description,source_type,period_id)")
      .eq("account_id", t.account.id)
      .lte("journal_entries.entry_date", fetchTo);
    if (t.start) q = q.gte("journal_entries.entry_date", t.start);
    const { data: page, error } = await q.order("id").range(offset, offset + 999);
    if (error) throw error;
    data.push(...((page as any[]) ?? []));
    if (!page || page.length < 1000) break;
  }
  const kept = data.filter((r) => {
    const c = closing.has(r.journal_entries?.period_id);
    if (r.journal_entries?.entry_date > t.end) return c; // only closing lines beyond end (fund b/f)
    return !(c && isPl && t.start); // I&E year movement never includes the closing journal
  });
  return kept.map((r) => ({
    id: r.id,
    entry_id: r.entry_id,
    entry_number: r.journal_entries?.entry_number ?? null,
    entry_date: r.journal_entries?.entry_date ?? "",
    entry_description: r.journal_entries?.description ?? "",
    line_description: r.description ?? "",
    source_type: r.journal_entries?.source_type ?? null,
    debit: Number(r.debit_pence ?? 0),
    credit: Number(r.credit_pence ?? 0),
  }));
}

function Body({ target }: { target: DrillTarget }) {
  const [lines, setLines] = useState<DrillSourceLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [desc, setDesc] = useState(false);
  const [open, setOpen] = useState<{ entryId: string; lineId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);
  const isBs = !target.start;

  useEffect(() => {
    let alive = true;
    setLines(null); setError(null); setOpen(null);
    fetchAccountLines(target).then((l) => alive && setLines(l)).catch((e) => alive && setError(e?.message ?? "Could not load lines"));
    return () => { alive = false; };
  }, [target]);

  const drill = useMemo(() => (lines ? buildAccountDrill(lines, target.account.account_type) : null), [lines, target.account.account_type]);
  const visible = useMemo(() => {
    if (!drill) return [];
    const q = search.trim().toLowerCase();
    const f = q
      ? drill.rows.filter((r) => entryNumberMatches(r.entry_number, q) ||
          `${r.entry_description} ${r.line_description} ${r.entry_date}`.toLowerCase().includes(q))
      : drill.rows;
    return desc ? [...f].reverse() : f;
  }, [drill, search, desc]);

  // Restore list scroll position when coming back from the entry view.
  useEffect(() => {
    if (!open && scrollRef.current) scrollRef.current.scrollTop = savedScroll.current;
  }, [open]);

  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!drill) return <p className="text-muted-foreground text-sm"><Loader2 className="inline h-4 w-4 mr-1 animate-spin" /> Loading lines…</p>;

  const agree = agreement(drill.total, target.expected);
  const idx = open ? visible.findIndex((r) => r.id === open.lineId) : -1;
  const step = (d: number) => {
    const r = visible[idx + d];
    if (r) setOpen({ entryId: r.entry_id, lineId: r.id });
  };
  const openRow = (entryId: string, lineId: string) => {
    savedScroll.current = scrollRef.current?.scrollTop ?? 0;
    setOpen({ entryId, lineId });
  };

  return (
    <div className="font-sans overflow-x-hidden">
      {open && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" className="min-h-[48px]" onClick={() => setOpen(null)} aria-label="Back to account lines">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to {target.account.code} lines
            </Button>
            <span className="text-xs text-muted-foreground">Line {idx + 1} of {visible.length}</span>
          </div>
          <EntryDrilldownBody
            entryId={open.entryId}
            highlightLineId={open.lineId}
            onNavigate={(id) => {
              const r = visible.find((v, i) => v.entry_id === id && (i === idx - 1 || i === idx + 1));
              if (r) setOpen({ entryId: r.entry_id, lineId: r.id });
            }}
            prevId={visible[idx - 1]?.entry_id ?? null}
            nextId={visible[idx + 1]?.entry_id ?? null}
          />
          <p className="sr-only">
            <button onClick={() => step(-1)}>Previous line</button><button onClick={() => step(1)}>Next line</button>
          </p>
        </div>
      )}

      <div className={open ? "hidden" : "space-y-3"}>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search doc no. or description"
            aria-label="Search lines"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[48px] flex-1 min-w-[12rem]"
          />
          <Button variant="outline" className="min-h-[48px]" onClick={() => setDesc((d) => !d)} aria-label={`Sort by date ${desc ? "oldest first" : "newest first"}`}>
            Date {desc ? <ArrowDown className="ml-1 h-4 w-4" /> : <ArrowUp className="ml-1 h-4 w-4" />}
          </Button>
        </div>

        {agree.agrees ? (
          <p className="flex items-center gap-1 text-sm font-semibold text-emerald-600"><Check className="h-4 w-4" /> Agrees to report ({acct(target.expected)})</p>
        ) : (
          <p className="flex items-center gap-1 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Does not agree: lines total {acct(drill.total)}, report shows {acct(target.expected)} — difference {acct(agree.difference)}
          </p>
        )}

        <div ref={scrollRef} className="max-h-[55vh] overflow-y-auto overflow-x-auto rounded border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left p-2 font-normal">Doc no.</th>
                <th className="text-left p-2 font-normal">Date</th>
                <th className="text-left p-2 font-normal">Description</th>
                <th className="text-right p-2 font-normal">Debit</th>
                <th className="text-right p-2 font-normal">Credit</th>
                {isBs && <th className="text-right p-2 font-normal">Balance</th>}
                <th className="w-6" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} className="p-3 text-muted-foreground">No lines{search ? " match your search" : ""}.</td></tr>
              )}
              {visible.map((r) => (
                <tr
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${formatEntryNumber(r.entry_number)}, ${r.entry_description}`}
                  onClick={() => openRow(r.entry_id, r.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(r.entry_id, r.id); } }}
                  className="h-12 cursor-pointer border-b border-border text-foreground hover:bg-gold/10 focus:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <td className="p-2 font-mono text-xs whitespace-nowrap">{formatEntryNumber(r.entry_number)}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="p-2">
                    {r.opening && <span className="mr-1 rounded bg-gold/20 px-1 text-xs">Opening b/f</span>}
                    {r.entry_description}
                    {r.line_description && r.line_description !== r.entry_description && (
                      <span className="block text-xs text-muted-foreground">{r.line_description}</span>
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.debit ? money(r.debit) : ""}</td>
                  <td className="p-2 text-right tabular-nums">{r.credit ? money(r.credit) : ""}</td>
                  {isBs && <td className="p-2 text-right tabular-nums">{acct(r.running)}</td>}
                  <td className="p-2 text-muted-foreground"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card font-semibold text-foreground">
              <tr className="border-t-2 border-border">
                <td className="p-2" colSpan={3}>Total ({drill.rows.length} lines) — net {acct(drill.total)}</td>
                <td className="p-2 text-right tabular-nums">{money(drill.debit)}</td>
                <td className="p-2 text-right tabular-nums">{money(drill.credit)}</td>
                {isBs && <td className="p-2 text-right tabular-nums">{acct(drill.total)}</td>}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {search && <p className="text-xs text-muted-foreground">Showing {visible.length} of {drill.rows.length}; totals are for all lines.</p>}
      </div>
    </div>
  );
}

/** Account → journal lines drill-down; clicking a line opens the journal entry. Dialog on desktop, bottom sheet on mobile. */
export default function AccountDrilldown({ target, onClose }: { target: DrillTarget | null; onClose: () => void }) {
  const isMobile = useIsMobile();
  if (!target) return null;
  const title = `${target.account.code} — ${target.account.name} · ${target.periodLabel}`;
  const sub = target.start
    ? `Entries dated ${fmtDate(target.start)} – ${fmtDate(target.end)}`
    : `All entries up to ${fmtDate(target.end)} (cumulative)`;
  if (isMobile) {
    return (
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <SheetHeader className="text-left mb-3">
            <SheetTitle className="font-serif">{title}</SheetTitle>
            <SheetDescription>{sub}</SheetDescription>
          </SheetHeader>
          <Body target={target} />
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-serif">{title}</DialogTitle>
          <DialogDescription>{sub}</DialogDescription>
        </DialogHeader>
        <Body target={target} />
      </DialogContent>
    </Dialog>
  );
}

/** Clickable report row: whole row opens the current figure; the comparative cell opens its own figure. */
export function DrillAccountRow({
  code, name, current, prior, onCurrent, onPrior,
}: { code: string; name: string; current: number; prior: number; onCurrent: () => void; onPrior: () => void }) {
  const cls = (v: number) => (v < 0 ? "text-red-400" : "text-primary-foreground");
  return (
    <tr
      role="button"
      tabIndex={0}
      aria-label={`Show transactions for ${code} ${name}`}
      onClick={onCurrent}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCurrent(); } }}
      className="h-12 cursor-pointer border-b border-gold/10 hover:bg-gold/10 focus:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <td className="py-2 text-primary-foreground/85">
        <span className="inline-flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-gold shrink-0" aria-hidden />{code} — {name}
        </span>
      </td>
      <td className={`py-2 text-right tabular-nums underline-offset-4 hover:underline ${cls(current)}`}>{acct(current)}</td>
      <td className="py-1 text-right">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrior(); }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Show comparative transactions for ${code} ${name}`}
          className={`min-h-[48px] px-1 tabular-nums underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded ${cls(prior)}`}
        >
          {acct(prior)}
        </button>
      </td>
    </tr>
  );
}
