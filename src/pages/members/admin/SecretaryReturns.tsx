import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileCheck, Plus, Pencil, Trash2, Download, CalendarClock } from "lucide-react";
import { masonicYearStart } from "@/lib/loi";
import { treasurerYearBounds } from "@/lib/treasurer/reports";

type ReturnType =
  | "form_p"
  | "lp_a5_certificate"
  | "candidate_letter"
  | "clearance_letter"
  | "change_of_status"
  | "installation_return"
  | "provincial_return"
  | "other";

type ReturnStatus = "draft" | "submitted" | "acknowledged";

const TYPE_LABELS: Record<ReturnType, string> = {
  form_p: "Form P",
  lp_a5_certificate: "LP&A5 certificate application",
  candidate_letter: "Candidate letter",
  clearance_letter: "Clearance letter",
  change_of_status: "Change of status",
  installation_return: "Installation Return",
  provincial_return: "Provincial Return",
  other: "Other",
};

const STATUS_LABELS: Record<ReturnStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  acknowledged: "Acknowledged",
};

const currentLodgeYear = masonicYearStart();
const MASONIC_YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => currentLodgeYear - 5 + i);

type Row = {
  id: string;
  return_type: ReturnType;
  member_id: string | null;
  candidate_id: string | null;
  masonic_year: number | null;
  date_submitted: string | null;
  date_due: string | null;
  status: ReturnStatus;
  file_path: string | null;
  notes: string | null;
};

type Person = { key: string; kind: "member" | "candidate"; id: string; name: string };

const EMPTY = {
  id: "",
  return_type: "form_p" as ReturnType,
  personKey: "",
  masonic_year: String(masonicYearStart()),
  date_submitted: "",
  date_due: "",
  status: "draft" as ReturnStatus,
  notes: "",
};

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dueBadge(row: Row) {
  if (!row.date_due || row.status === "acknowledged") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(row.date_due);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) {
    return (
      <Badge variant="outline" className="border-red-500/50 text-red-400 text-[10px] px-1.5 py-0">
        <CalendarClock className="w-3 h-3 mr-1" /> Overdue
      </Badge>
    );
  }
  if (diff <= 7) {
    return (
      <Badge variant="outline" className="border-amber-400/50 text-amber-300 text-[10px] px-1.5 py-0">
        <CalendarClock className="w-3 h-3 mr-1" /> Due in {diff}d
      </Badge>
    );
  }
  return null;
}

