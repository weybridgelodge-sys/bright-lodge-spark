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
import { ArrowDown, ArrowUp, CornerDownRight, Download, FileText, Mail, Plus, Save, Trash2 } from "lucide-react";
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
  subLetter,
} from "@/lib/summons";
import {
  generateSummonsBlob,
  LodgeTemplate,
  OfficerRollRow,
  SummonsData,
  DEFAULT_LOGO_URL,
  DEFAULT_COVER_LEFT_URL,
  DEFAULT_COVER_RIGHT_URL,
} from "@/lib/summonsPdf";
import { sendEventInvite, formatEventEmailHtml } from "@/lib/sendEventInvite";
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
  logo_url: DEFAULT_LOGO_URL,
  cover_left_image_url: DEFAULT_COVER_LEFT_URL,
  cover_right_image_url: DEFAULT_COVER_RIGHT_URL,
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
  officer_night_venue: null,
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
          .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,is_honorary_member,status")
          .eq("status", "active"),
      ]);
      if (tpl.data) {
        const merged = { ...EMPTY_TEMPLATE, ...(tpl.data as any), lodge_representatives: (tpl.data as any).lodge_representatives ?? [] };
        if (typeof merged.logo_url === "string") {
          const idx = merged.logo_url.indexOf("/__l5e/");
          if (idx > 0) merged.logo_url = merged.logo_url.slice(idx);
        }
        if (!merged.logo_url) merged.logo_url = EMPTY_TEMPLATE.logo_url;
        setTemplate(merged);
      }
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
        // Replace any previously-saved URLs that point to since-superseded
        // (truncated/broken) asset uploads with the current defaults.
        const STALE_URLS = new Set<string>([
          "/__l5e/assets-v1/3b24e36a-0ae2-48a6-beff-3f3a71f15e85/TLC-Patron-Pin.jpg",
          "/__l5e/assets-v1/7435bffd-65eb-49e7-9086-2c349fdb427f/Festival_Gold_Award_no_background.png",
          "/__l5e/assets-v1/57c18f79-500d-485c-bb45-3cef1b3bc800/weybridge-logo-navy.png",
        ]);
        if (!merged.logo_url || STALE_URLS.has(merged.logo_url)) merged.logo_url = DEFAULT_LOGO_URL;
        if (!merged.cover_left_image_url || STALE_URLS.has(merged.cover_left_image_url)) merged.cover_left_image_url = DEFAULT_COVER_LEFT_URL;
        if (!merged.cover_right_image_url || STALE_URLS.has(merged.cover_right_image_url)) merged.cover_right_image_url = DEFAULT_COVER_RIGHT_URL;
        // Strip any absolute origin from previously-saved asset URLs so they
        // resolve correctly on the current domain (preview / published / custom).
        for (const k of ["logo_url", "cover_left_image_url", "cover_right_image_url"] as const) {
          const v = (merged as any)[k];
          if (typeof v === "string") {
            const idx = v.indexOf("/__l5e/");
            if (idx > 0) (merged as any)[k] = v.slice(idx);
          }
        }
        setT(merged);
        setReps(((data as any).lodge_representatives ?? []) as Rep[]);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("lodge_template")
      .upsert({ ...t, id: "default", lodge_representatives: reps } as any);
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
        {F("logo_url", "Logo URL (centre crest)")}
        {F("dining_booking_url", "Dining booking URL")}
        {F("cover_left_image_url", "Cover left image URL")}
        {F("cover_right_image_url", "Cover right image URL")}
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
          <Button type="button" variant="outline" size="sm" className="text-navy" onClick={() => setReps([...reps, { role: "", name: "" }])}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90"><Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save template"}</Button>
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
    ? await supabase.from("profiles").select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,is_past_master,is_royal_arch,is_honorary_member,initiation_date,joined_lodge_date,joined_year,status,email").in("id", memberIds)
    : { data: [] as any[] };
  // Merge phone (PII) via secure RPC for secretary/admin/WM
  let phoneById: Record<string, string | null> = {};
  if (memberIds.length) {
    const { data: pii } = await (supabase as any).rpc("get_profiles_pii", { _ids: memberIds });
    for (const row of (pii as { id: string; phone: string | null }[]) ?? []) phoneById[row.id] = row.phone ?? null;
  }
  const byId = new Map((profs ?? []).map((p: any) => [p.id, { ...p, phone: phoneById[p.id] ?? null }]));
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
      post_nominals: p?.post_nominals ?? null,
      grand_rank: p?.grand_rank ?? null,
      provincial_rank: p?.provincial_rank ?? null,
      rank: p?.rank ?? null,
      email: p?.email ?? null,
      phone: p?.phone ?? null,
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
          .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,is_honorary_member,status")
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
    // Bind currentId immediately so a save while data is still loading
    // (or if the dining-contacts RPC errors) still updates this row instead
    // of inserting a duplicate.
    setCurrentId(editingId);
    (async () => {
      const { data, error } = await supabase.from("summonses").select("id,meeting_number,lodge_event_id,meeting_date,meeting_time,meeting_type,dress_code,minutes_confirmation_date,next_meeting_date,officer_night_date,officer_night_venue,agenda,candidates,dining_enquiry_name,notice_overrides,pdf_storage_path,status,sent_at,sent_to_count,created_by,created_at,updated_at,dining_menu,dining_price,dining_deadline").eq("id", editingId).maybeSingle();
      if (error || !data) { toast.error(error?.message ?? "Summons not found"); return; }
      const r: any = data;
      // dining_enquiry_email is column-restricted; fetch via secure RPC (secretary/admin/WM)
      let diningEmail: string | null = null;
      try {
        const { data: dc } = await (supabase as any).rpc("get_summons_dining_contacts", { _ids: [editingId] });
        if (Array.isArray(dc) && dc.length) diningEmail = dc[0].dining_enquiry_email ?? null;
      } catch { /* non-fatal */ }
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
        officer_night_venue: (r as any).officer_night_venue ?? null,
        agenda: (r.agenda as any) ?? defaultAgenda(),
        candidates: (r.candidates as any) ?? [],
        dining_enquiry_name: r.dining_enquiry_name,
        dining_enquiry_email: diningEmail,
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
    const preset = AGENDA_PRESETS[parseInt(presetIndex, 10)];
    // Insert before the "Receive reports" standing item (index of that label) so variable business sits in the gap.
    const insertAt = summons.agenda.findIndex((x) => /Receive reports/i.test(x.label));
    const a = [...summons.agenda];
    const item = newAgendaItem(preset.label);
    if (preset.children?.length) {
      item.children = preset.children.map((c) => newAgendaItem(c));
    }
    a.splice(insertAt === -1 ? Math.max(a.length - 1, 0) : insertAt, 0, item);
    setSummons({ ...summons, agenda: a });
    setPresetIndex("");
  };

  const addCustomAgenda = () => {
    setSummons({ ...summons, agenda: [...summons.agenda, newAgendaItem("New item")] });
  };

  const removeAgenda = (id: string) => {
    setSummons({
      ...summons,
      agenda: summons.agenda
        .filter((x) => x.id !== id)
        .map((x) => ({ ...x, children: (x.children ?? []).filter((c) => c.id !== id) })),
    });
  };

  const updateAgenda = (id: string, label: string) => {
    setSummons({
      ...summons,
      agenda: summons.agenda.map((x) => {
        if (x.id === id) return { ...x, label };
        if (x.children?.some((c) => c.id === id)) {
          return { ...x, children: x.children.map((c) => (c.id === id ? { ...c, label } : c)) };
        }
        return x;
      }),
    });
  };

  const addSubItem = (parentId: string) => {
    setSummons({
      ...summons,
      agenda: summons.agenda.map((x) =>
        x.id === parentId
          ? { ...x, children: [...(x.children ?? []), newAgendaItem("New sub-item")] }
          : x,
      ),
    });
  };

  const moveSubItem = (parentId: string, i: number, dir: -1 | 1) => {
    setSummons({
      ...summons,
      agenda: summons.agenda.map((x) => {
        if (x.id !== parentId || !x.children) return x;
        const arr = [...x.children];
        const j = i + dir;
        if (j < 0 || j >= arr.length) return x;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        return { ...x, children: arr };
      }),
    });
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
        officer_night_venue: summons.officer_night_venue ?? null,
        agenda: summons.agenda as any,
        candidates: summons.candidates as any,
        dining_enquiry_name: summons.dining_enquiry_name,
        dining_enquiry_email: summons.dining_enquiry_email,
        dining_menu: summons.dining_menu,
        dining_price: summons.dining_price,
        dining_deadline: summons.dining_deadline,
        notice_overrides: { manualHidden } as any,
        pdf_storage_path: path,
        status: action === "email" ? "sent" : "finalised",
      };
      const targetId = currentId ?? editingId;
      let resultId = targetId;
      if (targetId) {
        const { error } = await supabase.from("summonses").update(payload).eq("id", targetId);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("summonses").insert(payload).select("id").single();
        if (error) throw error;
        resultId = ins.id;
        setCurrentId(ins.id);
      }
      toast.success(`Summons #${summons.meeting_number} ${targetId ? "updated" : "saved"}`);
      return resultId;
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate PDF");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const emailAll = async () => {
    const ok = window.confirm(
      `This will email Summons #${summons.meeting_number} to ALL active members. Continue?`,
    );
    if (!ok) return;
    const id = await generatePdf("email");
    if (!id) return;
    const { data, error } = await supabase.functions.invoke("send-summons-email", {
      body: { summons_id: id },
    });
    if (error) {
      toast.error(error.message ?? "Email send failed");
      return;
    }
    const d = data as any;
    toast.success(`Summons emailed to ${d?.sent ?? 0} of ${d?.recipients ?? 0} members`);
    if (d?.failures?.length) {
      toast.error(`${d.failures.length} delivery(ies) failed — see history log`);
    }
  };

  const emailTest = async () => {
    const addr = window.prompt(
      "Send a test summons email to which address?",
      "julientidmarsh@pm.me",
    );
    if (!addr) return;
    const id = await generatePdf("save");
    if (!id) return;
    const { data, error } = await supabase.functions.invoke("send-summons-email", {
      body: { summons_id: id, test_recipient: addr.trim() },
    });
    if (error) {
      toast.error(error.message ?? "Test email failed");
      return;
    }
    const d = data as any;
    if (d?.sent) toast.success(`Test summons sent to ${addr}`);
    else toast.error(d?.failures?.[0]?.error ?? "Test email failed");
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
            className="text-navy"
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
          <div>
            <Label>Officer Night venue (optional override)</Label>
            <Input placeholder="Masonic Centre" value={summons.officer_night_venue ?? ""} onChange={(e) => setSummons({ ...summons, officer_night_venue: e.target.value || null })} />
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
                {AGENDA_PRESETS.map((p, i) => <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={addPreset}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          <Button type="button" variant="outline" className="text-navy" onClick={addCustomAgenda}>Custom</Button>
        </div>
        <ol className="space-y-1">
          {summons.agenda.map((a, i) => (
            <li key={a.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 text-xs text-primary-foreground/60">{i + 1}.</span>
                <Input value={a.label} onChange={(e) => updateAgenda(a.id, e.target.value)} />
                {a.kind !== "standing" && (
                  <Badge variant="outline" className="text-[10px]">{a.kind}</Badge>
                )}
                <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => addSubItem(a.id)} title="Add sub-item"><CornerDownRight className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveAgenda(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveAgenda(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => removeAgenda(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              {a.children && a.children.length > 0 && (
                <ol className="space-y-1 pl-8">
                  {a.children.map((c, ci) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className="w-6 text-xs text-primary-foreground/60">{subLetter(ci)}.</span>
                      <Input value={c.label} onChange={(e) => updateAgenda(c.id, e.target.value)} />
                      <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveSubItem(a.id, ci, -1)}><ArrowUp className="w-4 h-4" /></Button>
                      <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveSubItem(a.id, ci, 1)}><ArrowDown className="w-4 h-4" /></Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => removeAgenda(c.id)}><Trash2 className="w-4 h-4" /></Button>
                    </li>
                  ))}
                </ol>
              )}
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
        <Button type="button" variant="outline" size="sm" onClick={addCandidate} className="mt-2 text-navy">
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
        <Button variant="outline" className="text-navy" onClick={() => generatePdf("save")} disabled={busy}><Save className="w-4 h-4 mr-2" /> Save to history</Button>
        <Button variant="outline" className="text-navy" onClick={emailTest} disabled={busy}><Mail className="w-4 h-4 mr-2" /> Send test email…</Button>
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
  const changeStatus = async (r: any, next: "in_progress" | "finalised") => {
    // Map "in_progress" -> stored "draft"; "finalised" -> "finalised"
    const stored = next === "in_progress" ? "draft" : "finalised";
    const { error } = await supabase.from("summonses").update({ status: stored }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, status: stored } : x));

    if (next === "finalised" && r.pdf_storage_path) {
      // Avoid duplicate library entry
      const { data: existing } = await supabase
        .from("lodge_documents")
        .select("id")
        .eq("file_path", r.pdf_storage_path)
        .maybeSingle();
      if (!existing) {
        const title = `Summons #${r.meeting_number} — ${formatDateShort(r.meeting_date)}`;
        const { error: dErr } = await supabase.from("lodge_documents").insert({
          title,
          description: r.meeting_type ?? null,
          category: "summons",
          file_path: r.pdf_storage_path,
        });
        if (dErr) { toast.error(`Saved status, but library add failed: ${dErr.message}`); return; }
        toast.success("Finalised and added to Document Library");
        return;
      }
    }
    toast.success("Status updated");
  };
  const displayStatus = (s: string): "in_progress" | "finalised" =>
    s === "finalised" || s === "sent" ? "finalised" : "in_progress";
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
                <td>
                  <Select
                    value={displayStatus(r.status)}
                    onValueChange={(v) => changeStatus(r, v as "in_progress" | "finalised")}
                  >
                    <SelectTrigger className="h-8 w-[140px] bg-navy text-primary-foreground border-gold/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="finalised">Finalised</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
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


