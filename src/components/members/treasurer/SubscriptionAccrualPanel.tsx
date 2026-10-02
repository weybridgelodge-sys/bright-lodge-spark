import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePostingPeriod } from "@/lib/treasurer/periods";
import PeriodPicker from "@/components/members/treasurer/PeriodPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { currentLodgeYear } from "@/lib/dues";

type Row = {
  member_id: string;
  full_name: string;
  under_25: boolean;
  dob_missing: boolean;
  exempt_reason: string | null;
  amount_pence: number;
};

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
const yLabel = (y: number) => `${y}/${String((y + 1) % 100).padStart(2, "0")}`;

export default function SubscriptionAccrualPanel({ canEdit }: { canEdit: boolean }) {
  const now = currentLodgeYear();
  const [year, setYear] = useState(now + 1);
  const posting = usePostingPeriod(`${year}-10-01`);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("subscription_accrual_preview", { _year: year });
    setBusy(false);
    if (error) { toast({ title: "Preview failed", description: error.message, variant: "destructive" }); return; }
    setRows((data as Row[]) ?? []);
  };

  const post = async () => {
    if (!posting.periodId) { toast({ title: "No unlocked period for 1 October " + year, variant: "destructive" }); return; }
    setBusy(true);
    const { error } = await (supabase as any).rpc("post_subscription_accrual", { _year: year, _period_id: posting.periodId });
    setBusy(false);
    if (error) { toast({ title: "Accrual not posted", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Subscriptions for ${yLabel(year)} charged` });
    setRows(null);
  };

  const charged = (rows ?? []).filter((r) => r.amount_pence > 0);
  const total = charged.reduce((s, r) => s + r.amount_pence, 0);

  return (
    <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
      <h2 className="font-serif text-lg text-gold mb-1">Annual subscriptions charge</h2>
      <p className="text-primary-foreground/60 text-sm mb-4">
        Charges every active member for the year on 1 October: Dr 1100 Debtors for each member, split across 4000 Subscriptions,
        the 3100 reserve pots (tagged) and 2200 Relief Chest. Under-25s at 1 October pay half. Honorary members and the
        current Secretary (most recent appointment) are exempt; the Treasurer pays as normal. Each year can only be charged once.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 items-end">
        <div>
          <Label>Lodge year</Label>
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setRows(null); }} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now, now + 1].map((y) => <SelectItem key={y} value={String(y)}>FY {yLabel(y)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <PeriodPicker periods={posting.periods} value={posting.periodId} autoId={posting.autoId} onChange={posting.setPeriodId} disabled={!canEdit} />
        <Button variant="outline" className="border-gold/30" onClick={preview} disabled={!canEdit || busy}>
          {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Preview
        </Button>
      </div>

      {rows && (
        <div className="mt-4 space-y-3">
          <ul className="divide-y divide-gold/10 rounded border border-gold/10 text-sm">
            {rows.map((r) => (
              <li key={r.member_id} className="flex gap-3 px-3 py-1.5">
                <span className="flex-1 text-primary-foreground/90">{r.full_name}</span>
                <span className="text-primary-foreground/50 text-xs">
                  {r.exempt_reason ? `Exempt (${r.exempt_reason})` : r.under_25 ? "Under 25" : r.dob_missing ? "No date of birth — full rate" : ""}
                </span>
                <span className="text-gold w-20 text-right">{fmt(r.amount_pence)}</span>
              </li>
            ))}
          </ul>
          <p className="text-primary-foreground/80 text-sm">{charged.length} chargeable members · total {fmt(total)}</p>
          <Button className="bg-gold text-navy hover:bg-gold/90" onClick={post} disabled={!canEdit || busy || charged.length === 0}>
            Post FY {yLabel(year)} charge
          </Button>
        </div>
      )}
    </section>
  );
}
