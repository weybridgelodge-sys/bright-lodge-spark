import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Ban, CheckCircle2, Link2 } from "lucide-react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Status = "new" | "contacted" | "converted" | "declined";
const STATUSES: Status[] = ["new", "contacted", "converted", "declined"];
const LABELS: Record<Status, string> = { new: "New", contacted: "Contacted", converted: "Converted", declined: "Declined" };

type Enquiry = {
  id: string; full_name: string; email: string | null; phone: string | null; reason: string | null;
  source: string | null; status: string; created_at: string; converted_candidate_id: string | null;
};
type Filter = "open" | "all" | "converted" | "declined";

function Inner() {
  const { isAdmin, isSecretary, isWorshipfulMaster } = useAuth();
  const canEdit = isAdmin || isSecretary;
  const canView = canEdit || isWorshipfulMaster;
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [candEmails, setCandEmails] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: cands }] = await Promise.all([
      (supabase.from as any)("membership_enquiries")
        .select("id,full_name,email,phone,reason,source,status,created_at,converted_candidate_id")
        .order("created_at", { ascending: false }),
      (supabase.from as any)("candidates").select("id,email"),
    ]);
    if (error) toast.error(error.message);
    setRows((data as Enquiry[]) ?? []);
    const m = new Map<string, string>();
    ((cands as { id: string; email: string | null }[]) ?? []).forEach((c) => {
      if (c.email) m.set(c.email.toLowerCase(), c.id);
    });
    setCandEmails(m);
    setLoading(false);
  };
  useEffect(() => { if (canView) load(); }, [canView]);

  const visible = useMemo(() => rows.filter((r) =>
    filter === "all" ? true : filter === "open" ? r.status === "new" || r.status === "contacted" : r.status === filter
  ), [rows, filter]);

  const setStatus = async (id: string, status: Status) => {
    setBusy(id);
    const { error } = await (supabase.from as any)("membership_enquiries").update({ status }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    load();
  };

  const convert = async (e: Enquiry, linkExisting: boolean) => {
    const msg = linkExisting
      ? `${e.full_name} is already on the candidates list. Mark this enquiry as converted and link it to that record (no new candidate is created)?`
      : `Create a new candidate record for ${e.full_name}?`;
    if (!confirm(msg)) return;
    setBusy(e.id);
    const { error } = await supabase.rpc("convert_enquiry_to_candidate" as any, { _enquiry_id: e.id, _link_existing: linkExisting } as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(linkExisting ? "Linked to existing candidate" : "Candidate created");
    load();
  };

  if (!canView) {
    return <MembersLayout><p className="text-primary-foreground/70">You don't have permission to view membership enquiries.</p></MembersLayout>;
  }

  const btn = "inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider px-2.5 py-1.5 rounded-sm disabled:opacity-50";

  return (
    <MembersLayout>
      <Link to="/members/admin/secretary" className="inline-flex items-center gap-1 text-xs text-gold/80 hover:text-gold mb-3">
        <ArrowLeft className="w-3 h-3" /> Secretary Portal
      </Link>
      <header className="mb-4">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Membership Enquiries</h1>
        <p className="text-primary-foreground/60 text-sm">Enquiries from the public Join Us form. Follow each one up, convert genuine ones to candidates, and decline the rest.</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {([["open", "New & contacted"], ["all", "All"], ["converted", "Converted"], ["declined", "Declined"]] as [Filter, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={`${btn} border ${filter === k ? "border-gold bg-gold/15 text-gold" : "border-gold/20 text-primary-foreground/70 hover:border-gold/50"}`}>
            {l} ({rows.filter((r) => k === "all" ? true : k === "open" ? r.status === "new" || r.status === "contacted" : r.status === k).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-primary-foreground/60">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-primary-foreground/60 italic">No enquiries in this view.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((e) => {
            const converted = e.status === "converted" || !!e.converted_candidate_id;
            const existing = !converted && e.email ? candEmails.get(e.email.toLowerCase()) : undefined;
            return (
              <article key={e.id} className="bg-navy-light/30 border border-gold/20 rounded-sm p-4">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="min-w-[12rem] flex-1">
                    <h2 className="font-serif text-gold text-lg">{e.full_name}</h2>
                    <p className="text-xs text-primary-foreground/70 break-all">
                      {[e.email, e.phone].filter(Boolean).join(" · ") || "No contact details"}
                    </p>
                    <p className="text-[11px] text-primary-foreground/50 mt-0.5">
                      {new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      {e.source && ` · Source: ${e.source}`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-primary-foreground/60 mb-1" htmlFor={`st-${e.id}`}>Status</label>
                    <select id={`st-${e.id}`} value={e.status} disabled={!canEdit || converted || busy === e.id}
                      onChange={(ev) => setStatus(e.id, ev.target.value as Status)}
                      className="bg-navy border border-gold/20 rounded-sm px-2 py-1.5 text-xs text-primary-foreground">
                      {STATUSES.filter((s) => s !== "converted" || converted).map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
                {e.reason && <p className="text-sm text-primary-foreground/80 mt-3 whitespace-pre-line">{e.reason}</p>}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {converted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gold"><CheckCircle2 className="w-4 h-4" /> Converted to candidate — see Mentor Portal → Candidates</span>
                  ) : existing ? (
                    <>
                      <span className="text-xs text-gold">Already on the candidates list (matched by email).</span>
                      {canEdit && (
                        <button disabled={busy === e.id} onClick={() => convert(e, true)} className={`${btn} border border-gold/40 text-gold hover:bg-gold/10`}>
                          <Link2 className="w-3.5 h-3.5" /> Link & mark converted
                        </button>
                      )}
                    </>
                  ) : canEdit ? (
                    <button disabled={busy === e.id} onClick={() => convert(e, false)} className={`${btn} text-accent-foreground bg-gold-shimmer font-semibold`}>
                      <UserPlus className="w-3.5 h-3.5" /> Convert to candidate
                    </button>
                  ) : null}
                  {canEdit && !converted && e.status !== "declined" && (
                    <button disabled={busy === e.id} onClick={() => setStatus(e.id, "declined")} className={`${btn} border border-gold/20 text-primary-foreground/70 hover:border-gold/50`}>
                      <Ban className="w-3.5 h-3.5" /> Decline
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </MembersLayout>
  );
}

export default function MembershipEnquiries() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
