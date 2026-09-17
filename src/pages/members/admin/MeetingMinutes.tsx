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
import { NotebookPen, Plus, Pencil, Trash2, Download, ArrowUp, ArrowDown, X, ChevronDown, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { readFunctionError } from "@/lib/functionError";
import { masonicYearStart } from "@/lib/loi";
import { treasurerYearBounds } from "@/lib/treasurer/reports";
import { reportPdfDoc, reportSection, INK, MUTED, GOLD, NAVY, fmtDate } from "@/lib/treasurer/reports";
import { formatMemberLine, type MemberRow } from "@/lib/summons";
import autoTable from "jspdf-autotable";

type MinutesType = "regular" | "committee";
type MinutesStatus = "draft" | "approved";

type Section = { heading: string; body: string };
type ActionItem = { task: string; responsible: string; deadline: string; done: boolean };

type Row = {
  id: string;
  meeting_type: MinutesType;
  meeting_at: string;
  title: string;
  lodge_event_id: string | null;
  status: MinutesStatus;
  approved_date: string | null;
  apologies: string | null;
  previous_minutes_note: string | null;
  sections: Section[];
  action_items: ActionItem[];
  next_meeting_at: string | null;
  transcript_text: string | null;
  source?: string | null;
  filed_document_id?: string | null;
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

const FIXED_AGENDA_POINT_1 = "To receive apologies for absence.";
const FIXED_AGENDA_POINT_3 = "To deal with any matters arising from the Minutes.";

function previousMinutesPoint(date: string) {
  return `To confirm the Minutes of the Committee meeting held on ${date ? fmtDate(date) : "[DATE]"}.`;
}

function agendaSections(previousDate: string, additional: Section[] = []): Section[] {
  return [
    { heading: FIXED_AGENDA_POINT_1, body: "" },
    { heading: previousMinutesPoint(previousDate), body: "" },
    { heading: FIXED_AGENDA_POINT_3, body: "" },
    ...additional.map((s) => ({ heading: s.heading, body: "" })),
  ];
}

function isCommitteeAgenda(row: Row | null): boolean {
  if (!row || row.meeting_type !== "committee" || row.transcript_text?.trim()) return false;
  return !row.apologies?.trim()
    && !row.previous_minutes_note?.trim()
    && (row.action_items ?? []).length === 0
    && (row.sections ?? []).every((section) => !section.body?.trim());
}

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

/** Default Committee start time (7.30 p.m.), the lodge's standing convention. */
const DEFAULT_START_TIME = "19:30";

/** Stored timestamp -> value for an <input type="datetime-local">. Treated as UTC throughout. */
function toInput(v?: string | null): string {
  if (!v) return "";
  if (v.length <= 10) return `${v}T00:00`;
  return v.slice(0, 16);
}

/** datetime-local value -> stored timestamp (UTC). */
function fromInput(v: string): string | null {
  if (!v) return null;
  return v.length <= 10 ? `${v}T00:00:00Z` : `${v}:00Z`;
}

const datePart = (v?: string | null) => (v ? toInput(v).slice(0, 10) : "");
const timePart = (v?: string | null) => (v ? toInput(v).slice(11, 16) : "");
const combine = (d: string, t: string): string | null => (d ? `${d}T${t || "00:00"}:00Z` : null);

const ORDINAL = (d: number) =>
  d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";

/** House convention: "Thursday 10th September 2026 at 7.30 p.m." */
function fmtDateTime(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(toInput(v) + "Z");
  if (Number.isNaN(d.getTime())) return String(v);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const day = d.getUTCDate();
  const h24 = d.getUTCHours();
  const mins = d.getUTCMinutes();
  const suffix = h24 >= 12 ? "p.m." : "a.m.";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = mins === 0 ? `${h12}` : `${h12}.${String(mins).padStart(2, "0")}`;
  return `${weekday} ${day}${ORDINAL(day)} ${month} ${d.getUTCFullYear()} at ${time} ${suffix}`;
}



export async function buildMinutesPdf(row: Row) {
  const { doc, pageW, margin } = await reportPdfDoc(
    `${TYPE_LABELS[row.meeting_type]} Meeting Minutes`,
    `${row.title} — ${fmtDateTime(row.meeting_at)}`,
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

  if (row.next_meeting_at) {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`Date of the next meeting: ${fmtDateTime(row.next_meeting_at)}`, margin, y);
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

/**
 * Agenda-style document for a Committee meeting: the section headings only,
 * as a numbered list. Bodies, action items and signature block are deliberately
 * omitted — none of that exists before the meeting takes place.
 */
export async function buildAgendaPdf(row: Row, secretaryName = "Secretary not recorded") {
  const { doc, pageW, margin } = await reportPdfDoc("AGENDA", `${row.title} — ${fmtDateTime(row.meeting_at)}`);
  const usableW = pageW - margin * 2;
  let y = 135;

  const ensure = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 50;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`On ${fmtDateTime(row.meeting_at)}`, margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Secretary: ${secretaryName}`, margin, y);
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const items = (row.sections ?? []).map((s) => s.heading?.trim()).filter(Boolean) as string[];
  items.forEach((heading, i) => {
    const lines = doc.splitTextToSize(heading, usableW - 24) as string[];
    ensure(lines.length * 15 + 8);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}.`, margin, y);
    doc.setFont("helvetica", "normal");
    lines.forEach((line, li) => {
      doc.text(line, margin + 24, y + li * 15);
    });
    y += lines.length * 15 + 8;
  });

  if (items.length === 0) {
    doc.setTextColor(...MUTED);
    doc.text("No agenda items yet.", margin, y);
    y += 20;
  }

  if (row.next_meeting_at) {
    ensure(30);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`Date of the next Committee meeting: ${fmtDateTime(row.next_meeting_at)}`, margin, y);
  }

  return doc;
}

