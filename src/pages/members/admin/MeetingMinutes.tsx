import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { NotebookPen, Plus, Pencil, Trash2, Download, ArrowUp, ArrowDown, X, ChevronDown, ChevronRight } from "lucide-react";
import { masonicYearStart } from "@/lib/loi";
import { treasurerYearBounds } from "@/lib/treasurer/reports";
import { reportPdfDoc, reportSection, INK, MUTED, GOLD, NAVY, fmtDate } from "@/lib/treasurer/reports";
import autoTable from "jspdf-autotable";

type MinutesType = "regular" | "committee";
type MinutesStatus = "draft" | "approved";

type Section = { heading: string; body: string };
type ActionItem = { task: string; responsible: string; deadline: string; done: boolean };

type Row = {
  id: string;
  meeting_type: MinutesType;
  meeting_date: string;
  title: string;
  lodge_event_id: string | null;
  status: MinutesStatus;
  approved_date: string | null;
  apologies: string | null;
  previous_minutes_note: string | null;
  sections: Section[];
  action_items: ActionItem[];
  next_meeting_date: string | null;
  transcript_text: string | null;
};

type LodgeEvent = { id: string; title: string; event_date: string };
type AgendaItem = { label?: string; children?: AgendaItem[] };

const TYPE_LABELS: Record<MinutesType, string> = { regular: "Regular", committee: "Committee" };
const STATUS_LABELS: Record<MinutesStatus, string> = { draft: "Draft", approved: "Approved" };

/** The recurring Lodge Committee agenda — a starting skeleton the Secretary edits per meeting. */
const COMMITTEE_SKELETON: Section[] = [
  { heading: "Matters Arising", body: "" },
  { heading: "Update and Confirmation of Lodge Officers", body: "" },
  { heading: "Meeting Arrangements", body: "" },
  { heading: "AOB", body: "" },
];

const currentLodgeYear = masonicYearStart();
const MASONIC_YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => currentLodgeYear - 5 + i);

const INPUT = "bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40";
const DATE_INPUT = `${INPUT} [color-scheme:dark]`;

function flattenAgenda(items: AgendaItem[], depth = 0): string[] {
  const out: string[] = [];
  for (const it of items ?? []) {
    if (it?.label) out.push(depth > 0 ? `— ${it.label}` : it.label);
    if (Array.isArray(it?.children) && it.children.length) out.push(...flattenAgenda(it.children, depth + 1));
  }
  return out;
}

function masonicYearOf(iso: string) {
  const y = Number(iso.slice(0, 4));
  return iso >= `${y}-10-01` ? y : y - 1;
}

export async function buildMinutesPdf(row: Row) {
  const { doc, pageW, margin } = await reportPdfDoc(
    `${TYPE_LABELS[row.meeting_type]} Meeting Minutes`,
    `${row.title} — ${fmtDate(row.meeting_date)}`,
  );
  const usableW = pageW - margin * 2;
  let y = 135;

  const ensure = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 50;
    }
  };

  const paragraph = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    // Split on blank lines (\n\n) or single newlines so either convention
    // yields distinct paragraphs in the PDF.
    const paras = (text || "")
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const list = paras.length > 0 ? paras : ["—"];
    list.forEach((p, pi) => {
      const lines = doc.splitTextToSize(p, usableW);
      lines.forEach((line: string, li: number) => {
        ensure(14);
        doc.text(line, margin, y);
        y += 13;
      });
      // Extra gap between paragraphs so breaks are visually distinct from line wrap.
      if (pi < list.length - 1) y += 7;
    });
    y += 8;
  };

  const heading = (title: string) => {
    ensure(40);
    y = reportSection(doc, pageW, margin, y, title);
  };

  if (row.apologies) {
    heading("Apologies");
    paragraph(row.apologies);
  }
  if (row.previous_minutes_note) {
    heading("Minutes of the previous meeting");
    paragraph(row.previous_minutes_note);
  }

  for (const s of row.sections ?? []) {
    heading(s.heading || "Untitled item");
    paragraph(s.body);
  }

  if ((row.action_items ?? []).length) {
    heading("Action items");
    autoTable(doc, {
      startY: y,
      head: [["Task", "Responsible", "Deadline", "Done"]],
      body: row.action_items.map((a) => [a.task, a.responsible, a.deadline, a.done ? "Yes" : "No"]),
      margin: { left: margin, right: margin, bottom: 50 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4, overflow: "linebreak" },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      theme: "grid",
      columnStyles: { 0: { cellWidth: 250 }, 1: { cellWidth: 110 }, 2: { cellWidth: 90 }, 3: { cellWidth: 50 } },
      rowPageBreak: "avoid",
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  if (row.next_meeting_date) {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`Date of the next meeting: ${fmtDate(row.next_meeting_date)}`, margin, y);
    y += 26;
  }

  ensure(120);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Signed as a true record:", margin, y);
  y += 34;
  doc.text("Worshipful Master: ______________________________", margin, y);
  doc.text("Dated: __________________", pageW - margin - 180, y);
  y += 34;
  doc.text("Secretary: _______________________________________", margin, y);
  doc.text("Dated: __________________", pageW - margin - 180, y);
  y += 26;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    row.status === "approved" && row.approved_date
      ? `Confirmed at the meeting held on ${fmtDate(row.approved_date)}.`
      : "Draft — not yet confirmed.",
    margin,
    y,
  );

  return doc;
}

