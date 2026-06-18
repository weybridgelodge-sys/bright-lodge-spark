import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download, FileText, Mail, Plus, Save, Trash2 } from "lucide-react";
import {
  AGENDA_PRESETS,
  AgendaItem,
  Candidate,
  CEREMONY_TYPES,
  candidateAgendaLabel,
  defaultAgenda,
  formatDateShort,
  formatMemberLine,
  formatMemberLineFormal,
  MemberRow,
  newAgendaItem,
  newCandidate,
  planOverflow,
  sortMembersBySeniority,
  splitTwoColumns,
} from "@/lib/summons";
import {
  generateSummonsBlob,
  LodgeTemplate,
  OfficerRollRow,
  SummonsData,
} from "@/lib/summonsPdf";
import SummonsPrintPreview from "@/components/members/SummonsPrintPreview";
import {
  NON_PROGRESSIVE_LABELS,
  NonProgressiveKey,
  POSITION_LABELS,
  PositionKey,
} from "@/lib/officersProgression";

type Rep = { role: string; name: string };

const EMPTY_TEMPLATE: LodgeTemplate = {
  lodge_name: "Weybridge Lodge",
  lodge_number: "6787",
  province: "Surrey",
  consecration_date: null,
  logo_url: (typeof window !== "undefined" ? window.location.origin : "") + "/__l5e/assets-v1/045b91d4-9b41-490d-baa9-8486eca7cb05/weybridge-logo-no-bg.png",
  venue_address: null,
  regular_meeting_pattern: null,
  loi_details: null,
  provincial_website: null,
  mcf_contact: null,
  dining_booking_url: null,
  data_protection_text: null,
  data_protection_text_short: null,
  overseas_attendance_text: null,
  progression_notice_text: null,
  wm_contact: null,
  secretary_contact: null,
  royal_arch_rep: null,
  honorary_members: null,
  lodge_representatives: [],
};

const EMPTY_SUMMONS: SummonsData = {
  meeting_number: 1,
  meeting_date: null,
  meeting_time: null,
  meeting_type: "Regular",
  dress_code: null,
  minutes_confirmation_date: null,
  next_meeting_date: null,
  officer_night_date: null,
  agenda: defaultAgenda(),
  candidates: [],
  dining_enquiry_name: null,
  dining_enquiry_email: null,
  dining_menu: null,
  dining_price: null,
  dining_deadline: null,
};

export default function SummonsBuilder() {
  const { canManageSummons, loading } = useAuth();

  if (loading) {
    return (
      <MembersLayout>
        <p className="text-primary-foreground/70">Loading…</p>
      </MembersLayout>
    );
  }

  if (!canManageSummons) {
    return (
      <MembersLayout>
        <div className="bg-navy-light/40 border border-gold/20 rounded p-6">
          <h1 className="font-serif text-xl text-gold">Summons Builder</h1>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Access restricted to the Secretary or Assistant Secretary.
          </p>
        </div>
      </MembersLayout>
    );
  }

  const [tab, setTab] = useState("new");
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (id: string) => {
    setEditingId(id);
    setTab("new");
  };

  return (
    <MembersLayout>
      <div className="space-y-4">
        <header>
          <h1 className="font-serif text-2xl text-gold">Summons Builder</h1>
          <p className="text-sm text-primary-foreground/70">
            Generate the lodge's printed A4 summons, preview, download, and email to all active members.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-navy-light/60 border border-gold/20">
            <TabsTrigger value="new">{editingId ? "Edit Summons" : "New Summons"}</TabsTrigger>
            <TabsTrigger value="preview">Print Preview</TabsTrigger>
            <TabsTrigger value="template">Lodge Template</TabsTrigger>
            <TabsTrigger value="officers">Officer Roll</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="new"><NewSummonsTab editingId={editingId} onDoneEditing={() => setEditingId(null)} /></TabsContent>
          <TabsContent value="preview"><PrintPreviewTab /></TabsContent>
          <TabsContent value="template"><TemplateTab /></TabsContent>
          <TabsContent value="officers"><OfficerRollTab /></TabsContent>
          <TabsContent value="history"><HistoryTab onEdit={startEdit} /></TabsContent>
        </Tabs>
      </div>
    </MembersLayout>
  );
}