function Inner() {
  const { isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster, user } = useAuth();
  const canManage = isAdmin || isSecretary || isAssistantSecretary || isWorshipfulMaster;
  const { toast } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [events, setEvents] = useState<LodgeEvent[]>([]);
  const [secretaryName, setSecretaryName] = useState("Secretary not recorded");
  const [loading, setLoading] = useState(true);

  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fYear, setFYear] = useState("all");

  // New-minutes dialog
  const [newOpen, setNewOpen] = useState(false);
  const [nType, setNType] = useState<MinutesType>("regular");
  const [nTitle, setNTitle] = useState("");
  const [nDate, setNDate] = useState("");
  const [nTime, setNTime] = useState("");
  const [nEventId, setNEventId] = useState("");
  const [nAgenda, setNAgenda] = useState(false);
  const [busy, setBusy] = useState(false);

  // Edit form
  const [editing, setEditing] = useState<Row | null>(null);
  const [agendaPreviousDate, setAgendaPreviousDate] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Generate-from-transcript dialog
  const [genOpen, setGenOpen] = useState(false);
  const [gType, setGType] = useState<"committee" | "lodge">("committee");
  const [gDate, setGDate] = useState("");
  const [gEventId, setGEventId] = useState("");
  const [gTranscript, setGTranscript] = useState("");
  const [gAgenda, setGAgenda] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [m, e, yearResult] = await Promise.all([
      (supabase.from as any)("meeting_minutes").select("*").order("meeting_at", { ascending: false }),
      supabase.from("lodge_events").select("id,title,event_date").order("event_date", { ascending: false }),
      (supabase as any).rpc("current_lodge_year"),
    ]);
    if (m.error) toast({ title: "Could not load minutes", description: m.error.message, variant: "destructive" });
    setRows(((m.data as any[]) ?? []).map((r) => ({
      ...r,
      sections: Array.isArray(r.sections) ? r.sections : [],
      action_items: Array.isArray(r.action_items) ? r.action_items : [],
    })) as Row[]);
    setEvents(((e.data as any[]) ?? []) as LodgeEvent[]);
    const lodgeYear = Number(yearResult.data) || masonicYearStart();
    const { data: appointment } = await supabase
      .from("officer_appointments")
      .select("member_id")
      .eq("position_key", "secretary")
      .eq("lodge_year", lodgeYear)
      .maybeSingle();
    if (appointment?.member_id) {
      const { data: secretary } = await supabase
        .from("profiles")
        .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,status")
        .eq("id", appointment.member_id)
        .maybeSingle();
      if (secretary) setSecretaryName(formatMemberLine(secretary as MemberRow));
    }
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
        if (fYear !== "all" && String(masonicYearOf(r.meeting_at)) !== fYear) return false;
        return true;
      }),
    [rows, fType, fStatus, fYear],
  );

  const startNew = () => {
    setNType("regular");
    setNTitle("");
    setNDate("");
    setNTime("");
    setNEventId("");
    setNAgenda(false);
    setNewOpen(true);
  };

  const startNewAgenda = () => {
    setNType("committee");
    setNTitle("");
    setNDate("");
    setNTime(DEFAULT_START_TIME);
    setNEventId("");
    setNAgenda(true);
    setNewOpen(true);
  };

  const mostRecentPreviousCommitteeDate = (meetingAt: string, excludeId?: string) => {
    const target = new Date(meetingAt).getTime();
    const previous = rows
      .filter((r) => r.meeting_type === "committee" && r.id !== excludeId && new Date(r.meeting_at).getTime() < target)
      .sort((a, b) => new Date(b.meeting_at).getTime() - new Date(a.meeting_at).getTime())[0];
    return previous ? datePart(previous.meeting_at) : "";
  };

  const openEditing = (row: Row) => {
    const isAgenda = isCommitteeAgenda(row);
    if (!isAgenda) {
      setAgendaPreviousDate("");
      setEditing(row);
      return;
    }
    const embeddedDate = row.sections?.[1]?.heading.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/)?.[1];
    const parsedEmbedded = embeddedDate ? new Date(`${embeddedDate} UTC`) : null;
    const previousDate = parsedEmbedded && !Number.isNaN(parsedEmbedded.getTime())
      ? parsedEmbedded.toISOString().slice(0, 10)
      : mostRecentPreviousCommitteeDate(row.meeting_at, row.id);
    setAgendaPreviousDate(previousDate);
    setEditing({ ...row, sections: agendaSections(previousDate, row.sections.slice(3)) });
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
        sections = nAgenda
          ? agendaSections(mostRecentPreviousCommitteeDate(combine(nDate, nTime) ?? nDate))
          : COMMITTEE_SKELETON.map((s) => ({ ...s }));
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
        meeting_at: combine(nDate, nTime),
        title: nTitle.trim(),
        lodge_event_id: nType === "regular" && nEventId ? nEventId : null,
        sections,
        action_items: [],
        created_by: user?.id ?? null,
      };
      const { data, error } = await (supabase.from as any)("meeting_minutes").insert(payload).select("*").single();
      if (error) throw error;
      toast({ title: nAgenda ? "Committee agenda created" : "Minutes created" });
      setNewOpen(false);
      await load();
      const created = { ...(data as Row), sections, action_items: [] };
      if (nAgenda) openEditing(created);
      else setEditing(created);
    } catch (err: any) {
      toast({ title: "Could not create minutes", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const startGenerate = () => {
    setGType("committee");
    setGDate("");
    setGEventId("");
    setGTranscript("");
    setGAgenda("");
    setGenOpen(true);
  };

  /**
   * Reads an uploaded file as plain text. Word (.docx) files are binary, so
   * reading them with File.text() produced garbled output — extract the real
   * text instead. Anything else unreadable is rejected with a clear message.
   * Every failure path shows a toast — a silent failure leaves the textarea
   * empty and the Secretary has no idea what went wrong.
   */
  /**
   * Android/Samsung browsers often throw NotReadableError from File.arrayBuffer()
   * when the file comes from Downloads or a cloud provider — the reference goes
   * stale. Retry through FileReader and a fresh slice before giving up.
   */
  const readBytes = async (f: File): Promise<ArrayBuffer> => {
    const viaReader = () =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as ArrayBuffer);
        r.onerror = () => reject(r.error ?? new Error("read failed"));
        r.readAsArrayBuffer(f);
      });
    const attempts: Array<() => Promise<ArrayBuffer>> = [
      () => f.arrayBuffer(),
      viaReader,
      () => f.slice(0, f.size).arrayBuffer(),
      async () => new TextEncoder().encode(await f.text()).buffer as ArrayBuffer,
    ];
    let lastErr: any;
    for (const attempt of attempts) {
      try {
        const buf = await attempt();
        if (buf && (buf.byteLength > 0 || f.size === 0)) return buf;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr ?? new Error("The file could not be read.");
  };

  const readUploadedText = async (f: File): Promise<string | null> => {
    const name = f.name.toLowerCase();
    if (name.endsWith(".docx")) {
      try {
        const mammoth = await import("mammoth/mammoth.browser.js");
        const buf = await readBytes(f);
        const res = await (mammoth as any).extractRawText({ arrayBuffer: buf });
        const text = String(res?.value ?? "").trim();
        if (!text) throw new Error("empty");
        return text;
      } catch {
        toast({ title: "Couldn't read that Word file", description: "Try saving it as plain text (.txt) and uploading again.", variant: "destructive" });
        return null;
      }
    }
    if (name.endsWith(".doc") || name.endsWith(".pdf")) {
      toast({
        title: "That file type isn't supported",
        description: "Please upload a .txt or .docx file, or paste the text into the box above.",
        variant: "destructive",
      });
      return null;
    }
    // Plain-text path: some recorders (e.g. Plaud exports saved from certain
    // apps) write UTF-16, which File.text() decodes as UTF-8 garbage — sniff
    // the byte-order mark and decode accordingly so those files still load.
    try {
      const buf = await readBytes(f);
      const bytes = new Uint8Array(buf);
      let text: string;
      if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        text = new TextDecoder("utf-16le").decode(bytes.subarray(2));
      } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        text = new TextDecoder("utf-16be").decode(bytes.subarray(2));
      } else {
        text = new TextDecoder("utf-8").decode(bytes);
      }
      // Guard against undecodable/binary content slipping through as NULs.
      if (text.indexOf("\0") !== -1) {
        text = new TextDecoder("utf-16le").decode(bytes);
      }
      if (!text.trim()) {
        toast({ title: "That file appears to be empty", description: "Check it's the finished transcript file and try again.", variant: "destructive" });
        return null;
      }
      return text;
    } catch (err: any) {
      toast({
        title: "Couldn't read that file",
        description: `${err?.message ?? "The phone couldn't read it."} Try pasting the text into the box instead.`,
        variant: "destructive",
      });
      return null;
    }
  };

  const loadTranscriptFile = async (f: File | null | undefined) => {
    if (!f) return;
    const text = await readUploadedText(f);
    if (text !== null) {
      setGTranscript(text);
      toast({ title: "Transcript loaded", description: `${text.length.toLocaleString()} characters ready.` });
    }
  };

  const loadAgendaFile = async (f: File | null | undefined) => {
    if (!f) return;
    const text = await readUploadedText(f);
    if (text !== null) {
      setGAgenda(text);
      toast({ title: "Agenda loaded", description: `${text.length.toLocaleString()} characters ready.` });
    }
  };


  /** Generates a brand-new draft record — never modifies an existing one. */
  const generateFromTranscript = async () => {
    if (!gDate) return toast({ title: "Choose the meeting date", variant: "destructive" });
    if (gType === "lodge" && !gEventId) {
      return toast({ title: "Choose the Lodge meeting to take the agenda from", variant: "destructive" });
    }
    if (!gTranscript.trim()) return toast({ title: "Paste or upload the transcript", variant: "destructive" });

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-minutes-from-transcript", {
        body: {
          transcript_text: gTranscript,
          meeting_type: gType,
          meeting_date: gDate.slice(0, 10),
          lodge_event_id: gType === "lodge" ? gEventId : undefined,
          agenda_text: gType === "committee" && gAgenda.trim() ? gAgenda : undefined,
        },
      });
      const result = data as any;
      if (error || result?.error) {
        const msg = await readFunctionError(error, data, "Generation failed");
        toast({
          title: result?.parse_error ? "The model's reply couldn't be read" : "Could not generate minutes",
          description: result?.parse_error ? String(result.raw ?? "").slice(0, 400) : msg,
          variant: "destructive",
        });
        return;
      }

      const evt = events.find((e) => e.id === gEventId);
      // No date in the stored title — the PDF subtitle, register and filed
      // document title all add the meeting date themselves, so embedding it
      // here duplicates it ("… — 10 September 2026 — 10 Sept 2026").
      const title = gType === "committee"
        ? "Lodge Committee Meeting"
        : evt?.title ?? "Lodge Meeting";

      const payload = {
        meeting_type: gType === "committee" ? "committee" : "regular",
        meeting_at: combine(gDate.slice(0, 10), gType === "committee" ? DEFAULT_START_TIME : "00:00"),
        title,
        lodge_event_id: gType === "lodge" ? gEventId : null,
        status: "draft",
        source: "ai_generated",
        transcript_text: gTranscript,
        apologies: result.apologies || null,
        previous_minutes_note: result.previous_minutes_note || null,
        sections: result.sections ?? [],
        action_items: result.action_items ?? [],
        next_meeting_at: result.next_meeting_date ? combine(String(result.next_meeting_date).slice(0, 10), DEFAULT_START_TIME) : null,
        created_by: user?.id ?? null,
      };

      const { data: inserted, error: insErr } = await (supabase.from as any)("meeting_minutes")
        .insert(payload)
        .select("*")
        .single();
      if (insErr) throw insErr;

      toast({ title: "Draft minutes generated — please review" });
      setGenOpen(false);
      await load();
      setShowTranscript(false);
      setEditing({
        ...(inserted as Row),
        sections: payload.sections,
        action_items: payload.action_items,
      });
    } catch (err: any) {
      toast({ title: "Could not generate minutes", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Files an approved set of minutes as a Document. Creates the lodge_documents
   * row the first time; afterwards it overwrites the same stored file so
   * re-approving never produces a duplicate.
   */
  const fileApprovedMinutes = async (row: Row): Promise<string | null> => {
    const doc = await buildMinutesPdf(row);
    const blob = doc.output("blob") as Blob;
    const category = row.meeting_type === "committee" ? "committee_minutes" : "meeting_minutes";

    if (row.filed_document_id) {
      const { data: existing } = await supabase
        .from("lodge_documents")
        .select("file_path")
        .eq("id", row.filed_document_id)
        .maybeSingle();
      if (existing?.file_path) {
        const { error: upErr } = await supabase.storage
          .from("lodge-docs")
          .upload(existing.file_path, blob, { contentType: "application/pdf", upsert: true });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase
          .from("lodge_documents")
          .update({ file_size_bytes: blob.size })
          .eq("id", row.filed_document_id);
        if (dbErr) throw dbErr;
        return row.filed_document_id;
      }
    }

    const docId = crypto.randomUUID();
    const path = `${category}/${docId}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("lodge-docs")
      .upload(path, blob, { contentType: "application/pdf", upsert: false });
    if (upErr) throw upErr;

    const label = row.meeting_type === "committee" ? "Committee Meeting Minutes" : "Lodge Meeting Minutes";
    const dateLabel = new Date(row.meeting_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const { data: created, error: dbErr } = await supabase
      .from("lodge_documents")
      .insert({
        title: `${label} — ${dateLabel}`,
        category: category as any,
        file_path: path,
        file_size_bytes: blob.size,
        uploaded_by: user?.id ?? null,
        is_general: true,
      })
      .select("id")
      .single();
    if (dbErr) throw dbErr;
    return (created as { id: string }).id;
  };

  const saveEditing = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const { error } = await (supabase.from as any)("meeting_minutes")
        .update({
          title: editing.title,
          meeting_at: editing.meeting_at,
          apologies: editing.apologies?.trim() || null,
          previous_minutes_note: editing.previous_minutes_note?.trim() || null,
          sections: editing.sections,
          action_items: editing.action_items,
          next_meeting_at: editing.next_meeting_at || null,
          status: editing.status,
          approved_date: editing.status === "approved" ? editing.approved_date || null : null,
          transcript_text: editing.transcript_text?.trim() || null,
        })
        .eq("id", editing.id);
      if (error) throw error;

      if (editing.status === "approved") {
        try {
          const filedId = await fileApprovedMinutes(editing);
          if (filedId && filedId !== editing.filed_document_id) {
            await (supabase.from as any)("meeting_minutes")
              .update({ filed_document_id: filedId })
              .eq("id", editing.id);
          }
          toast({ title: "Minutes saved and filed in Documents" });
        } catch (fileErr: any) {
          toast({
            title: "Minutes saved, but filing the PDF failed",
            description: fileErr.message,
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Minutes saved" });
      }

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
      doc.save(`minutes-${r.meeting_at.slice(0, 10)}-${r.meeting_type}.pdf`);
    } catch (e: any) {
      toast({ title: "Could not build the PDF", description: e.message, variant: "destructive" });
    }
  };

  /**
   * Downloads the Committee agenda PDF and files a copy in Documents under
   * Committee agendas. An agenda isn't formally confirmed, so there's no
   * approval gate — each click files the current version.
   */
  const exportAgendaPdf = async (r: Row) => {
    try {
      const doc = await buildAgendaPdf(r, secretaryName);
      doc.save(`agenda-${r.meeting_at.slice(0, 10)}-committee.pdf`);

      const blob = doc.output("blob") as Blob;
      const docId = crypto.randomUUID();
      const path = `committee_agendas/${docId}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("lodge-docs")
        .upload(path, blob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const dateLabel = new Date(r.meeting_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
      const { error: dbErr } = await supabase.from("lodge_documents").insert({
        title: `Committee Meeting Agenda — ${dateLabel}`,
        category: "committee_agendas" as any,
        file_path: path,
        file_size_bytes: blob.size,
        uploaded_by: user?.id ?? null,
        is_general: true,
      });
      if (dbErr) throw dbErr;
      toast({ title: "Agenda exported and filed in Documents" });
    } catch (e: any) {
      toast({ title: "Could not build the agenda PDF", description: e.message, variant: "destructive" });
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

  const isAgendaEditing = isCommitteeAgenda(editing);
  const setAgendaPreviousMeetingDate = (date: string) => {
    if (!editing) return;
    setAgendaPreviousDate(date);
    patch({ sections: agendaSections(date, editing.sections.slice(3)) });
  };
  const setAgendaPoint = (i: number, heading: string) => setSection(i, { heading, body: "" });
  const addAgendaPoint = () => patch({ sections: [...editing!.sections, { heading: "", body: "" }] });

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
              {TYPE_LABELS[editing.meeting_type]} meeting · {fmtDateTime(editing.meeting_at)}
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
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={datePart(editing.meeting_at)}
                  onChange={(e) => patch({ meeting_at: combine(e.target.value, timePart(editing.meeting_at)) ?? editing.meeting_at })}
                  className={DATE_INPUT}
                />
                <Input
                  type="time"
                  value={timePart(editing.meeting_at)}
                  onChange={(e) => patch({ meeting_at: combine(datePart(editing.meeting_at), e.target.value) ?? editing.meeting_at })}
                  className={DATE_INPUT}
                />
              </div>
            </div>
          </div>

          {!isAgendaEditing && <>
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
          </>}

          {isAgendaEditing ? (
          <section>
            <div className="mb-3">
              <h2 className="font-serif text-gold text-lg">Committee Agenda</h2>
              <p className="text-xs text-primary-foreground/60">Secretary: {secretaryName}</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-sm border border-gold/15 bg-navy-light/30 p-3 text-sm text-primary-foreground">
                <span className="font-semibold text-gold mr-2">1.</span>{FIXED_AGENDA_POINT_1}
              </div>
              <div className="rounded-sm border border-gold/15 bg-navy-light/30 p-3 space-y-2">
                <div className="text-sm text-primary-foreground"><span className="font-semibold text-gold mr-2">2.</span>To confirm the Minutes of the Committee meeting held on:</div>
                <Input type="date" value={agendaPreviousDate} onChange={(e) => setAgendaPreviousMeetingDate(e.target.value)} className={`${DATE_INPUT} max-w-xs`} />
              </div>
              <div className="rounded-sm border border-gold/15 bg-navy-light/30 p-3 text-sm text-primary-foreground">
                <span className="font-semibold text-gold mr-2">3.</span>{FIXED_AGENDA_POINT_3}
              </div>
              {editing.sections.slice(3).map((s, offset) => {
                const i = offset + 3;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-sm border border-gold/15 bg-navy-light/30 p-3">
                    <span className="w-6 shrink-0 text-sm font-semibold text-gold">{i + 1}.</span>
                    <Input value={s.heading} placeholder="Agenda point" onChange={(e) => setAgendaPoint(i, e.target.value)} className={INPUT} />
                    <Button size="sm" variant="outline" onClick={() => moveSection(i, -1)} disabled={i === 3}><ArrowUp className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => moveSection(i, 1)} disabled={i === editing.sections.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => removeSection(i)}><X className="w-3 h-3" /></Button>
                  </div>
                );
              })}
              <Button size="sm" variant="outline" onClick={addAgendaPoint}><Plus className="w-3 h-3 mr-1" /> Add point</Button>
            </div>
          </section>
          ) : (
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
          )}

          {!isAgendaEditing && <section>
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
          </section>}

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-primary-foreground/70">Next meeting date</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={datePart(editing.next_meeting_at)}
                  onChange={(e) => patch({ next_meeting_at: combine(e.target.value, timePart(editing.next_meeting_at) || DEFAULT_START_TIME) })}
                  className={DATE_INPUT}
                />
                <Input
                  type="time"
                  value={timePart(editing.next_meeting_at)}
                  onChange={(e) => patch({ next_meeting_at: combine(datePart(editing.next_meeting_at), e.target.value) })}
                  className={DATE_INPUT}
                />
              </div>
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

          {!isAgendaEditing && <section className="rounded-sm border border-gold/15 bg-navy-light/20 p-3">
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
          </section>}

          <div className="flex gap-2">
            <Button onClick={saveEditing} disabled={busy} className="bg-gold-shimmer text-accent-foreground">
              {busy ? "Saving…" : "Save"}
            </Button>
            {!isAgendaEditing && <Button variant="outline" onClick={() => exportPdf(editing)}>
              <Download className="w-4 h-4 mr-1" /> Export PDF
            </Button>}
            {editing.meeting_type === "committee" && (
              <Button variant="outline" onClick={() => exportAgendaPdf(editing)}>
                <Download className="w-4 h-4 mr-1" /> Export Agenda PDF
              </Button>
            )}
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
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={startGenerate}
            variant="outline"
            className="border-gold/40 text-gold hover:bg-gold/10"
          >
            <Sparkles className="w-4 h-4 mr-1" /> Generate from transcript
          </Button>
          <Button
            onClick={startNewAgenda}
            variant="outline"
            className="border-gold/40 text-gold hover:bg-gold/10"
          >
            <Plus className="w-4 h-4 mr-1" /> New Committee Agenda
          </Button>
          <Button onClick={startNew} className="bg-gold-shimmer text-accent-foreground">
            <Plus className="w-4 h-4 mr-1" /> New minutes
          </Button>
        </div>
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
                  {fmtDateTime(r.meeting_at)} · {r.sections.length} section{r.sections.length === 1 ? "" : "s"} · {r.action_items.length} action{r.action_items.length === 1 ? "" : "s"}
                  {r.approved_date ? ` · confirmed ${r.approved_date}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => exportPdf(r)}><Download className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => { setShowTranscript(false); openEditing(r); }}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(r)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-navy-dark text-primary-foreground border-gold/30">
          <DialogHeader>
            <DialogTitle>{nAgenda ? "New Committee Agenda" : "New minutes"}</DialogTitle>
            {nAgenda && (
              <p className="text-xs text-primary-foreground/60">
                Starts with the seven standard headings — just add the date, time, and title below.
              </p>
            )}
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
              <label className="text-xs text-primary-foreground/70">Meeting date and time</label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={nDate} onChange={(e) => setNDate(e.target.value)} className={DATE_INPUT} />
                <Input type="time" value={nTime} onChange={(e) => setNTime(e.target.value)} className={DATE_INPUT} />
              </div>
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

      <Dialog open={genOpen} onOpenChange={(o) => !generating && setGenOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-navy-dark text-primary-foreground border-gold/30 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" /> Generate minutes from a transcript
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-primary-foreground/60">
              Creates a new draft for review. Nothing existing is changed.
            </p>

            <div>
              <label className="text-xs text-primary-foreground/70">Meeting type</label>
              <Select value={gType} onValueChange={(v) => setGType(v as "committee" | "lodge")}>
                <SelectTrigger className={INPUT}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="committee">Committee meeting</SelectItem>
                  <SelectItem value="lodge">Lodge meeting (follows the Summons agenda)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-primary-foreground/70">Meeting date</label>
              <Input type="date" value={gDate} onChange={(e) => setGDate(e.target.value)} className={DATE_INPUT} />
            </div>

            {gType === "lodge" && (
              <div>
                <label className="text-xs text-primary-foreground/70">Lodge meeting</label>
                <Select value={gEventId || "none"} onValueChange={(v) => setGEventId(v === "none" ? "" : v)}>
                  <SelectTrigger className={INPUT}><SelectValue placeholder="Choose a meeting" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="none">Choose a meeting</SelectItem>
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
              <label className="text-xs text-primary-foreground/70">Transcript</label>
              <Textarea
                value={gTranscript}
                onChange={(e) => setGTranscript(e.target.value)}
                rows={12}
                placeholder="Paste the full recording transcript here…"
                className={INPUT}
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="file"
                  accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => loadTranscriptFile(e.target.files?.[0])}
                  className="text-xs text-primary-foreground/70 file:mr-2 file:rounded file:border-0 file:bg-gold/20 file:px-2 file:py-1 file:text-gold"
                />
                {gTranscript && (
                  <span className="text-xs text-primary-foreground/50">
                    {gTranscript.length.toLocaleString()} characters
                  </span>
                )}
              </div>
            </div>

            {gType === "committee" && (
              <div>
                <label className="text-xs text-primary-foreground/70">Committee agenda (optional)</label>
                <p className="text-xs text-primary-foreground/50 mb-1">
                  If you have the pre-meeting agenda for this Committee meeting, paste it here too — it often has the next meeting date already proposed on it.
                </p>
                <Textarea
                  value={gAgenda}
                  onChange={(e) => setGAgenda(e.target.value)}
                  rows={6}
                  placeholder="Paste the pre-meeting agenda here…"
                  className={INPUT}
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="file"
                    accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => loadAgendaFile(e.target.files?.[0])}
                    className="text-xs text-primary-foreground/70 file:mr-2 file:rounded file:border-0 file:bg-gold/20 file:px-2 file:py-1 file:text-gold"
                  />
                  {gAgenda && (
                    <span className="text-xs text-primary-foreground/50">
                      {gAgenda.length.toLocaleString()} characters
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>Cancel</Button>
            <Button onClick={generateFromTranscript} disabled={generating} className="bg-gold-shimmer text-accent-foreground">
              {generating
                ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating… this can take 30 seconds</>)
                : "Generate draft"}
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
