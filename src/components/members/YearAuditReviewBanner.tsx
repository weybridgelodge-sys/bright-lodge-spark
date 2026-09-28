import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { fmtDate } from "@/lib/treasurer/reports";
import { fyLabel } from "@/lib/treasurer/yearEnd";
import YearSnapshotView from "@/components/members/treasurer/YearSnapshotView";
import { AUDITOR_LABEL, AUDITOR_ROLES, auditorView, confirmWording, type Approval, type AuditorRole, type Signoff } from "@/lib/treasurer/yearAudit";

/** Dashboard prompt for current Auditor 1 / Auditor 2 when year-end accounts are submitted for review. */
export default function YearAuditReviewBanner() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AuditorRole[]>([]);
  const [items, setItems] = useState<Approval[]>([]);
  const [sigs, setSigs] = useState<Signoff[]>([]);
  const [open, setOpen] = useState<Approval | null>(null);
  const [mode, setMode] = useState<"view" | "confirm" | "query">("view");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const checks = await Promise.all(AUDITOR_ROLES.map((r) =>
      supabase.rpc("is_current_officer" as any, { _user_id: user.id, _position_key: r } as any)));
    const my = AUDITOR_ROLES.filter((_, i) => checks[i].data === true);
    setRoles(my);
    if (!my.length) { setItems([]); return; }
    const { data: ap } = await supabase.from("treasurer_year_approvals" as any).select("*").eq("status", "submitted");
    const list = ((ap as any[]) ?? []) as Approval[];
    const { data: s } = list.length
      ? await supabase.from("treasurer_year_signoffs" as any).select("*").in("approval_id", list.map((a) => a.id))
      : { data: [] };
    setItems(list); setSigs(((s as any[]) ?? []) as Signoff[]);
  }, [user?.id]);
  useEffect(() => { load(); }, [load]);

  const sign = async (decision: "confirmed" | "query") => {
    if (!open || !user?.id) return;
    const v = auditorView(open, sigs, roles);
    if (v.kind !== "act") return;
    if (decision === "query" && !note.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("treasurer_year_signoffs" as any).insert({
      approval_id: open.id, round_number: open.round_number, officer_role: v.role,
      signed_by: user.id, decision, note: note.trim() || null,
    } as any);
    setBusy(false);
    if (error) { toast({ title: "Sign-off not recorded", description: error.message, variant: "destructive" }); return; }
    supabase.functions.invoke("notify-year-audit", { body: { approval_id: open.id } }).catch(() => {});
    if (decision === "confirmed") {
      // If this was the second confirmation, the year is now approved: store the certified pack.
      const year = open.masonic_year;
      supabase.from("treasurer_year_approvals" as any).select("status").eq("id", open.id).maybeSingle().then(({ data }) => {
        if ((data as any)?.status === "approved") {
          import("@/lib/treasurer/accountsPackPdf").then((m) => m.storeCertifiedPack(year)).catch(() => {});
        }
      });
    }
    toast({ title: decision === "confirmed" ? "Accounts confirmed" : "Query raised", description: "The Treasurer will be notified where needed." });
    setOpen(null); setNote(""); setMode("view"); load();
  };

  const visible = items.filter((a) => auditorView(a, sigs, roles).kind !== "none");
  if (!visible.length) return null;
  const v = open ? auditorView(open, sigs, roles) : null;

  return (
    <div className="space-y-3 mb-6">
      {visible.map((a) => {
        const av = auditorView(a, sigs, roles);
        return (
          <section key={a.id} className="rounded-sm border border-gold/40 bg-gold/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gold flex items-center gap-2"><ClipboardCheck className="w-4 h-4" />
                {av.kind === "act" ? `${fyLabel(a.masonic_year)} accounts awaiting your review` : `${fyLabel(a.masonic_year)} accounts — your sign-off is recorded`}
              </p>
              <p className="text-xs text-primary-foreground/70">
                Round {a.round_number}{a.submitted_at ? ` · submitted ${fmtDate(a.submitted_at.slice(0, 10))}` : ""}
                {av.kind === "signed" ? ` · you ${av.signoff.decision === "confirmed" ? "confirmed" : "raised a query"} on ${fmtDate(av.signoff.signed_at.slice(0, 10))}` : ""}
              </p>
            </div>
            <Button className="min-h-[48px] bg-gold text-navy hover:bg-gold/90" onClick={() => { setOpen(a); setMode("view"); setNote(""); }}>
              {av.kind === "act" ? "Review accounts" : "View"}
            </Button>
          </section>
        );
      })}

      <Dialog open={!!open} onOpenChange={(o) => { if (!o && !busy) setOpen(null); }}>
        <DialogContent className="bg-navy-light text-primary-foreground border-gold/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          {open && v && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-gold">{fyLabel(open.masonic_year)} accounts — audit review</DialogTitle>
                <DialogDescription className="text-primary-foreground/70 font-sans">
                  {v.kind === "act" ? `Signing as ${AUDITOR_LABEL[v.role]}.` : "Your decision for this round is recorded."}
                </DialogDescription>
              </DialogHeader>
              {mode === "confirm" ? (
                <p className="text-sm font-sans">{confirmWording(open.masonic_year)}</p>
              ) : mode === "query" ? (
                <div className="space-y-2">
                  <Label htmlFor="audit-note">Your query (required)</Label>
                  <Textarea id="audit-note" value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="What needs explaining or correcting?" />
                </div>
              ) : (
                <>
                  {open.figures_snapshot && <YearSnapshotView snap={open.figures_snapshot} round={open.round_number} />}
                  {v.kind === "signed" && (
                    <p className="text-sm rounded border border-gold/20 p-3">
                      You {v.signoff.decision === "confirmed" ? "confirmed these accounts as accurate" : "raised a query"} on {fmtDate(v.signoff.signed_at.slice(0, 10))}.
                      {v.signoff.note ? <><br /><span className="text-primary-foreground/70">Note: {v.signoff.note}</span></> : null}
                    </p>
                  )}
                </>
              )}
              <DialogFooter className="gap-2">
                {v.kind !== "act" ? (
                  <Button variant="outline" className="min-h-[48px]" onClick={() => setOpen(null)}>Close</Button>
                ) : mode === "view" ? (
                  <>
                    <Button variant="outline" className="min-h-[48px]" onClick={() => setMode("query")}>Raise a query</Button>
                    <Button className="min-h-[48px] bg-gold text-navy hover:bg-gold/90" onClick={() => setMode("confirm")}>Confirm accounts as accurate</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="min-h-[48px]" disabled={busy} onClick={() => setMode("view")}>Cancel</Button>
                    <Button className="min-h-[48px] bg-gold text-navy hover:bg-gold/90" disabled={busy || (mode === "query" && !note.trim())}
                      onClick={() => sign(mode === "confirm" ? "confirmed" : "query")}>
                      {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{mode === "confirm" ? "Confirm" : "Send query"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
