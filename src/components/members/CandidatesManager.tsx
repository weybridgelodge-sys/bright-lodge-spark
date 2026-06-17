import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, UserPlus } from "lucide-react";
import {
  type Candidate,
  type CandidateStage,
  CANDIDATE_STAGE_LABELS,
  CANDIDATE_STAGE_ORDER,
} from "@/lib/kpis";

const EMPTY: Omit<Candidate, "id" | "created_at" | "updated_at"> = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  proposer: "",
  seconder: "",
  stage: "enquiry",
  notes: "",
  date_of_enquiry: new Date().toISOString().slice(0, 10),
  converted_member_id: null,
};

export default function CandidatesManager({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<typeof EMPTY>(EMPTY);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)("candidates")
      .select("*")
      .order("date_of_enquiry", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Candidate[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!draft.first_name.trim() || !draft.last_name.trim()) {
      toast.error("First and last name required");
      return;
    }
    const { error } = await (supabase.from as any)("candidates").insert(draft);
    if (error) return toast.error(error.message);
    toast.success("Candidate added");
    setDraft(EMPTY);
    setAdding(false);
    load();
    onChange?.();
  };

  const updateRow = async (id: string, patch: Partial<Candidate>) => {
    const { error } = await (supabase.from as any)("candidates").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
    onChange?.();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this candidate?")) return;
    const { error } = await (supabase.from as any)("candidates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
    onChange?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-primary-foreground/60">
          Prospective candidates feed the Pipeline KPI before initiation.
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gold border border-gold/40 px-2.5 py-1.5 rounded-sm hover:bg-gold/10"
          >
            <Plus className="w-3.5 h-3.5" /> Add candidate
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-navy/60 border border-gold/15 rounded-sm p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input label="First name" value={draft.first_name} onChange={(v) => setDraft({ ...draft, first_name: v })} />
            <Input label="Last name" value={draft.last_name} onChange={(v) => setDraft({ ...draft, last_name: v })} />
            <Input label="Email" value={draft.email ?? ""} onChange={(v) => setDraft({ ...draft, email: v })} />
            <Input label="Phone" value={draft.phone ?? ""} onChange={(v) => setDraft({ ...draft, phone: v })} />
            <Input label="Proposer" value={draft.proposer ?? ""} onChange={(v) => setDraft({ ...draft, proposer: v })} />
            <Input label="Seconder" value={draft.seconder ?? ""} onChange={(v) => setDraft({ ...draft, seconder: v })} />
            <div>
              <Label>Stage</Label>
              <StageSelect value={draft.stage} onChange={(s) => setDraft({ ...draft, stage: s })} />
            </div>
            <Input
              label="Date of enquiry"
              type="date"
              value={draft.date_of_enquiry ?? ""}
              onChange={(v) => setDraft({ ...draft, date_of_enquiry: v })}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full bg-navy border border-gold/20 rounded-sm px-2 py-1.5 text-xs"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setAdding(false);
                setDraft(EMPTY);
              }}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-foreground/70 border border-gold/20 px-2.5 py-1.5 rounded-sm"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={save}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-accent-foreground bg-gold-shimmer px-2.5 py-1.5 rounded-sm font-semibold"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-primary-foreground/60">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-primary-foreground/60 italic">
          No candidates yet. Add the first prospective brother above.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div
              key={c.id}
              className="bg-navy/60 border border-gold/10 rounded-sm p-3 flex flex-wrap items-center gap-3"
            >
              <div className="flex-1 min-w-[10rem]">
                <p className="font-medium text-sm flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5 text-gold" />
                  {c.first_name} {c.last_name}
                </p>
                <p className="text-[11px] text-primary-foreground/60">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact"}
                  {c.proposer && ` · Prop: ${c.proposer}`}
                  {c.seconder && ` · Sec: ${c.seconder}`}
                </p>
                {c.notes && <p className="text-[11px] text-primary-foreground/50 mt-1">{c.notes}</p>}
              </div>
              <StageSelect
                value={c.stage}
                onChange={(s) => updateRow(c.id, { stage: s })}
              />
              <button
                onClick={() => remove(c.id)}
                className="text-primary-foreground/50 hover:text-red-400 p-1"
                aria-label="Delete candidate"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] uppercase tracking-wider text-primary-foreground/60 mb-1">{children}</label>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-navy border border-gold/20 rounded-sm px-2 py-1.5 text-xs"
      />
    </div>
  );
}

function StageSelect({
  value,
  onChange,
}: {
  value: CandidateStage;
  onChange: (s: CandidateStage) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CandidateStage)}
      className="bg-navy border border-gold/20 rounded-sm px-2 py-1.5 text-xs text-primary-foreground"
    >
      {CANDIDATE_STAGE_ORDER.map((s) => (
        <option key={s} value={s}>
          {CANDIDATE_STAGE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
