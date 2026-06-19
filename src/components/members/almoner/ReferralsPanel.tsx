import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LifeBuoy, Plus, Trash2, X } from "lucide-react";

type Member = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; full_name: string | null };
type ReferralType = "financial_grant" | "education" | "medical" | "relief_chest" | "bereavement_support" | "other";
type Status = "considering" | "submitted" | "under_review" | "approved" | "declined" | "closed";
type Row = {
  id: string; member_id: string; referral_date: string; referral_type: ReferralType;
  status: Status; summary: string; outcome: string | null; closed_date: string | null;
};

const TYPE_LABEL: Record<ReferralType, string> = {
  financial_grant: "Financial grant", education: "Education", medical: "Medical",
  relief_chest: "Relief Chest", bereavement_support: "Bereavement support", other: "Other",
};
const STATUS_LABEL: Record<Status, string> = {
  considering: "Considering", submitted: "Submitted", under_review: "Under review",
  approved: "Approved", declined: "Declined", closed: "Closed",
};
const STATUS_COLOR: Record<Status, string> = {
  considering: "border-primary-foreground/30 text-primary-foreground/70",
  submitted: "border-blue-400/50 text-blue-400",
  under_review: "border-amber-400/50 text-amber-400",
  approved: "border-emerald-400/50 text-emerald-400",
  declined: "border-red-500/50 text-red-400",
  closed: "border-primary-foreground/20 text-primary-foreground/50",
};

const memberName = (m?: Member) => {
  if (!m) return "—";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};
const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ReferralsPanel({ members, userId }: { members: Member[]; userId: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const load = async () => {
    const { data, error } = await (supabase as any).from("welfare_rmtgb_referrals")
      .select("*").is("deleted_at", null).order("referral_date", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: Status) => {
    const update: Record<string, unknown> = { status };
    if (status === "closed" || status === "declined" || status === "approved") {
      update.closed_date = new Date().toISOString().slice(0, 10);
    }
    const { error } = await (supabase as any).from("welfare_rmtgb_referrals").update(update).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated"); load();
  };

  const archive = async (id: string) => {
    if (!confirm("Archive this referral?")) return;
    const { error } = await (supabase as any).from("welfare_rmtgb_referrals")
      .update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Archived"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-primary-foreground">MCF / Provincial Referrals</h3>
          <p className="text-xs text-primary-foreground/60">Tracked welfare and charitable referrals</p>
        </div>
        <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> New referral</>}
        </Button>
      </div>

      {showForm && <NewForm members={members} userId={userId} onSaved={() => { setShowForm(false); load(); }} />}

      {rows.length === 0 ? (
        <p className="text-sm text-primary-foreground/60 italic">No referrals on record.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <article key={r.id} className="bg-navy-light/40 border border-gold/15 rounded p-4">
              <div className="flex items-start gap-3 mb-2">
                <LifeBuoy className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-foreground">{memberName(memberMap.get(r.member_id))}</p>
                  <p className="text-[11px] text-primary-foreground/60">{TYPE_LABEL[r.referral_type]} · referred {fmt(r.referral_date)}{r.closed_date ? ` · closed ${fmt(r.closed_date)}` : ""}</p>
                </div>
                <Select value={r.status} onValueChange={(v) => changeStatus(r.id, v as Status)}>
                  <SelectTrigger className="w-[140px] h-7 text-[11px] bg-navy border-gold/30 text-primary-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{(Object.keys(STATUS_LABEL) as Status[]).map((k) => <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>)}</SelectContent>
                </Select>
                <button onClick={() => archive(r.id)} className="text-primary-foreground/40 hover:text-red-400" aria-label="Archive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Badge variant="outline" className={`${STATUS_COLOR[r.status]} text-[10px] mb-2`}>{STATUS_LABEL[r.status]}</Badge>
              <p className="text-sm text-primary-foreground/85 whitespace-pre-wrap">{r.summary}</p>
              {r.outcome && (
                <p className="text-xs text-primary-foreground/70 mt-2">
                  <span className="uppercase tracking-wider text-primary-foreground/50 mr-1">Outcome:</span>{r.outcome}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NewForm({ members, userId, onSaved }: { members: Member[]; userId: string | null; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [memberId, setMemberId] = useState<string>("");
  const [referralDate, setReferralDate] = useState(today);
  const [referralType, setReferralType] = useState<ReferralType>("financial_grant");
  const [status, setStatus] = useState<Status>("considering");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const inputCls = "bg-navy text-primary-foreground border-gold/30";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !summary.trim()) { toast.error("Member and summary are required"); return; }
    setBusy(true);
    const { error } = await (supabase as any).from("welfare_rmtgb_referrals").insert({
      member_id: memberId, referral_date: referralDate, referral_type: referralType,
      status, summary: summary.trim(), created_by: userId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Referral logged"); onSaved();
  };

  const sortedMembers = useMemo(() => [...members].sort((a, b) => memberName(a).localeCompare(memberName(b))), [members]);

  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs">Member</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{sortedMembers.map((m) => <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={referralDate} onChange={(e) => setReferralDate(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(STATUS_LABEL) as Status[]).map((k) => <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Type</Label>
        <Select value={referralType} onValueChange={(v) => setReferralType(v as ReferralType)}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.keys(TYPE_LABEL) as ReferralType[]).map((k) => <SelectItem key={k} value={k}>{TYPE_LABEL[k]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Summary</Label>
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} rows={4} required maxLength={3000} />
      </div>
      <Button type="submit" disabled={busy} className="bg-gold text-navy hover:bg-gold/90">Save referral</Button>
    </form>
  );
}
