import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Ban, CheckCircle2, Link2, ExternalLink } from "lucide-react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// DB stores dismissed enquiries as status 'declined' (existing historical rows use it).
type Enquiry = {
  id: string; full_name: string; email: string | null; phone: string | null; reason: string | null;
  source: string | null; status: string; created_at: string; converted_candidate_id: string | null;
  notes: string | null;
};
type Tab = "new" | "converted" | "dismissed";
const STATUS_LABEL: Record<string, string> = { new: "New", contacted: "Contacted", converted: "Converted", declined: "Dismissed" };

const tabOf = (e: Enquiry): Tab =>
  e.status === "converted" || e.converted_candidate_id ? "converted" : e.status === "declined" ? "dismissed" : "new";
const candidateHref = (id: string) => `/members/kpis?candidate=${id}#candidates`;

function Inner() {
  const { isAdmin, isSecretary, isWorshipfulMaster } = useAuth();
  const navigate = useNavigate();
  const canEdit = isAdmin || isSecretary;
  const canView = canEdit || isWorshipfulMaster;
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [candEmails, setCandEmails] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: cands }] = await Promise.all([
      (supabase.from as any)("membership_enquiries")
        .select("id,full_name,email,phone,reason,source,status,created_at,converted_candidate_id,notes")
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

  const visible = useMemo(() => rows.filter((r) => tabOf(r) === tab), [rows, tab]);

  const dismiss = async (e: Enquiry) => {
    setBusy(e.id);
    const trimmed = note.trim();
    const notes = trimmed ? [e.notes, `Dismissed: ${trimmed}`].filter(Boolean).join("\n") : e.notes;
    const { error } = await (supabase.from as any)("membership_enquiries").update({ status: "declined", notes }).eq("id", e.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${e.full_name} dismissed`);
    setDismissing(null); setNote("");
    load();
  };

  const convert = async (e: Enquiry, linkExisting: boolean) => {
    const msg = linkExisting
      ? `${e.full_name} is already on the candidates list. Mark this enquiry as converted and link it to that record (no new candidate is created)?`
      : `Create a new candidate record for ${e.full_name}?`;
    if (!confirm(msg)) return;
    setBusy(e.id);
    const { data, error } = await supabase.rpc("convert_enquiry_to_candidate" as any, { _enquiry_id: e.id, _link_existing: linkExisting } as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    const candId = data as unknown as string | null;
    toast.success(linkExisting ? "Linked to existing candidate" : "Candidate created", candId ? {
      action: { label: "View candidate", onClick: () => navigate(candidateHref(candId)) },
    } : undefined);
    load();
  };

  if (!canView) {
    return <MembersLayout><p className="text-primary-foreground/70">You don't have permission to view membership enquiries.</p></MembersLayout>;
  }

  const btn = "inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider px-2.5 py-1.5 rounded-sm disabled:opacity-50";
  const tabs: [Tab, string][] = [["new", "New"], ["converted", "Converted"], ["dismissed", "Dismissed"]];

  return (
    <MembersLayout>
      <Link to="/members/admin/secretary" className="inline-flex items-center gap-1 text-xs text-gold/80 hover:text-gold mb-3">
        <ArrowLeft className="w-3 h-3" /> Secretary Portal
      </Link>
      <header className="mb-4">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Membership Enquiries</h1>
        <p className="text-primary-foreground/60 text-sm">Enquiries from the public Join Us form. Convert genuine ones to candidates and dismiss the rest.</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`${btn} border ${tab === k ? "border-gold bg-gold/15 text-gold" : "border-gold/20 text-primary-foreground/70 hover:border-gold/50"}`}>
            {l} ({rows.filter((r) => tabOf(r) === k).length})
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
            const t = tabOf(e);
            const existing = t === "new" && e.email ? candEmails.get(e.email.toLowerCase()) : undefined;
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
                  <span className="text-[10px] uppercase tracking-wider border border-gold/30 text-gold/90 rounded-sm px-2 py-1">
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </div>
                {e.reason && <p className="text-sm text-primary-foreground/80 mt-3 whitespace-pre-line">{e.reason}</p>}
                {e.notes && <p className="text-xs text-primary-foreground/60 mt-2 whitespace-pre-line italic">{e.notes}</p>}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {t === "converted" ? (
                    e.converted_candidate_id ? (
                      <Link to={candidateHref(e.converted_candidate_id)} className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline">
                        <CheckCircle2 className="w-4 h-4" /> View linked candidate <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gold"><CheckCircle2 className="w-4 h-4" /> Converted</span>
                    )
                  ) : t === "new" && canEdit ? (
                    <>
                      {existing ? (
                        <>
                          <span className="text-xs text-gold">Already on the candidates list (matched by email).</span>
                          <button disabled={busy === e.id} onClick={() => convert(e, true)} className={`${btn} border border-gold/40 text-gold hover:bg-gold/10`}>
                            <Link2 className="w-3.5 h-3.5" /> Link & mark converted
                          </button>
                        </>
                      ) : (
                        <button disabled={busy === e.id} onClick={() => convert(e, false)} className={`${btn} text-accent-foreground bg-gold-shimmer font-semibold`}>
                          <UserPlus className="w-3.5 h-3.5" /> Convert to candidate
                        </button>
                      )}
                      {dismissing === e.id ? (
                        <div className="flex flex-wrap items-center gap-2 w-full mt-1">
                          <input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Reason (optional), e.g. spam, test"
                            aria-label="Dismissal note"
                            className="flex-1 min-w-[12rem] bg-navy border border-gold/20 rounded-sm px-2 py-1.5 text-xs text-primary-foreground" />
                          <button disabled={busy === e.id} onClick={() => dismiss(e)} className={`${btn} border border-gold/40 text-gold`}>Confirm dismiss</button>
                          <button onClick={() => { setDismissing(null); setNote(""); }} className={`${btn} text-primary-foreground/60`}>Cancel</button>
                        </div>
                      ) : (
                        <button disabled={busy === e.id} onClick={() => { setDismissing(e.id); setNote(""); }} className={`${btn} border border-gold/20 text-primary-foreground/70 hover:border-gold/50`}>
                          <Ban className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      )}
                    </>
                  ) : null}
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
