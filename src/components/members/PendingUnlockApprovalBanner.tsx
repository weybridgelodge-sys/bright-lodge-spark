import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Unlock } from "lucide-react";

type Pending = {
  id: string;
  label: string;
  unlock_reason: string | null;
  needs_treasurer: boolean;
  needs_secretary: boolean;
};

/** Dashboard prompt for whoever holds an outstanding Treasurer/Secretary unlock approval. */
export default function PendingUnlockApprovalBanner() {
  const [rows, setRows] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_pending_unlock_approvals" as any);
    setRows(((data as unknown as Pending[]) ?? []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (p: Pending) => {
    setBusy(p.id);
    const { error } = await supabase.rpc("approve_unlock_treasurer_period" as any, { _period_id: p.id } as any);
    setBusy(null);
    if (error) { toast({ title: "Approval failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Approval recorded" });
    load();
  };

  if (!rows.length) return null;

  return (
    <div className="space-y-3 mb-6">
      {rows.map((p) => {
        const as = p.needs_treasurer && p.needs_secretary ? "Treasurer & Secretary" : p.needs_treasurer ? "Treasurer" : "Secretary";
        return (
          <section key={p.id} className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Unlock className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-200">{p.label} is awaiting your approval to unlock</p>
                {p.unlock_reason && <p className="text-xs text-amber-100/80">Reason: {p.unlock_reason}</p>}
              </div>
              <Button size="sm" className="bg-gold text-navy hover:bg-gold/90 min-h-11 sm:min-h-0" disabled={busy === p.id} onClick={() => approve(p)}>
                {busy === p.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                Approve (as {as})
              </Button>
              <Link to="/members/admin/treasurer" className="text-xs text-amber-200 underline underline-offset-2">Open Period Close</Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}