// ===================== Print Preview Tab =====================
function PrintPreviewTab() {
  const [template, setTemplate] = useState<LodgeTemplate>(EMPTY_TEMPLATE);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [officers, setOfficers] = useState<OfficerRollRow[]>([]);

  useEffect(() => {
    (async () => {
      const [tpl, mem] = await Promise.all([
        supabase.from("lodge_template").select("*").eq("id", "default").maybeSingle(),
        supabase
          .from("profiles")
          .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,status")
          .eq("status", "active"),
      ]);
      if (tpl.data) setTemplate({ ...EMPTY_TEMPLATE, ...(tpl.data as any), lodge_representatives: (tpl.data as any).lodge_representatives ?? [] });
      if (mem.data) setMembers(mem.data as any);
      loadOfficers(setOfficers, () => {});
    })();
  }, []);

  return <SummonsPrintPreview template={template} officers={officers} members={members} />;
}

// ===================== Template Tab =====================
function TemplateTab() {
  const [t, setT] = useState<LodgeTemplate>(EMPTY_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [reps, setReps] = useState<Rep[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lodge_template").select("*").eq("id", "default").maybeSingle();
      if (data) {
        const merged = { ...EMPTY_TEMPLATE, ...(data as any), lodge_representatives: (data as any).lodge_representatives ?? [] };
        if (!merged.logo_url) merged.logo_url = EMPTY_TEMPLATE.logo_url;
        setT(merged);
        setReps(((data as any).lodge_representatives ?? []) as Rep[]);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("lodge_template")
      .update({ ...t, lodge_representatives: reps } as any)
      .eq("id", "default");
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Template saved");
  };

  const F = (k: keyof LodgeTemplate, label: string, type: "text" | "textarea" | "date" = "text") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      {type === "textarea" ? (
        <Textarea
          rows={3}
          value={(t as any)[k] ?? ""}
          onChange={(e) => setT({ ...t, [k]: e.target.value || null } as any)}
        />
      ) : (
        <Input
          type={type}
          value={(t as any)[k] ?? ""}
          onChange={(e) => setT({ ...t, [k]: e.target.value || null } as any)}
        />
      )}
    </div>
  );

  return (
    <div className="bg-navy-light/40 border border-gold/20 rounded p-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {F("lodge_name", "Lodge name")}
        {F("lodge_number", "Lodge number")}
        {F("province", "Province")}
        {F("consecration_date", "Consecration date", "date")}
        {F("logo_url", "Logo URL")}
        {F("dining_booking_url", "Dining booking URL")}
      </div>
      {F("venue_address", "Venue full address", "textarea")}
      {F("regular_meeting_pattern", "Regular meeting pattern", "textarea")}
      {F("loi_details", "Lodge of Instruction (day / time / venue)", "textarea")}
      <div className="grid sm:grid-cols-2 gap-3">
        {F("provincial_website", "Provincial website")}
        {F("mcf_contact", "MCF contact", "textarea")}
        {F("royal_arch_rep", "Royal Arch Representative", "textarea")}
        {F("honorary_members", "Honorary members", "textarea")}
        {F("wm_contact", "Worshipful Master — home address & contact", "textarea")}
        {F("secretary_contact", "Secretary — contact", "textarea")}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {F("data_protection_text", "Data Protection notice", "textarea")}
        {F("data_protection_text_short", "Data Protection notice (short variant for overflow)", "textarea")}
        {F("overseas_attendance_text", "Attendance at Lodges Overseas notice", "textarea")}
        {F("progression_notice_text", "Progression of Office notice", "textarea")}
      </div>

      <div>
        <Label>Lodge Representatives</Label>
        <div className="space-y-2 mt-1">
          {reps.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Role" value={r.role} onChange={(e) => setReps(reps.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
              <Input placeholder="Name" value={r.name} onChange={(e) => setReps(reps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <Button type="button" variant="destructive" size="sm" onClick={() => setReps(reps.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setReps([...reps, { role: "", name: "" }])}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save template"}</Button>
    </div>
  );
}

// ===================== Officer Roll Tab =====================
function OfficerRollTab() {
  const [rows, setRows] = useState<OfficerRollRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void loadOfficers(setRows, setLoading); }, []);

  return (
    <div className="bg-navy-light/40 border border-gold/20 rounded p-4">
      <h2 className="font-serif text-lg text-gold mb-2">Annual Officer Roll</h2>
      <p className="text-xs text-primary-foreground/70 mb-3">
        Auto-populated from the Progressive Officers Tracker for the current Masonic year.
      </p>
      {loading ? (
        <p className="text-sm text-primary-foreground/70">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gold/10">
                <td className="py-1.5 pr-2 font-medium text-primary-foreground/80">{r.label}</td>
                <td className="py-1.5">{r.member || <span className="text-primary-foreground/40">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

async function loadOfficers(setRows: (rows: OfficerRollRow[]) => void, setLoading: (b: boolean) => void) {
  setLoading(true);
  const now = new Date();
  const lodgeYear = now.getMonth() + 1 >= 10 ? now.getFullYear() : now.getFullYear() - 1;
  const { data: appts } = await supabase
    .from("officer_appointments")
    .select("position_key,member_id")
    .eq("lodge_year", lodgeYear);
  const memberIds = Array.from(new Set((appts ?? []).map((a) => a.member_id).filter(Boolean)));
  const { data: profs } = memberIds.length
    ? await supabase.from("profiles").select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,is_past_master,is_royal_arch,initiation_date,joined_lodge_date,joined_year,status").in("id", memberIds)
    : { data: [] as any[] };
  const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
  const allKeys: string[] = [
    "worshipful_master","senior_warden","junior_warden",
    "immediate_past_master","chaplain","treasurer","secretary","assistant_secretary",
    "director_of_ceremonies","assistant_director_of_ceremonies",
    "senior_deacon","junior_deacon","inner_guard",
    "almoner","charity_steward","mentor","membership_officer",
    "senior_steward","steward_1","steward_2","steward_3","steward_4","steward_5",
    "tyler","assistant_tyler",
  ];
  const labelFor = (k: string) =>
    (POSITION_LABELS as any)[k as PositionKey] || (NON_PROGRESSIVE_LABELS as any)[k as NonProgressiveKey] || k;
  const rows: OfficerRollRow[] = allKeys.map((k) => {
    const a = (appts ?? []).find((x) => x.position_key === k);
    const p = a?.member_id ? byId.get(a.member_id) : null;
    return {
      label: labelFor(k),
      member: p ? formatMemberLine(p as MemberRow) : "",
      member_formal: p ? formatMemberLineFormal(p as MemberRow) : "",
    };
  });
  setRows(rows);
  setLoading(false);
}


// ===================== New Summons Tab =====================
function NewSummonsTab({ editingId, onDoneEditing }: { editingId: string | null; onDoneEditing: () => void }) {
  const [summons, setSummons] = useState<SummonsData>(EMPTY_SUMMONS);
  const [template, setTemplate] = useState<LodgeTemplate>(EMPTY_TEMPLATE);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [officers, setOfficers] = useState<OfficerRollRow[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [festive, setFestive] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [presetIndex, setPresetIndex] = useState<string>("");
  const [manualHidden, setManualHidden] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [tpl, mem, evs, fb, last] = await Promise.all([
        supabase.from("lodge_template").select("*").eq("id", "default").maybeSingle(),
        supabase
          .from("profiles")
          .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,status")
          .eq("status", "active"),
        supabase.from("lodge_events").select("id,title,event_date,tyling_time,dress_code,location").order("event_date", { ascending: true }),
        supabase.from("festive_board_meetings").select("id,meeting_date,notes").order("meeting_date", { ascending: true }),
        supabase.from("summonses").select("meeting_number").order("meeting_number", { ascending: false }).limit(1),
      ]);
      if (tpl.data) setTemplate({ ...EMPTY_TEMPLATE, ...(tpl.data as any), lodge_representatives: (tpl.data as any).lodge_representatives ?? [] });
      if (mem.data) setMembers(mem.data as any);
      if (evs.data) setEvents(evs.data);
      if (fb.data) setFestive(fb.data);
      if (!editingId) {
        const nextNo = ((last.data?.[0] as any)?.meeting_number ?? 0) + 1;
        setSummons((s) => ({ ...s, meeting_number: nextNo }));
      }
      loadOfficers(setOfficers, () => {});
    })();
  }, [editingId]);

  useEffect(() => {
    if (!editingId) { setCurrentId(null); return; }
    (async () => {
      const { data, error } = await supabase.from("summonses").select("*").eq("id", editingId).maybeSingle();
      if (error || !data) { toast.error(error?.message ?? "Summons not found"); return; }
      const r: any = data;
      setCurrentId(r.id);
      setSelectedEvent(r.lodge_event_id ?? "");
      setManualHidden(((r.notice_overrides as any)?.manualHidden ?? []) as string[]);
      setSummons({
        meeting_number: r.meeting_number,
        meeting_date: r.meeting_date,
        meeting_time: r.meeting_time,
        meeting_type: r.meeting_type,
        dress_code: r.dress_code,
        minutes_confirmation_date: r.minutes_confirmation_date,
        next_meeting_date: r.next_meeting_date,
        officer_night_date: r.officer_night_date,
        agenda: (r.agenda as any) ?? defaultAgenda(),
        candidates: (r.candidates as any) ?? [],
        dining_enquiry_name: r.dining_enquiry_name,
        dining_enquiry_email: r.dining_enquiry_email,
        dining_menu: r.dining_menu ?? null,
        dining_price: r.dining_price ?? null,
        dining_deadline: r.dining_deadline ?? null,
      });
    })();
  }, [editingId]);



  const sortedMembers = useMemo(() => sortMembersBySeniority(members), [members]);
  const overflow = planOverflow(sortedMembers.length);

  const onPickEvent = (id: string) => {
    setSelectedEvent(id);
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const d = new Date(ev.event_date);
    const iso = d.toISOString().slice(0, 10);
    const time = ev.tyling_time || d.toTimeString().slice(0, 5);
    setSummons((s) => ({
      ...s,
      meeting_date: iso,
      meeting_time: time,
      dress_code: ev.dress_code ?? s.dress_code,
      meeting_type: /install/i.test(ev.title) ? "Installation" : /emerg/i.test(ev.title) ? "Emergency" : "Regular",
    }));
    // Try matching festive board record on same date
    const fb = festive.find((f) => f.meeting_date === iso);
    if (fb) {
      setSummons((s) => ({ ...s, dining_menu: fb.notes ?? s.dining_menu }));
    }
    // Find next meeting
    const futureIdx = events.findIndex((e) => e.id === id);
    if (futureIdx >= 0 && futureIdx + 1 < events.length) {
      setSummons((s) => ({ ...s, next_meeting_date: new Date(events[futureIdx + 1].event_date).toISOString().slice(0, 10) }));
    }
  };

  const moveAgenda = (i: number, dir: -1 | 1) => {
    const a = [...summons.agenda];
    const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    setSummons({ ...summons, agenda: a });
  };

  const addPreset = () => {
    if (!presetIndex) return;
    const label = AGENDA_PRESETS[parseInt(presetIndex, 10)];
    // Insert before the "Receive reports" standing item (index of that label) so variable business sits in the gap.
    const insertAt = summons.agenda.findIndex((x) => /Receive reports/i.test(x.label));
    const a = [...summons.agenda];
    a.splice(insertAt === -1 ? Math.max(a.length - 1, 0) : insertAt, 0, newAgendaItem(label));
    setSummons({ ...summons, agenda: a });
    setPresetIndex("");
  };

  const addCustomAgenda = () => {
    setSummons({ ...summons, agenda: [...summons.agenda, newAgendaItem("New item")] });
  };

  const removeAgenda = (id: string) => {
    setSummons({ ...summons, agenda: summons.agenda.filter((x) => x.id !== id) });
  };

  const updateAgenda = (id: string, label: string) => {
    setSummons({ ...summons, agenda: summons.agenda.map((x) => x.id === id ? { ...x, label } : x) });
  };

  const addCandidate = () => {
    const c = newCandidate();
    setSummons({
      ...summons,
      candidates: [...summons.candidates, c],
      agenda: [...summons.agenda, { id: c.id + "-a", label: candidateAgendaLabel(c), kind: "candidate" }],
    });
  };

  const updateCandidate = (id: string, patch: Partial<Candidate>) => {
    const next = summons.candidates.map((c) => c.id === id ? { ...c, ...patch } : c);
    const updated = next.find((c) => c.id === id)!;
    setSummons({
      ...summons,
      candidates: next,
      agenda: summons.agenda.map((x) => x.id === id + "-a" ? { ...x, label: candidateAgendaLabel(updated) } : x),
    });
  };

  const removeCandidate = (id: string) => {
    setSummons({
      ...summons,
      candidates: summons.candidates.filter((c) => c.id !== id),
      agenda: summons.agenda.filter((x) => x.id !== id + "-a"),
    });
  };

  const generatePdf = async (action: "download" | "save" | "email"): Promise<string | null> => {
    setBusy(true);
    try {
      const blob = await generateSummonsBlob({
        template, officers, members: sortedMembers, summons,
        manualHidden: manualHidden as any,
      });
      if (action === "download") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `summons-${summons.meeting_number}.pdf`; a.click();
        URL.revokeObjectURL(url);
        return null;
      }
      // Save → upload + insert/update
      const path = `summonses/${summons.meeting_number}-${Date.now()}.pdf`;
      const up = await supabase.storage.from("lodge-docs").upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (up.error) throw up.error;
      const payload: any = {
        meeting_number: summons.meeting_number,
        lodge_event_id: selectedEvent || null,
        meeting_date: summons.meeting_date,
        meeting_time: summons.meeting_time,
        meeting_type: summons.meeting_type,
        dress_code: summons.dress_code,
        minutes_confirmation_date: summons.minutes_confirmation_date,
        next_meeting_date: summons.next_meeting_date,
        officer_night_date: summons.officer_night_date,
        agenda: summons.agenda as any,
        candidates: summons.candidates as any,
        dining_enquiry_name: summons.dining_enquiry_name,
        dining_enquiry_email: summons.dining_enquiry_email,
        notice_overrides: { manualHidden } as any,
        pdf_storage_path: path,
        status: action === "email" ? "sent" : "finalised",
      };
      let resultId = currentId;
      if (currentId) {
        const { error } = await supabase.from("summonses").update(payload).eq("id", currentId);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("summonses").insert(payload).select("id").single();
        if (error) throw error;
        resultId = ins.id;
        setCurrentId(ins.id);
      }
      toast.success(`Summons #${summons.meeting_number} ${currentId ? "updated" : "saved"}`);
      return resultId;
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate PDF");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const emailAll = async () => {
    const id = await generatePdf("email");
    if (!id) return;
    const { data, error } = await supabase.functions.invoke("send-summons-email", {
      body: { summons_id: id },
    });
    if (error) {
      toast.error(error.message ?? "Email send failed");
      return;
    }
    toast.success(`Summons emailed to ${(data as any)?.sent ?? 0} members`);
  };

  return (
    <div className="space-y-4">
      {editingId && (
        <div className="flex items-center justify-between bg-gold/15 border border-gold/40 text-gold rounded p-3 text-sm">
          <span>Editing summons #{summons.meeting_number}. Saving will update this record.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { onDoneEditing(); setSummons(EMPTY_SUMMONS); setCurrentId(null); setSelectedEvent(""); setManualHidden([]); }}
          >
            Start new instead
          </Button>
        </div>
      )}
      {/* Meeting basics */}
      <Section title="Meeting">

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Meeting number</Label>
            <Input type="number" value={summons.meeting_number} onChange={(e) => setSummons({ ...summons, meeting_number: parseInt(e.target.value, 10) || 0 })} />
          </div>
          <div>
            <Label>Link to Meeting Event</Label>
            <Select value={selectedEvent} onValueChange={onPickEvent}>
              <SelectTrigger><SelectValue placeholder="Pick from schedule…" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {formatDateShort(e.event_date)} — {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Meeting type</Label>
            <Select value={summons.meeting_type ?? "Regular"} onValueChange={(v) => setSummons({ ...summons, meeting_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Regular","Installation","Emergency"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={summons.meeting_date ?? ""} onChange={(e) => setSummons({ ...summons, meeting_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input value={summons.meeting_time ?? ""} onChange={(e) => setSummons({ ...summons, meeting_time: e.target.value || null })} />
          </div>
          <div>
            <Label>Dress code</Label>
            <Input value={summons.dress_code ?? ""} onChange={(e) => setSummons({ ...summons, dress_code: e.target.value || null })} />
          </div>
          <div>
            <Label>Minutes to confirm (date)</Label>
            <Input type="date" value={summons.minutes_confirmation_date ?? ""} onChange={(e) => setSummons({ ...summons, minutes_confirmation_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Next meeting</Label>
            <Input type="date" value={summons.next_meeting_date ?? ""} onChange={(e) => setSummons({ ...summons, next_meeting_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Officer Night</Label>
            <Input type="date" value={summons.officer_night_date ?? ""} onChange={(e) => setSummons({ ...summons, officer_night_date: e.target.value || null })} />
          </div>
        </div>
      </Section>

      {/* Agenda */}
      <Section title="Agenda" subtitle="Standing items are pre-loaded. Insert variable items, reorder, or remove as needed.">
        <div className="flex gap-2 items-end mb-3">
          <div className="flex-1">
            <Label>Add preset item</Label>
            <Select value={presetIndex} onValueChange={setPresetIndex}>
              <SelectTrigger><SelectValue placeholder="Pick a preset…" /></SelectTrigger>
              <SelectContent>
                {AGENDA_PRESETS.map((p, i) => <SelectItem key={i} value={String(i)}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={addPreset}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          <Button type="button" variant="outline" onClick={addCustomAgenda}>Custom</Button>
        </div>
        <ol className="space-y-1">
          {summons.agenda.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2">
              <span className="w-6 text-xs text-primary-foreground/60">{i + 1}.</span>
              <Input value={a.label} onChange={(e) => updateAgenda(a.id, e.target.value)} />
              {a.kind !== "standing" && (
                <Badge variant="outline" className="text-[10px]">{a.kind}</Badge>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => moveAgenda(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => moveAgenda(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => removeAgenda(a.id)}><Trash2 className="w-4 h-4" /></Button>
            </li>
          ))}
        </ol>
      </Section>

      {/* Candidates */}
      <Section title="Candidates" subtitle="Add one block per candidate. Each candidate auto-inserts an agenda line.">
        {summons.candidates.length === 0 && <p className="text-sm text-primary-foreground/60">No candidates this meeting.</p>}
        <div className="space-y-3">
          {summons.candidates.map((c) => (
            <div key={c.id} className="border border-gold/20 rounded p-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <Input placeholder="Full name" value={c.name} onChange={(e) => updateCandidate(c.id, { name: e.target.value })} />
                <Select value={c.ceremony_type} onValueChange={(v) => updateCandidate(c.id, { ceremony_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CEREMONY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="date" placeholder="DOB" value={c.dob} onChange={(e) => updateCandidate(c.id, { dob: e.target.value })} />
                <Input placeholder="Occupation" value={c.occupation} onChange={(e) => updateCandidate(c.id, { occupation: e.target.value })} />
                <Input placeholder="Address" value={c.address} onChange={(e) => updateCandidate(c.id, { address: e.target.value })} />
                <Input placeholder="Proposer" value={c.proposer} onChange={(e) => updateCandidate(c.id, { proposer: e.target.value })} />
                <Input placeholder="Seconder" value={c.seconder} onChange={(e) => updateCandidate(c.id, { seconder: e.target.value })} />
                <Input type="date" placeholder="Date proposed" value={c.date_proposed} onChange={(e) => updateCandidate(c.id, { date_proposed: e.target.value })} />
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={() => removeCandidate(c.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCandidate} className="mt-2">
          <Plus className="w-4 h-4 mr-1" /> Add candidate
        </Button>
      </Section>

      {/* Dining */}
      <Section title="Festive Board / Dining">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Menu</Label>
            <Textarea rows={3} value={summons.dining_menu ?? ""} onChange={(e) => setSummons({ ...summons, dining_menu: e.target.value || null })} />
          </div>
          <div className="space-y-2">
            <div>
              <Label>Price</Label>
              <Input value={summons.dining_price ?? ""} onChange={(e) => setSummons({ ...summons, dining_price: e.target.value || null })} />
            </div>
            <div>
              <Label>Booking deadline</Label>
              <Input type="date" value={summons.dining_deadline ?? ""} onChange={(e) => setSummons({ ...summons, dining_deadline: e.target.value || null })} />
            </div>
            <div>
              <Label>Dining enquiry contact</Label>
              <Input placeholder="Name" value={summons.dining_enquiry_name ?? ""} onChange={(e) => setSummons({ ...summons, dining_enquiry_name: e.target.value || null })} />
            </div>
            <Input placeholder="Email" value={summons.dining_enquiry_email ?? ""} onChange={(e) => setSummons({ ...summons, dining_enquiry_email: e.target.value || null })} />
          </div>
        </div>
      </Section>

      {/* Members + Overflow warning */}
      <Section title={`Members on summons (${sortedMembers.length})`} subtitle="Auto-pulled from active members, oldest seniority first.">
        {overflow.warn && (
          <div className="bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs rounded p-3 mb-3">
            <p className="font-medium">Page approaching capacity.</p>
            <p>Automatic plan: font size {overflow.fontSize}pt
              {overflow.hidden.length ? `, hiding notices: ${overflow.hidden.join(", ")}` : ""}
              {overflow.shortened.length ? `, shortening: ${overflow.shortened.join(", ")}` : ""}.
            </p>
            <p className="mt-1">Manually trim:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {(["overseas","data_protection","provincial_mcf","royal_arch","regular_meetings","loi"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1">
                  <input type="checkbox" checked={manualHidden.includes(k)} onChange={(e) => setManualHidden(e.target.checked ? [...manualHidden, k] : manualHidden.filter((x) => x !== k))} />
                  {k}
                </label>
              ))}
            </div>
          </div>
        )}
        {(() => {
          const { left, right } = splitTwoColumns(sortedMembers);
          const cell = (m: MemberRow) => (
            <div key={m.id} className="text-primary-foreground/80">
              {(m.is_past_master ? "+ " : "  ")}
              {(m.is_royal_arch ? "† " : "")}
              {formatDateShort(m.initiation_date || m.joined_lodge_date)} — {formatMemberLine(m)}
            </div>
          );
          return (
            <div className="flex gap-6 text-xs">
              <div className="flex-1 space-y-1">{left.map(cell)}</div>
              <div className="flex-1 space-y-1">{right.map(cell)}</div>
            </div>
          );
        })()}
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => generatePdf("download")} disabled={busy}><Download className="w-4 h-4 mr-2" /> Download PDF</Button>
        <Button variant="outline" onClick={() => generatePdf("save")} disabled={busy}><Save className="w-4 h-4 mr-2" /> Save to history</Button>
        <Button onClick={emailAll} disabled={busy} className="bg-gold text-navy hover:bg-gold/90"><Mail className="w-4 h-4 mr-2" /> Email to all members</Button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-navy-light/40 border border-gold/20 rounded p-4">
      <h2 className="font-serif text-lg text-gold">{title}</h2>
      {subtitle && <p className="text-xs text-primary-foreground/60 mb-2">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

// ===================== History Tab =====================
function HistoryTab({ onEdit }: { onEdit: (id: string) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("summonses")
        .select("id,meeting_number,meeting_date,meeting_type,status,sent_at,sent_to_count,pdf_storage_path")
        .order("meeting_date", { ascending: false });
      setRows(data ?? []);
    })();
  }, []);
  const open = async (path: string) => {
    const { data, error } = await supabase.storage.from("lodge-docs").createSignedUrl(path, 60 * 5);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this summons from history? The PDF will remain in storage.")) return;
    const { error } = await supabase.from("summonses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast.success("Summons deleted");
  };
  return (
    <div className="bg-navy-light/40 border border-gold/20 rounded p-4">
      {rows.length === 0 ? <p className="text-sm text-primary-foreground/60">No summonses saved yet.</p> : (
        <table className="w-full text-sm">
          <thead className="text-xs text-primary-foreground/60">
            <tr><th className="text-left py-1">#</th><th className="text-left">Date</th><th className="text-left">Type</th><th className="text-left">Status</th><th className="text-left">Sent to</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gold/10">
                <td className="py-1.5">{r.meeting_number}</td>
                <td>{formatDateShort(r.meeting_date)}</td>
                <td>{r.meeting_type}</td>
                <td><Badge variant="outline">{r.status}</Badge></td>
                <td>{r.sent_to_count ?? "—"}</td>
                <td>
                  <div className="flex gap-2 justify-end py-1.5">
                    <Button size="sm" variant="outline" className="text-navy" onClick={() => onEdit(r.id)}>Edit</Button>
                    {r.pdf_storage_path && (
                      <Button size="sm" variant="outline" className="text-navy" onClick={() => open(r.pdf_storage_path)}>
                        <FileText className="w-3.5 h-3.5 mr-1" /> Open
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

