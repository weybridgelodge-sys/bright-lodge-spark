import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAccounts, money, type Account } from "@/lib/treasurer/reports";
import {
  budgetYearOptions, fetchAnnualBudget, fetchBudgetLines, saveAnnualBudget, upsertBudgetLine,
  type AnnualBudget, type LodgeYear,
} from "@/lib/treasurer/budget";

const toPence = (v: string) => Math.round((parseFloat(v || "0") || 0) * 100);
const toPounds = (p: number) => (p / 100).toFixed(2);

export default function AnnualBudgetTab({ canEdit }: { canEdit: boolean }) {
  const { user } = useAuth();
  const years = useMemo(() => budgetYearOptions(), []);
  const [yearStart, setYearStart] = useState(years[0].start);
  const ly = useMemo<LodgeYear>(() => years.find((y) => y.start === yearStart) ?? years[0], [years, yearStart]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, number>>({});
  const [existing, setExisting] = useState<AnnualBudget | null>(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accts, lines, header] = await Promise.all([
        fetchAccounts(),
        fetchBudgetLines(ly.start),
        fetchAnnualBudget(ly.start),
      ]);
      setAccounts(accts.filter((a) => a.account_type === "income" || a.account_type === "expense"));
      const byAccount: Record<string, number> = {};
      for (const l of lines) byAccount[l.account_id] = Number(l.amount_pence ?? 0);
      setSaved(byAccount);
      setAmounts(Object.fromEntries(accts.map((a) => [a.id, toPounds(byAccount[a.id] ?? 0)])));
      setExisting(header);
      setNotes(header?.notes ?? "");
    } catch (e: any) {
      toast({ title: "Could not load budget", description: e?.message, variant: "destructive" });
    }
    setLoading(false);
  }, [ly.start]);

  useEffect(() => { load(); }, [load]);

  const income = accounts.filter((a) => a.account_type === "income");
  const expense = accounts.filter((a) => a.account_type === "expense");
  const total = (rows: Account[]) => rows.reduce((s, a) => s + toPence(amounts[a.id] ?? "0"), 0);
  const incomeTotal = total(income);
  const expenseTotal = total(expense);

  const dirty = accounts.filter((a) => toPence(amounts[a.id] ?? "0") !== (saved[a.id] ?? 0));
  const notesDirty = (notes.trim() || null) !== (existing?.notes ?? null);

  const save = async () => {
    setSaving(true);
    try {
      for (const a of dirty) {
        await upsertBudgetLine({
          lodgeYear: ly,
          accountId: a.id,
          amountPence: toPence(amounts[a.id] ?? "0"),
          userId: user?.id ?? null,
        });
      }
      if (notesDirty || !existing) {
        await saveAnnualBudget({
          id: existing?.id,
          lodge_year_start: ly.start,
          lodge_year_end: ly.end,
          label: ly.label,
          notes: notes.trim() || null,
          userId: user?.id ?? null,
        });
      }
      await load();
      toast({ title: "Budget saved", description: `${ly.label} budget updated.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const Group = ({ title, rows, totalPence }: { title: string; rows: Account[]; totalPence: number }) => (
    <div className="mt-5">
      <h4 className="font-serif text-gold mb-2">{title}</h4>
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <Label htmlFor={`budget-${a.id}`} className="text-sm text-primary-foreground/85 font-normal">
              {a.code} — {a.name}
            </Label>
            <Input
              id={`budget-${a.id}`}
              inputMode="decimal"
              className="w-32 text-right tabular-nums"
              value={amounts[a.id] ?? "0.00"}
              disabled={!canEdit}
              onChange={(e) => setAmounts((m) => ({ ...m, [a.id]: e.target.value }))}
            />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-gold/30 pt-2 font-semibold">
          <span className="text-gold text-sm">Total {title.toLowerCase()}</span>
          <span className="tabular-nums text-sm pr-3">{money(totalPence)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/30 max-w-2xl">
      <div className="px-4 py-3 border-b border-gold/15 flex items-center gap-2">
        <Target className="w-4 h-4 text-gold" />
        <h3 className="font-serif text-gold">Annual budget — {ly.label}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-1.5 max-w-xs">
          <Label>Lodge year</Label>
          <Select value={yearStart} onValueChange={setYearStart}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.start} value={y.start}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-primary-foreground/60">
          Lodge year {new Date(ly.start).toLocaleDateString("en-GB")} → {new Date(ly.end).toLocaleDateString("en-GB")}.
          One budgeted figure per category; each lodge year is independent.
        </p>

        {loading ? (
          <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <>
            <Group title="Income" rows={income} totalPence={incomeTotal} />
            <Group title="Expenditure" rows={expense} totalPence={expenseTotal} />

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="budget-notes">Notes</Label>
              <Textarea id="budget-notes" rows={3} value={notes} disabled={!canEdit}
                placeholder="e.g. based on 2025/26 actuals"
                onChange={(e) => setNotes(e.target.value)} />
            </div>

            {canEdit && (
              <Button onClick={save} disabled={saving || (dirty.length === 0 && !notesDirty)}
                className="bg-gold text-navy hover:bg-gold/90 min-h-11 sm:min-h-0">
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Save budget
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
