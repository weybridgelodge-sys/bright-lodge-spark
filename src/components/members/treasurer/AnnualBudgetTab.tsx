import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { currentLodgeYear, fetchAnnualBudget, saveAnnualBudget, type AnnualBudget } from "@/lib/treasurer/budget";

const toPence = (v: string) => Math.round((parseFloat(v || "0") || 0) * 100);
const toPounds = (p: number) => (p / 100).toFixed(2);

export default function AnnualBudgetTab({ canEdit }: { canEdit: boolean }) {
  const { user } = useAuth();
  const ly = currentLodgeYear();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<AnnualBudget | null>(null);
  const [income, setIncome] = useState("0.00");
  const [expenditure, setExpenditure] = useState("0.00");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAnnualBudget(ly.start)
      .then((b) => {
        if (cancelled) return;
        setExisting(b);
        if (b) {
          setIncome(toPounds(b.income_budget_pence));
          setExpenditure(toPounds(b.expenditure_budget_pence));
          setNotes(b.notes ?? "");
        }
      })
      .catch((e) => toast({ title: "Could not load budget", description: e.message, variant: "destructive" }))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ly.start]);

  const save = async () => {
    setSaving(true);
    try {
      await saveAnnualBudget({
        id: existing?.id,
        lodge_year_start: ly.start,
        lodge_year_end: ly.end,
        label: ly.label,
        income_budget_pence: toPence(income),
        expenditure_budget_pence: toPence(expenditure),
        notes: notes.trim() || null,
        userId: user?.id ?? null,
      });
      const fresh = await fetchAnnualBudget(ly.start);
      setExisting(fresh);
      toast({ title: existing ? "Budget updated" : "Budget saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>;
  }

  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/30 max-w-xl">
      <div className="px-4 py-3 border-b border-gold/15 flex items-center gap-2">
        <Target className="w-4 h-4 text-gold" />
        <h3 className="font-serif text-gold">Annual budget — {ly.label}</h3>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-primary-foreground/60">
          Lodge year {new Date(ly.start).toLocaleDateString("en-GB")} → {new Date(ly.end).toLocaleDateString("en-GB")}.
          Entered manually; one budget per lodge year.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="budget-income">Income budget (£)</Label>
          <Input id="budget-income" inputMode="decimal" value={income} disabled={!canEdit}
            onChange={(e) => setIncome(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget-expenditure">Expenditure budget (£)</Label>
          <Input id="budget-expenditure" inputMode="decimal" value={expenditure} disabled={!canEdit}
            onChange={(e) => setExpenditure(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget-notes">Notes</Label>
          <Textarea id="budget-notes" rows={3} value={notes} disabled={!canEdit}
            placeholder="e.g. based on 2025/26 actuals"
            onChange={(e) => setNotes(e.target.value)} />
        </div>

        {canEdit && (
          <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90 min-h-11 sm:min-h-0">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {existing ? "Update budget" : "Save budget"}
          </Button>
        )}
      </div>
    </div>
  );
}