function Inner() {
  const { isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster, user } = useAuth();
  const canManage = isAdmin || isSecretary || isAssistantSecretary || isWorshipfulMaster;
  const { toast } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [events, setEvents] = useState<LodgeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fYear, setFYear] = useState("all");

  // New-minutes dialog
  const [newOpen, setNewOpen] = useState(false);
  const [nType, setNType] = useState<MinutesType>("regular");
  const [nTitle, setNTitle] = useState("");
  const [nDate, setNDate] = useState("");
  const [nEventId, setNEventId] = useState("");
  const [busy, setBusy] = useState(false);

  // Edit form
  const [editing, setEditing] = useState<Row | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const load = async () => {
    setLoading(true);
    const [m, e] = await Promise.all([
      (supabase.from as any)("meeting_minutes").select("*").order("meeting_date", { ascending: false }),
      supabase.from("lodge_events").select("id,title,event_date").order("event_date", { ascending: false }),
    ]);
    if (m.error) toast({ title: "Could not load minutes", description: m.error.message, variant: "destructive" });
    setRows(((m.data as any[]) ?? []).map((r) => ({
      ...r,
      sections: Array.isArray(r.sections) ? r.sections : [],
      action_items: Array.isArray(r.action_items) ? r.action_items : [],
    })) as Row[]);
    setEvents(((e.data as any[]) ?? []) as LodgeEvent[]);
    setLoading(false);
  };

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (fType !== "all" && r.meeting_type !== fType) return false;
        if (fStatus !== "all" && r.status !== fStatus) return false;
        if (fYear !== "all" && String(masonicYearOf(r.meeting_date)) !== fYear) return false;
        return true;
      }),
    [rows, fType, fStatus, fYear],
  );

  const startNew = () => {
    setNType("regular");
    setNTitle("");
    setNDate("");
    setNEventId("");
    setNewOpen(true);
  };

  const createMinutes = async () => {
    if (!nTitle.trim() || !nDate) {
      toast({ title: "Add a title and a meeting date", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      let sections: Section[] = [];
      if (nType === "committee") {
        sections = COMMITTEE_SKELETON.map((s) => ({ ...s }));
      } else if (nEventId) {
        const { data } = await (supabase.from as any)("summonses")
          .select("agenda")
          .eq("lodge_event_id", nEventId)
          .order("created_at", { ascending: false })
          .limit(1);
        const agenda = (data as any[])?.[0]?.agenda;
        sections = flattenAgenda(Array.isArray(agenda) ? agenda : []).map((label) => ({ heading: label, body: "" }));
      }
      const payload = {
        meeting_type: nType,
        meeting_date: nDate,
        title: nTitle.trim(),
        lodge_event_id: nType === "regular" && nEventId ? nEventId : null,
        sections,
        action_items: [],
        created_by: user?.id ?? null,
      };
      const { data, error } = await (supabase.from as any)("meeting_minutes").insert(payload).select("*").single();
      if (error) throw error;
      toast({ title: "Minutes created" });
      setNewOpen(false);
      await load();
      setEditing({ ...(data as Row), sections, action_items: [] });
    } catch (err: any) {
      toast({ title: "Could not create minutes", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveEditing = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const { error } = await (supabase.from as any)("meeting_minutes")
        .update({
          title: editing.title,
          meeting_date: editing.meeting_date,
          apologies: editing.apologies?.trim() || null,
          previous_minutes_note: editing.previous_minutes_note?.trim() || null,
          sections: editing.sections,
          action_items: editing.action_items,
          next_meeting_date: editing.next_meeting_date || null,
          status: editing.status,
          approved_date: editing.status === "approved" ? editing.approved_date || null : null,
          transcript_text: editing.transcript_text?.trim() || null,
        })
        .eq("id", editing.id);
      if (error) throw error;
      toast({ title: "Minutes saved" });
      setEditing(null);
      load();
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: Row) => {
    if (!confirm("Delete these minutes? This cannot be undone.")) return;
    const { error } = await (supabase.from as any)("meeting_minutes").delete().eq("id", r.id);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    toast({ title: "Minutes deleted" });
    load();
  };

  const exportPdf = async (r: Row) => {
    try {
      const doc = await buildMinutesPdf(r);
      doc.save(`minutes-${r.meeting_date}-${r.meeting_type}.pdf`);
    } catch (e: any) {
      toast({ title: "Could not build the PDF", description: e.message, variant: "destructive" });
    }
  };

  // Section / action-item editors
  const patch = (p: Partial<Row>) => setEditing((prev) => (prev ? { ...prev, ...p } : prev));

  const setSection = (i: number, p: Partial<Section>) =>
    patch({ sections: editing!.sections.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });
  const addSection = () => patch({ sections: [...editing!.sections, { heading: "", body: "" }] });
  const removeSection = (i: number) => patch({ sections: editing!.sections.filter((_, idx) => idx !== i) });
  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= editing!.sections.length) return;
    const next = [...editing!.sections];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ sections: next });
  };

  const parsePastedMinutes = () => {
    if (!editing) return;
    const raw = pasteText;
    if (!raw.trim()) {
      toast({ title: "Paste the minutes text first", variant: "destructive" });
      return;
    }
    const lines = raw.split(/\r?\n/);
    const isNumbered = (l: string) => /^\d+\.\s+[A-Z][A-Z\s,'’&/-]+$/.test(l);
    const isLettered = (l: string) => /^(AOB\s*)?[ivxlc]+\)\s+.+$/i.test(l);
    const nextNonBlank = (i: number) => {
      for (let j = i + 1; j < lines.length; j++) if (lines[j].trim()) return lines[j].trim();
      return "";
    };
    const isHeading = (i: number) => {
      const l = lines[i].trim();
      if (!l) return false;
      if (isNumbered(l) || isLettered(l)) return true;
      if (l.length < 90 && !/[.,;:]$/.test(l)) {
        const nxt = nextNonBlank(i);
        if (nxt.length > 90) return true;
      }
      return false;
    };
    const parsed: { heading: string; bodyLines: string[] }[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (isHeading(i)) parsed.push({ heading: lines[i].trim(), bodyLines: [] });
      else if (parsed.length) parsed[parsed.length - 1].bodyLines.push(lines[i]);
    }
    if (parsed.length === 0) {
      toast({
        title: "Couldn't detect section headings — check the pasted text follows the usual numbered/lettered heading style, or add sections manually below",
        variant: "destructive",
      });
      return;
    }
    if (!confirm("This will replace all current sections with the parsed result. Continue?")) return;
    let apologies = editing.apologies ?? "";
    let prevNote = editing.previous_minutes_note ?? "";
    const sections: Section[] = [];
    for (const p of parsed) {
      // Preserve blank-line-separated paragraphs in the body.
      const body = p.bodyLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      const h = p.heading.toLowerCase();
      if (h.includes("apolog")) {
        if (body) apologies = body;
      } else if ((h.includes("confirm") || h.includes("previous")) && h.includes("minutes")) {
        if (body) prevNote = body;
      } else {
        sections.push({ heading: p.heading, body });
      }
    }
    patch({ sections, apologies, previous_minutes_note: prevNote });
    toast({ title: `Parsed ${parsed.length} headings into ${sections.length} sections` });
  };

  const setAction = (i: number, p: Partial<ActionItem>) =>
    patch({ action_items: editing!.action_items.map((a, idx) => (idx === i ? { ...a, ...p } : a)) });
  const addAction = () =>
    patch({ action_items: [...editing!.action_items, { task: "", responsible: "", deadline: "", done: false }] });
  const removeAction = (i: number) => patch({ action_items: editing!.action_items.filter((_, idx) => idx !== i) });

  if (!canManage) {
    return (
      <MembersLayout>
        <p className="text-primary-foreground/70">You don't have permission to view Meeting Minutes.</p>
      </MembersLayout>
    );
  }

  if (editing) {
    return (
      <MembersLayout>
        <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-gold flex items-center gap-2">
              <NotebookPen className="w-6 h-6" /> {editing.title}
            </h1>
            <p className="text-primary-foreground/60 text-sm">
              {TYPE_LABELS[editing.meeting_type]} meeting · {editing.meeting_date}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Back to register</Button>
            <Button onClick={saveEditing} disabled={busy} className="bg-gold-shimmer text-accent-foreground">
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </header>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-primary-foreground/70">Title</label>
              <Input value={editing.title} onChange={(e) => patch({ title: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-primary-foreground/70">Meeting date</label>
              <Input type="date" value={editing.meeting_date} onChange={(e) => patch({ meeting_date: e.target.value })} className={DATE_INPUT} />
            </div>
          </div>

          <div>
            <label className="text-xs text-primary-foreground/70">Apologies</label>
            <Textarea rows={2} value={editing.apologies ?? ""} onChange={(e) => patch({ apologies: e.target.value })} className={INPUT} />
          </div>

          <div>
            <label className="text-xs text-primary-foreground/70">Minutes of the previous meeting (confirmation / amendments)</label>
            <Textarea rows={2} value={editing.previous_minutes_note ?? ""} onChange={(e) => patch({ previous_minutes_note: e.target.value })} className={INPUT} />
          </div>

          <section>
            <label className="text-xs text-primary-foreground/70">Paste full minutes text</label>
            <p className="text-xs text-primary-foreground/50 mb-1">
              Paste the complete finished minutes as one block, then click Parse — this replaces the sections below.
            </p>
            <Textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className={INPUT}
              placeholder={"1. APOLOGIES FOR ABSENCE\nW Bro. Smith …\n\n2. CONFIRMATION OF MINUTES\n…"}
            />
            <Button size="sm" variant="outline" className="mt-2" onClick={parsePastedMinutes}>
              Parse into sections
            </Button>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-gold text-lg">Sections</h2>
              <Button size="sm" variant="outline" onClick={addSection}><Plus className="w-3 h-3 mr-1" /> Add section</Button>
            </div>
            <div className="space-y-3">
              {editing.sections.length === 0 && <p className="text-primary-foreground/60 text-sm">No sections yet.</p>}
              {editing.sections.map((s, i) => (
                <div key={i} className="rounded-sm border border-gold/15 bg-navy-light/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={s.heading}
                      placeholder="Heading"
                      onChange={(e) => setSection(i, { heading: e.target.value })}
                      className={INPUT}
                    />
                    <Button size="sm" variant="outline" onClick={() => moveSection(i, -1)} disabled={i === 0}><ArrowUp className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => moveSection(i, 1)} disabled={i === editing.sections.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => removeSection(i)}><X className="w-3 h-3" /></Button>
                  </div>
                  <Textarea
                    rows={3}
                    value={s.body}
                    placeholder="What was decided or reported. Separate distinct points into their own paragraph (blank line between them) for readability"
                    onChange={(e) => setSection(i, { body: e.target.value })}
                    className={INPUT}
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-gold text-lg">Action items</h2>
              <Button size="sm" variant="outline" onClick={addAction}><Plus className="w-3 h-3 mr-1" /> Add row</Button>
            </div>
            {editing.action_items.length === 0 ? (
              <p className="text-primary-foreground/60 text-sm">No action items.</p>
            ) : (
              <div className="space-y-2">
                {editing.action_items.map((a, i) => (
                  <div key={i} className="grid md:grid-cols-[1fr_180px_150px_70px_40px] gap-2 items-center">
                    <Input value={a.task} placeholder="Task" onChange={(e) => setAction(i, { task: e.target.value })} className={INPUT} />
                    <Input value={a.responsible} placeholder="Responsible" onChange={(e) => setAction(i, { responsible: e.target.value })} className={INPUT} />
                    <Input type="date" value={a.deadline} onChange={(e) => setAction(i, { deadline: e.target.value })} className={DATE_INPUT} />
                    <label className="flex items-center gap-2 text-xs text-primary-foreground/70">
                      <Checkbox checked={a.done} onCheckedChange={(v) => setAction(i, { done: v === true })} /> Done
                    </label>
                    <Button size="sm" variant="outline" onClick={() => removeAction(i)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-primary-foreground/70">Next meeting date</label>
              <Input type="date" value={editing.next_meeting_date ?? ""} onChange={(e) => patch({ next_meeting_date: e.target.value })} className={DATE_INPUT} />
            </div>
            <div>
              <label className="text-xs text-primary-foreground/70">Status</label>
              <Select value={editing.status} onValueChange={(v) => patch({ status: v as MinutesStatus })}>
                <SelectTrigger className={INPUT}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as MinutesStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing.status === "approved" && (
              <div>
                <label className="text-xs text-primary-foreground/70">Date confirmed</label>
                <Input type="date" value={editing.approved_date ?? ""} onChange={(e) => patch({ approved_date: e.target.value })} className={DATE_INPUT} />
              </div>
            )}
          </div>

          <section className="rounded-sm border border-gold/15 bg-navy-light/20 p-3">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="flex items-center gap-2 text-gold text-sm font-serif"
            >
              {showTranscript ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Source recording transcript (internal reference — not included in the PDF)
            </button>
            {showTranscript && (
              <Textarea
                rows={14}
                value={editing.transcript_text ?? ""}
                placeholder="Paste the Plaud / AI transcript here (optional)"
                onChange={(e) => patch({ transcript_text: e.target.value })}
                className={`${INPUT} mt-3`}
              />
            )}
          </section>

          <div className="flex gap-2">
            <Button onClick={saveEditing} disabled={busy} className="bg-gold-shimmer text-accent-foreground">
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => exportPdf(editing)}>
              <Download className="w-4 h-4 mr-1" /> Export PDF
            </Button>
          </div>
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-gold flex items-center gap-2">
            <NotebookPen className="w-6 h-6" /> Minutes
          </h1>
          <p className="text-primary-foreground/60 text-sm">
            Regular and Committee meeting minutes, with action items and the source transcript.
          </p>
        </div>
        <Button onClick={startNew} className="bg-gold-shimmer text-accent-foreground">
          <Plus className="w-4 h-4 mr-1" /> New minutes
        </Button>
      </header>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <Select value={fType} onValueChange={setFType}>
          <SelectTrigger className={INPUT}><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(TYPE_LABELS) as MinutesType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className={INPUT}><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as MinutesStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fYear} onValueChange={setFYear}>
          <SelectTrigger className={INPUT}><SelectValue placeholder="All years" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {MASONIC_YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>Masonic year {treasurerYearBounds(y).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-primary-foreground/60 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-primary-foreground/60 text-sm">No minutes recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-sm border border-gold/15 bg-navy-light/30 p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gold font-serif">{r.title}</span>
                  <Badge variant="outline" className="border-gold/40 text-gold/90 text-[10px] px-1.5 py-0">{TYPE_LABELS[r.meeting_type]}</Badge>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "approved"
                        ? "border-emerald-500/60 text-emerald-300 text-[10px] px-1.5 py-0"
                        : "border-amber-500/60 text-amber-300 text-[10px] px-1.5 py-0"
                    }
                  >
                    {STATUS_LABELS[r.status]}
                  </Badge>
                </div>
                <p className="text-primary-foreground/60 text-xs mt-1">
                  {r.meeting_date} · {r.sections.length} section{r.sections.length === 1 ? "" : "s"} · {r.action_items.length} action{r.action_items.length === 1 ? "" : "s"}
                  {r.approved_date ? ` · confirmed ${r.approved_date}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => exportPdf(r)}><Download className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => { setShowTranscript(false); setEditing(r); }}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(r)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-navy-dark text-primary-foreground border-gold/30">
          <DialogHeader>
            <DialogTitle>New minutes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-primary-foreground/70">Meeting type</label>
              <Select value={nType} onValueChange={(v) => setNType(v as MinutesType)}>
                <SelectTrigger className={INPUT}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as MinutesType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {nType === "regular" && (
              <div>
                <label className="text-xs text-primary-foreground/70">Linked meeting (loads the Summons agenda)</label>
                <Select value={nEventId || "none"} onValueChange={(v) => setNEventId(v === "none" ? "" : v)}>
                  <SelectTrigger className={INPUT}><SelectValue placeholder="Not linked" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="none">Not linked</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title} — {new Date(e.event_date).toLocaleDateString("en-GB")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs text-primary-foreground/70">Title</label>
              <Input value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder="e.g. Lodge Committee Meeting" className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-primary-foreground/70">Meeting date</label>
              <Input type="date" value={nDate} onChange={(e) => setNDate(e.target.value)} className={DATE_INPUT} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={createMinutes} disabled={busy} className="bg-gold-shimmer text-accent-foreground">
              {busy ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MembersLayout>
  );
}

export default function MeetingMinutes() {
  return <Inner />;
}