function Inner() {
  const { isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster, user } = useAuth();
  const canManage = isAdmin || isSecretary || isAssistantSecretary || isWorshipfulMaster;
  const { toast } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const [fType, setFType] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fYear, setFYear] = useState<string>("all");
  const [fSearch, setFSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [r, p, c] = await Promise.all([
      (supabase.from as any)("secretary_returns").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,first_name,last_name,full_name,status"),
      (supabase.from as any)("candidates").select("id,first_name,last_name"),
    ]);
    if (r.error) toast({ title: "Could not load returns", description: r.error.message, variant: "destructive" });
    setRows((r.data as Row[]) ?? []);
    const members: Person[] = ((p.data as any[]) ?? [])
      .filter((m) => m.status === "active")
      .map((m) => ({
        key: `member:${m.id}`,
        kind: "member" as const,
        id: m.id,
        name: `${[m.first_name, m.last_name].filter(Boolean).join(" ") || m.full_name || "Unnamed"} (Member)`,
      }));
    const cands: Person[] = ((c.data as any[]) ?? []).map((x) => ({
      key: `candidate:${x.id}`,
      kind: "candidate" as const,
      id: x.id,
      name: `${[x.first_name, x.last_name].filter(Boolean).join(" ")} (Candidate)`,
    }));
    setPeople([...members, ...cands].sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const personName = (row: Row) => {
    if (row.member_id) return people.find((p) => p.key === `member:${row.member_id}`)?.name ?? "Member";
    if (row.candidate_id) return people.find((p) => p.key === `candidate:${row.candidate_id}`)?.name ?? "Candidate";
    return "—";
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (fType !== "all" && r.return_type !== fType) return false;
        if (fStatus !== "all" && r.status !== fStatus) return false;
        if (fYear !== "all" && String(r.masonic_year ?? "") !== fYear) return false;
        if (fSearch.trim() && !personName(r).toLowerCase().includes(fSearch.trim().toLowerCase())) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, people, fType, fStatus, fYear, fSearch]
  );

  const startNew = () => {
    setForm(EMPTY);
    setFile(null);
    setOpen(true);
  };

  const startEdit = (r: Row) => {
    setForm({
      id: r.id,
      return_type: r.return_type,
      personKey: r.member_id ? `member:${r.member_id}` : r.candidate_id ? `candidate:${r.candidate_id}` : "",
      masonic_year: r.masonic_year != null ? String(r.masonic_year) : "",
      date_submitted: r.date_submitted ?? "",
      date_due: r.date_due ?? "",
      status: r.status,
      notes: r.notes ?? "",
    });
    setFile(null);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      let filePath: string | null = null;
      if (file) {
        const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("secretary-returns").upload(path, file);
        if (upErr) throw upErr;
        filePath = path;
      }
      const person = people.find((p) => p.key === form.personKey);
      const payload: Record<string, unknown> = {
        return_type: form.return_type,
        member_id: person?.kind === "member" ? person.id : null,
        candidate_id: person?.kind === "candidate" ? person.id : null,
        masonic_year: form.masonic_year.trim() ? Number(form.masonic_year) : null,
        date_submitted: form.date_submitted || null,
        date_due: form.date_due || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      if (filePath) payload.file_path = filePath;

      if (form.id) {
        const { error } = await (supabase.from as any)("secretary_returns").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id ?? null;
        const { error } = await (supabase.from as any)("secretary_returns").insert(payload);
        if (error) throw error;
      }
      toast({ title: form.id ? "Return updated" : "Return logged" });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: Row) => {
    if (!confirm("Delete this return? This cannot be undone.")) return;
    if (r.file_path) await supabase.storage.from("secretary-returns").remove([r.file_path]);
    const { error } = await (supabase.from as any)("secretary_returns").delete().eq("id", r.id);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    toast({ title: "Return deleted" });
    load();
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("secretary-returns").createSignedUrl(path, 300);
    if (error || !data) return toast({ title: "Could not open file", description: error?.message, variant: "destructive" });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (!canManage) {
    return (
      <MembersLayout>
        <p className="text-primary-foreground/70">You don't have permission to view Returns &amp; Certificates.</p>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-gold flex items-center gap-2">
            <FileCheck className="w-6 h-6" /> Returns &amp; Certificates
          </h1>
          <p className="text-primary-foreground/60 text-sm">
            UGLE and Provincial forms, certificates and letters.
          </p>
        </div>
        <Button onClick={startNew} className="bg-gold-shimmer text-accent-foreground">
          <Plus className="w-4 h-4 mr-1" /> Log a new return
        </Button>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Select value={fType} onValueChange={setFType}>
          <SelectTrigger className="bg-navy border-gold/20 text-primary-foreground"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(TYPE_LABELS) as ReturnType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="bg-navy border-gold/20 text-primary-foreground"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as ReturnStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fYear} onValueChange={setFYear}>
          <SelectTrigger className="bg-navy border-gold/20 text-primary-foreground"><SelectValue placeholder="All years" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {MASONIC_YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>Masonic year {treasurerYearBounds(y).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Search name" value={fSearch} onChange={(e) => setFSearch(e.target.value)} className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40" />
      </div>

      {loading ? (
        <p className="text-primary-foreground/60 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-primary-foreground/60 text-sm">No returns logged yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-sm border border-gold/15 bg-navy-light/30 p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gold font-serif">{TYPE_LABELS[r.return_type]}</span>
                  <Badge variant="outline" className="border-gold/40 text-gold/90 text-[10px] px-1.5 py-0">
                    {STATUS_LABELS[r.status]}
                  </Badge>
                  {dueBadge(r)}
                </div>
                <p className="text-primary-foreground/80 text-sm mt-1">{personName(r)}</p>
                <p className="text-primary-foreground/60 text-xs mt-1">
                  {r.masonic_year ? `Masonic year ${r.masonic_year} · ` : ""}
                  Submitted: {r.date_submitted ?? "—"} · Due: {r.date_due ?? "—"}
                </p>
                {r.notes && <p className="text-primary-foreground/60 text-xs mt-1 whitespace-pre-wrap">{r.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                {r.file_path && (
                  <Button size="sm" variant="outline" onClick={() => download(r.file_path!)}>
                    <Download className="w-3 h-3 mr-1" /> File
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(r)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-navy-dark text-primary-foreground border-gold/30">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit return" : "Log a new return"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-primary-foreground/70">Return type</label>
              <Select
                value={form.return_type}
                onValueChange={(v) => {
                  const rt = v as ReturnType;
                  setForm((f) => ({
                    ...f,
                    return_type: rt,
                    date_due:
                      rt === "lp_a5_certificate" && f.date_submitted && !f.date_due
                        ? addDays(f.date_submitted, 28)
                        : f.date_due,
                  }));
                }}
              >
                <SelectTrigger className="bg-navy border-gold/20 text-primary-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as ReturnType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-primary-foreground/70">Person (member or candidate)</label>
              <Select value={form.personKey || "none"} onValueChange={(v) => setForm({ ...form, personKey: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-navy border-gold/20 text-primary-foreground"><SelectValue placeholder="Not person-specific" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="none">Not person-specific</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-primary-foreground/70">Masonic year</label>
                <Input type="number" value={form.masonic_year} onChange={(e) => setForm({ ...form, masonic_year: e.target.value })} className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40" />
              </div>
              <div>
                <label className="text-xs text-primary-foreground/70">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ReturnStatus })}>
                  <SelectTrigger className="bg-navy border-gold/20 text-primary-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as ReturnStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-primary-foreground/70">Date submitted</label>
                <Input
                  type="date"
                  value={form.date_submitted}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      date_submitted: v,
                      date_due: f.return_type === "lp_a5_certificate" && v ? addDays(v, 28) : f.date_due,
                    }));
                  }}
                  className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs text-primary-foreground/70">Date due</label>
                <Input type="date" value={form.date_due} onChange={(e) => setForm({ ...form, date_due: e.target.value })} className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40 [color-scheme:dark]" />
              </div>
            </div>

            <div>
              <label className="text-xs text-primary-foreground/70">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40" />
            </div>

            <div>
              <label className="text-xs text-primary-foreground/70">Attachment (PDF)</label>
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-gold-shimmer text-accent-foreground">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MembersLayout>
  );
}

export default function SecretaryReturns() {
  return <Inner />;
}
