import { loadDocIdentity, docTitle, docSubtitle, docFileName, docGroupName } from "@/lib/docIdentity";
import { nextMeetingNotice, applyBallotOnly, isBallotOnlyTicked } from "@/lib/summonsNotices";
import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { countVisitorVisits, isRecentVisitor, type VisitorAttendanceRow } from "@/lib/kpis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CornerDownRight, Download, FileText, Mail, Plus, Save, Trash2, FilePlus, Printer, Building2, Users, History } from "lucide-react";
import { saveBlob } from "@/lib/nativeDownload";
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
  normaliseTemplateAssets,
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
import { generateICS, icsFilename } from "@/lib/generateICS";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { accountsOptionLabel, type AttachableAccounts } from "@/lib/treasurer/yearAudit";
import SummonsPrintPreview from "@/components/members/SummonsPrintPreview";
import {
  NON_PROGRESSIVE_LABELS,
  fetchOfficerYear,
  NonProgressiveKey,
  POSITION_LABELS,
  PositionKey,
} from "@/lib/officersProgression";
import { resolveOfficeRoll, provenanceLabel } from "@/lib/officerRoll";
import { lodgeTitle, loadLodgeIdentity } from "@/lib/lodgeIdentity";
import { applyDerivedNames } from "@/lib/summonsSources";
import { resolveRepresentatives, type ResolvedRep } from "@/lib/representatives";
import { POSITION_SELECT } from "@/lib/officerPositions";
import OmittedPostsNote from "@/components/members/OmittedPostsNote";
import { loadMeetingPatternSources, saveMeetingPatternOverride } from "@/lib/meetingPattern";
import { chooseMeetingPattern } from "@/lib/meetingDiary";

/** Template as it prints: member-derived names and the single-source meeting pattern. */
async function printableTemplate(raw: any, members: MemberRow[]): Promise<LodgeTemplate> {
  const base = normaliseTemplateAssets({ ...EMPTY_TEMPLATE, ...raw, lodge_representatives: raw?.lodge_representatives ?? [] }) as LodgeTemplate;
  try {
    // Blank name/number/consecration come from the lodge record, never typed defaults.
    const id = await loadLodgeIdentity();
    base.lodge_name = base.lodge_name?.trim() || id.lodgeName || null as any;
    base.lodge_number = base.lodge_number?.trim() || id.lodgeNumber || null as any;
    base.consecration_date = base.consecration_date || id.consecrationDate || null;
  } catch { /* keep template values */ }
  let pattern = base.regular_meeting_pattern;
  try { pattern = chooseMeetingPattern({ ...(await loadMeetingPatternSources()), manualText: base.regular_meeting_pattern }).text || null; } catch { /* keep typed text */ }
  let reps: ResolvedRep[] | null = null;
  try {
    const [year, pos, ap] = await Promise.all([
      fetchOfficerYear(),
      supabase.from("officer_positions").select(POSITION_SELECT).eq("category", "representative"),
      supabase.from("officer_appointments").select("position_key,member_id,lodge_year,is_projection,display_name").like("position_key", "rep_%"),
    ]);
    if (!pos.error && !ap.error) reps = resolveRepresentatives({ year, consumer: "summons", positions: (pos.data ?? []) as any, appts: (ap.data ?? []) as any, template: base as any });
  } catch { /* template fallback */ }
  return applyDerivedNames({ ...base, regular_meeting_pattern: pattern }, members, reps);
}

// ----- Visitor salutation parsing -----
// Turns a free-text visitor name like "W Bro. RD Smith (Richard)" into
// "W Bro Smith" for use in "Dear W Bro Smith,".
export function parseSalutation(raw: string | null | undefined): string {
  if (!raw) return "Brother";
  let s = String(raw).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "Brother";
  // Match a leading title (RW Bro, VW Bro, W Bro, Rt Wor Bro, Bro, Mr, Mrs, Ms, Miss, Dr, Rev).
  const titleRe = /^((?:R\.?\s*W\.?|V\.?\s*W\.?|W\.?|Rt\.?\s*Wor\.?)\s*Bro\.?|Bro\.?|Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Rev\.?)\s+(.+)$/i;
  const m = s.match(titleRe);
  let title = "";
  let rest = s;
  if (m) {
    title = m[1].replace(/\./g, "").replace(/\s+/g, " ").trim();
    // Normalise capitalisation for masonic titles
    title = title.replace(/w\s*bro/i, (x) => x.toUpperCase().replace(/BRO/, "Bro"))
                 .replace(/\bBRO\b/g, "Bro")
                 .replace(/\bWORO?\b/gi, "Wor");
    rest = m[2].trim();
  }
  const parts = rest.split(" ").filter(Boolean);
  // Drop leading initials like "RD" or "R.D." or "R"
  while (parts.length > 1 && /^[A-Z]\.?([A-Z]\.?){0,3}$/.test(parts[0])) parts.shift();
  // Ignore trailing post-nominals in brackets already removed; take last token as surname
  const surname = (parts[parts.length - 1] ?? "").replace(/[^A-Za-z'\-]/g, "");
  const finalTitle = title || "Bro";
  return `${finalTitle} ${surname}`.trim();
}

type Rep = { role: string; name: string; member_id?: string | null };
type PickMember = { id: string; label: string };
const NO_LINK = "__none__";
function MemberLink({ value, onChange, members, label }: { value?: string | null; onChange: (id: string | null) => void; members: PickMember[]; label: string }) {
  return (
    <Select value={value || NO_LINK} onValueChange={(v) => onChange(v === NO_LINK ? null : v)}>
      <SelectTrigger className="w-full min-w-0" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_LINK}>Not linked to a member</SelectItem>
        {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const EMPTY_TEMPLATE: LodgeTemplate = {
  lodge_name: "",
  lodge_number: "",
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
          <TabsList className="flex flex-col w-full h-auto items-stretch gap-1 bg-navy p-2 rounded-sm border border-gold/20 mb-4">
            <TabsTrigger
              value="new"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <FilePlus className="w-4 h-4 shrink-0" />
              <span>{editingId ? "Edit Summons" : "New Summons"}</span>
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print Preview</span>
            </TabsTrigger>
            <TabsTrigger
              value="template"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Lodge Template</span>
            </TabsTrigger>
            <TabsTrigger
              value="officers"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Officer Roll</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <History className="w-4 h-4 shrink-0" />
              <span>History</span>
            </TabsTrigger>
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
      if (tpl.data) setTemplate(await printableTemplate(tpl.data, (mem.data ?? []) as any));
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
  const [pick, setPick] = useState<PickMember[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lodge_template").select("*").eq("id", "default").maybeSingle();
      if (data) {
        const merged = normaliseTemplateAssets({ ...EMPTY_TEMPLATE, ...(data as any), lodge_representatives: (data as any).lodge_representatives ?? [] });
        setT(merged);
        setReps(((data as any).lodge_representatives ?? []) as Rep[]);
      }
      const { data: mem } = await supabase.from("profiles").select("id,first_name,last_name,full_name").eq("status", "active");
      setPick(((mem ?? []) as any[]).map((m) => ({ id: m.id, label: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.full_name || "Unnamed" })).sort((a, b) => a.label.localeCompare(b.label)));
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
        <Textarea aria-label={`${label}`}
          rows={3}
          value={(t as any)[k] ?? ""}
          onChange={(e) => setT({ ...t, [k]: e.target.value || null } as any)}
        />
      ) : (
        <Input
          aria-label={label}
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
      <MeetingPatternField t={t} setT={setT} />
      {F("loi_details", "Rehearsal Night (day / time / venue)", "textarea")}
      <div className="grid sm:grid-cols-2 gap-3">
        {F("provincial_website", "Provincial website")}
        {F("mcf_contact", "MCF contact", "textarea")}
        <div className="min-w-0 space-y-2">
          {F("royal_arch_rep", "Royal Arch Representative", "textarea")}
          <Label className="text-xs">Linked member (when linked, the Summons and Provincial Return print the member's name and ranks; the text above is used only for a non-member)</Label>
          <MemberLink label="Royal Arch Representative linked member" members={pick} value={(t as any).royal_arch_rep_member_id} onChange={(id) => setT({ ...t, royal_arch_rep_member_id: id } as any)} />
        </div>
        <div className="min-w-0 space-y-1">
          {F("honorary_members", "Honorary members (non-members only)", "textarea")}
          <p className="text-xs text-primary-foreground/80">Members marked as honorary on their member record print automatically; this text is used only when none are marked.</p>
        </div>
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
        <p className="text-xs text-primary-foreground/80">When a member is linked, the Summons and Provincial Return print that member's name and ranks from the member record. The typed Name is used only for a non-member.</p>
        <div className="space-y-2 mt-1">
          {reps.map((r, i) => (
            <div key={i} className="grid min-w-0 grid-cols-1 gap-2 rounded-sm border border-gold/10 p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:border-0 sm:p-0">
              <Input aria-label="Role" className="min-w-0" placeholder="Role" value={r.role} onChange={(e) => setReps(reps.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
              <Input aria-label="Name" className="min-w-0" placeholder="Name" value={r.name} onChange={(e) => setReps(reps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <MemberLink label={`${r.role || "Representative"} linked member`} members={pick} value={r.member_id} onChange={(id) => setReps(reps.map((x, j) => j === i ? { ...x, member_id: id } : x))} />
              <Button type="button" variant="destructive" size="sm" aria-label="Remove representative" onClick={() => setReps(reps.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="text-navy" onClick={() => setReps([...reps, { role: "", name: "" }])}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90"><Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save template"}</Button>
    </div>
  );
}

function MeetingPatternField({ t, setT }: { t: LodgeTemplate; setT: (t: LodgeTemplate) => void }) {
  const [src, setSrc] = useState<{ generated: string; manualOverride: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { loadMeetingPatternSources().then(setSrc).catch(() => setSrc({ generated: "", manualOverride: false })); }, []);
  const toggle = async (on: boolean) => {
    setBusy(true);
    const { error } = await saveMeetingPatternOverride(on);
    setBusy(false);
    if (error) return toast.error(error.message);
    setSrc((x) => (x ? { ...x, manualOverride: on } : x));
  };
  const chosen = src ? chooseMeetingPattern({ ...src, manualText: t.regular_meeting_pattern }) : null;
  return (
    <fieldset className="min-w-0 space-y-2 rounded-sm border border-gold/20 p-3">
      <legend className="px-1 text-sm font-medium">Regular meeting pattern</legend>
      <p className="text-xs text-primary-foreground/80">
        Worked out from the saved schedule in Meeting Diary.{" "}
        {src && !src.generated && "No schedule is saved there yet, so the text below is used."}
      </p>
      <p className="text-sm" data-testid="pattern-generated"><span className="text-primary-foreground/80">From schedule: </span>{src?.generated || "—"}</p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox checked={!!src?.manualOverride} disabled={!src || busy} onCheckedChange={(v) => toggle(v === true)} aria-label="Use manual text instead of the schedule" />
        Use manual text instead of the schedule
      </label>
      <Textarea aria-label="Manual meeting pattern text" rows={3} value={t.regular_meeting_pattern ?? ""} onChange={(e) => setT({ ...t, regular_meeting_pattern: e.target.value || null })} />
      {chosen && <p className="text-xs" data-testid="pattern-prints"><span className="text-primary-foreground/80">Prints: </span>{chosen.text || "—"} ({chosen.source === "schedule" ? "from schedule" : "manual text"})</p>}
    </fieldset>
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
        Worked out for the current Installation year: progressive offices follow the Progression Ladder; other offices carry forward from the latest confirmed appointment. The status column is shown here only, not on the printed summons.
      </p>
      {loading ? (
        <p className="text-sm text-primary-foreground/70">Loading…</p>
      ) : (
        <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-gold/10">
                  <td className="py-1.5 pr-2 font-medium text-primary-foreground/80">{r.label}</td>
                  <td className="py-1.5">{r.member || <span className="text-primary-foreground/80">Vacant</span>}</td>
                  <td className="py-1.5 pl-2 text-xs text-primary-foreground/80">{provenanceLabel({ provenance: r.provenance ?? "vacant", fromYear: r.fromYear ?? null })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ROLL_KEYS: string[] = [
  "worshipful_master","senior_warden","junior_warden",
  "immediate_past_master","chaplain","treasurer","secretary","assistant_secretary",
  "director_of_ceremonies","assistant_director_of_ceremonies",
  "senior_deacon","junior_deacon","inner_guard",
  "almoner","charity_steward","mentor","membership_officer",
  "senior_steward","steward_1","steward_2","steward_3","steward_4","steward_5",
  "tyler","assistant_tyler",
];

async function loadOfficers(setRows: (rows: OfficerRollRow[]) => void, setLoading: (b: boolean) => void) {
  setLoading(true);
  // Officers for the current Installation year, resolved by the shared rule used by the returns.
  const lodgeYear = await fetchOfficerYear();
  const [apptRes, statusRes, profRes] = await Promise.all([
    supabase.from("officer_appointments").select("position_key,member_id,lodge_year,is_projection,override_reason"),
    supabase.from("member_progression_status").select("member_id,readiness,seniority_initiation_date,seniority_tiebreaker"),
    supabase.from("profiles").select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,is_past_master,is_royal_arch,is_honorary_member,initiation_date,joined_lodge_date,joined_year,status,email"),
  ]);
  const profs = (profRes.data ?? []) as any[];
  const labelFor = (k: string) =>
    (POSITION_LABELS as any)[k as PositionKey] || (NON_PROGRESSIVE_LABELS as any)[k as NonProgressiveKey] || k;
  const resolved = resolveOfficeRoll(ROLL_KEYS.map((k) => ({ key: k, label: labelFor(k) })), {
    year: lodgeYear, appts: (apptRes.data ?? []) as any, profiles: profs, statuses: (statusRes.data ?? []) as any,
  });
  const memberIds = Array.from(new Set(resolved.map((r) => r.memberId).filter(Boolean))) as string[];
  // Merge phone (PII) via secure RPC for secretary/admin/WM
  const phoneById: Record<string, string | null> = {};
  if (memberIds.length) {
    const { data: pii } = await (supabase as any).rpc("get_profiles_pii", { _ids: memberIds });
    for (const row of (pii as { id: string; phone: string | null }[]) ?? []) phoneById[row.id] = row.phone ?? null;
  }
  const byId = new Map(profs.map((p) => [p.id, { ...p, phone: phoneById[p.id] ?? null }]));
  setRows(resolved.map((o) => {
    const p = o.memberId ? byId.get(o.memberId) : null;
    return {
      label: o.label,
      member: p ? formatMemberLine(p as MemberRow) : "",
      member_formal: p ? formatMemberLineFormal(p as MemberRow) : "",
      post_nominals: p?.post_nominals ?? null,
      grand_rank: p?.grand_rank ?? null,
      provincial_rank: p?.provincial_rank ?? null,
      rank: p?.rank ?? null,
      email: p?.email ?? null,
      phone: p?.phone ?? null,
      provenance: p ? o.provenance : "vacant",
      fromYear: o.fromYear,
    };
  }));
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
  const [alreadySent, setAlreadySent] = useState(false);
  const [attachable, setAttachable] = useState<AttachableAccounts[]>([]);
  const [attachOn, setAttachOn] = useState(false);
  const [attachId, setAttachId] = useState<string>("");
  useEffect(() => {
    (supabase as any).rpc("get_attachable_accounts").then(({ data }: any) => {
      const list = (data ?? []) as AttachableAccounts[];
      setAttachable(list);
      setAttachId((cur) => cur || list[0]?.approval_id || "");
    });
  }, []);
  const chosenAccounts = attachOn ? attachable.find((a) => a.approval_id === attachId) ?? null : null;

  useEffect(() => {
    (async () => {
      const [tpl, mem, evs, fb, last] = await Promise.all([
        supabase.from("lodge_template").select("*").eq("id", "default").maybeSingle(),
        supabase
          .from("profiles")
          .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,is_honorary_member,status")
          .eq("status", "active"),
        supabase.from("lodge_events").select("id,title,event_date,tyling_time,dress_code,location").order("event_date", { ascending: true }),
        supabase.from("festive_board_meetings").select("id,meeting_date,notes,meeting_type,cancelled_at").order("meeting_date", { ascending: true }),
        supabase.from("summonses").select("meeting_number").order("meeting_number", { ascending: false }).limit(1),
      ]);
      if (tpl.data) setTemplate(await printableTemplate(tpl.data, (mem.data ?? []) as any));
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
      setAlreadySent(!!r.sent_at);
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
        interim_meeting_note: (r.notice_overrides as any)?.interimMeetingNote ?? null,
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
    // Next REGULAR meeting from the register, plus any dispensation/emergency meeting before it.
    const n = nextMeetingNotice(festive, iso);
    setSummons((s) => ({ ...s, next_meeting_date: n.nextRegular, interim_meeting_note: n.interimNote }));
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

  const fillNextFromRegister = () => {
    const n = nextMeetingNotice(festive, summons.meeting_date);
    setSummons({ ...summons, next_meeting_date: n.nextRegular, interim_meeting_note: n.interimNote });
  };

  const setBallotOnly = (c: Candidate, ballotOnly: boolean) => {
    const others = summons.candidates.filter((x) => x.id !== c.id).map((x) => x.id);
    setSummons({ ...summons, agenda: applyBallotOnly(c, summons.agenda, ballotOnly, (b) => candidateAgendaLabel(c, b), others) });
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
      agenda: summons.agenda.map((x) => x.id === id + "-a" ? { ...x, label: candidateAgendaLabel(updated, x.action === "ballot"), ...(updated.ceremony_type !== "Initiation" ? { action: undefined } : {}) } : x),
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
        await saveBlob(blob, `summons-${summons.meeting_number}.pdf`);
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
        notice_overrides: { manualHidden, interimMeetingNote: summons.interim_meeting_note ?? null } as any,
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
    const dateLabel = summons.meeting_date
      ? new Date(summons.meeting_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "";
    // Accounts can only go out with a first full send — on an already-sent
    // summons the tick-box is for test-email previews only.
    const liveAccounts = alreadySent ? null : chosenAccounts;
    const ok = window.confirm(
      liveAccounts
        ? `This will email ALL active members:\n\n1. Summons #${summons.meeting_number}${dateLabel ? ` for ${dateLabel}` : ""}\n2. ${accountsOptionLabel(liveAccounts).replace(/^Attach /, "The ")} (separate download link)\n\nThe accounts will be recorded as sent with this summons. Continue?`
        : `This will email Summons #${summons.meeting_number}${dateLabel ? ` for ${dateLabel}` : ""} to ALL active members. Continue?`,
    );
    if (!ok) return;
    const id = await generatePdf("email");
    if (!id) return;
    const { data, error } = await supabase.functions.invoke("send-summons-email", {
      body: { summons_id: id, accounts_approval_id: liveAccounts?.approval_id ?? undefined },
    });
    if (error) {
      toast.error(error.message ?? "Email send failed");
      return;
    }
    const d = data as any;
    toast.success(`Summons${d?.accounts_included ? " and annual accounts" : ""} emailed to ${d?.sent ?? 0} of ${d?.recipients ?? 0} members`);
    if (d?.sent > 0) {
      setAlreadySent(true);
      if (d?.accounts_included) setAttachable((l) => l.filter((a) => a.approval_id !== chosenAccounts?.approval_id));
    }
    if (d?.failures?.length) {
      toast.error(`${d.failures.length} delivery(ies) failed — see history log`);
    }
    // Officers Night one-off .ics invite removed for members — dates are already
    // in the Member Calendar subscription feed. Visitor flow (send-summons-to-visitors)
    // still sends a one-off .ics since visitors don't have calendar subscriptions.
  };

  const [visitorDialogOpen, setVisitorDialogOpen] = useState(false);

  const resolveOfficerDisplayName = async (positionKey: string): Promise<string> => {
    try {
      // Holder in post today (Installation year, offices carry forward).
      const { data: holderId } = await (supabase as any).rpc("current_officer_holder", { _position_key: positionKey });
      const appt = { member_id: (holderId as string | null) ?? null };
      if (!appt.member_id) return "";
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,status")
        .eq("id", appt.member_id).maybeSingle();
      if (!prof) return "";
      return formatMemberLineFormal(prof as MemberRow);
    } catch { return ""; }
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
      body: { summons_id: id, test_recipient: addr.trim(), accounts_approval_id: chosenAccounts?.approval_id ?? undefined },
    });
    if (error) {
      toast.error(error.message ?? "Test summons email failed");
    } else {
      const d = data as any;
      if (d?.sent) toast.success(`Test summons sent to ${addr}`);
      else toast.error(d?.failures?.[0]?.error ?? d?.error ?? "Test summons email failed");
    }
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
            <Input aria-label="Meeting number" type="number" value={summons.meeting_number} onChange={(e) => setSummons({ ...summons, meeting_number: parseInt(e.target.value, 10) || 0 })} />
          </div>
          <div>
            <Label>Link to Meeting Event</Label>
            <Select value={selectedEvent} onValueChange={onPickEvent}>
              <SelectTrigger aria-label="Link to Meeting Event"><SelectValue placeholder="Pick from schedule…" /></SelectTrigger>
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
              <SelectTrigger aria-label="Meeting type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Regular","Installation","Emergency"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input aria-label="Date" type="date" value={summons.meeting_date ?? ""} onChange={(e) => setSummons({ ...summons, meeting_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input aria-label="Time" value={summons.meeting_time ?? ""} onChange={(e) => setSummons({ ...summons, meeting_time: e.target.value || null })} />
          </div>
          <div>
            <Label>Dress code</Label>
            <Input aria-label="Dress code" value={summons.dress_code ?? ""} onChange={(e) => setSummons({ ...summons, dress_code: e.target.value || null })} />
          </div>
          <div>
            <Label>Minutes to confirm (date)</Label>
            <Input aria-label="Minutes to confirm (date)" type="date" value={summons.minutes_confirmation_date ?? ""} onChange={(e) => setSummons({ ...summons, minutes_confirmation_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Next regular meeting</Label>
            <Input aria-label="Next regular meeting" type="date" value={summons.next_meeting_date ?? ""} onChange={(e) => setSummons({ ...summons, next_meeting_date: e.target.value || null })} />
            <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11" onClick={fillNextFromRegister} disabled={!summons.meeting_date}>Fill from Meeting Diary</Button>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="interim-meeting-note">Meeting before the next regular one (optional)</Label>
            <Input id="interim-meeting-note" className="min-h-11" placeholder="e.g. A meeting by dispensation will be held on …" value={summons.interim_meeting_note ?? ""} onChange={(e) => setSummons({ ...summons, interim_meeting_note: e.target.value || null })} />
          </div>
          <div>
            <Label>Officer Night</Label>
            <Input aria-label="Officer Night" type="date" value={summons.officer_night_date ?? ""} onChange={(e) => setSummons({ ...summons, officer_night_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Officer Night venue (optional override)</Label>
            <Input aria-label="Officer Night venue (optional override)" placeholder="Masonic Centre" value={summons.officer_night_venue ?? ""} onChange={(e) => setSummons({ ...summons, officer_night_venue: e.target.value || null })} />
          </div>
        </div>
      </Section>

      {/* Agenda */}
      <Section title="Agenda" subtitle="Standing items are pre-loaded. Insert variable items, reorder, or remove as needed.">
        <div className="flex gap-2 items-end mb-3">
          <div className="flex-1">
            <Label>Add preset item</Label>
            <Select value={presetIndex} onValueChange={setPresetIndex}>
              <SelectTrigger aria-label="Add preset item"><SelectValue placeholder="Pick a preset…" /></SelectTrigger>
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
                <span className="w-6 text-xs text-primary-foreground/80">{i + 1}.</span>
                <Input aria-label={`Agenda item ${i + 1}`} value={a.label} onChange={(e) => updateAgenda(a.id, e.target.value)} />
                {a.kind !== "standing" && (
                  <Badge variant="outline" className="text-[10px]">{a.kind}</Badge>
                )}
                <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => addSubItem(a.id)} title="Add sub-item" aria-label={`Add sub-item to agenda item ${i + 1}`}><CornerDownRight className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveAgenda(i, -1)} aria-label={`Move agenda item ${i + 1} up`}><ArrowUp className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveAgenda(i, 1)} aria-label={`Move agenda item ${i + 1} down`}><ArrowDown className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => removeAgenda(a.id)} aria-label={`Remove agenda item ${i + 1}`}><Trash2 className="w-4 h-4" /></Button>
              </div>
              {a.children && a.children.length > 0 && (
                <ol className="space-y-1 pl-8">
                  {a.children.map((c, ci) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className="w-6 text-xs text-primary-foreground/80">{subLetter(ci)}.</span>
                      <Input aria-label={`Agenda item ${i + 1}${subLetter(ci)}`} value={c.label} onChange={(e) => updateAgenda(c.id, e.target.value)} />
                      <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveSubItem(a.id, ci, -1)} aria-label={`Move item ${i + 1}${subLetter(ci)} up`}><ArrowUp className="w-4 h-4" /></Button>
                      <Button type="button" size="sm" variant="ghost" className="text-gold hover:text-gold hover:bg-gold/10" onClick={() => moveSubItem(a.id, ci, 1)} aria-label={`Move item ${i + 1}${subLetter(ci)} down`}><ArrowDown className="w-4 h-4" /></Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => removeAgenda(c.id)} aria-label={`Remove item ${i + 1}${subLetter(ci)}`}><Trash2 className="w-4 h-4" /></Button>
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
        {summons.candidates.length === 0 && <p className="text-sm text-primary-foreground/80">No candidates this meeting.</p>}
        <div className="space-y-3">
          {summons.candidates.map((c) => (
            <div key={c.id} className="border border-gold/20 rounded p-3 space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`${c.id}-name`}>Name</Label>
                  <Input id={`${c.id}-name`} className="min-h-11" placeholder="e.g. Jules P Tidmarsh" value={c.name} onChange={(e) => updateCandidate(c.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Ceremony</Label>
                  <Select value={c.ceremony_type} onValueChange={(v) => updateCandidate(c.id, { ceremony_type: v as any })}>
                    <SelectTrigger className="min-h-11" aria-label="Ceremony"><SelectValue /></SelectTrigger>
                    <SelectContent>{CEREMONY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  {c.ceremony_type === "Initiation" && (
                    <label className="mt-2 flex min-h-11 items-center gap-2 font-sans text-sm text-primary-foreground">
                      <input type="checkbox" className="h-5 w-5" checked={isBallotOnlyTicked(c, summons.agenda, summons.candidates.filter((x) => x.id !== c.id).map((x) => x.id))} onChange={(e) => setBallotOnly(c, e.target.checked)} />
                      Ballot only at this meeting (initiate later)
                    </label>
                  )}
                </div>
                <div>
                  <Label htmlFor={`${c.id}-dob`}>Date of birth</Label>
                  <Input id={`${c.id}-dob`} type="date" className="min-h-11" value={c.dob} onChange={(e) => updateCandidate(c.id, { dob: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`${c.id}-occupation`}>Occupation</Label>
                  <Input id={`${c.id}-occupation`} className="min-h-11" placeholder="e.g. Chartered Surveyor" value={c.occupation} onChange={(e) => updateCandidate(c.id, { occupation: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`${c.id}-address`}>Address</Label>
                  <Input id={`${c.id}-address`} className="min-h-11" placeholder="e.g. 12 High Street, Guildford" value={c.address} onChange={(e) => updateCandidate(c.id, { address: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`${c.id}-proposer`}>Proposer</Label>
                  <Input id={`${c.id}-proposer`} className="min-h-11" placeholder="e.g. W Bro. A Brother" value={c.proposer} onChange={(e) => updateCandidate(c.id, { proposer: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`${c.id}-seconder`}>Seconder</Label>
                  <Input id={`${c.id}-seconder`} className="min-h-11" placeholder="e.g. W Bro. B Brother" value={c.seconder} onChange={(e) => updateCandidate(c.id, { seconder: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`${c.id}-date-proposed`}>Date proposed</Label>
                  <Input id={`${c.id}-date-proposed`} type="date" className="min-h-11" value={c.date_proposed} onChange={(e) => updateCandidate(c.id, { date_proposed: e.target.value })} />
                  <p className="text-xs text-primary-foreground/80 mt-1">The meeting at which the candidate was proposed.</p>
                </div>
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
            <Textarea aria-label="Menu" rows={3} value={summons.dining_menu ?? ""} onChange={(e) => setSummons({ ...summons, dining_menu: e.target.value || null })} />
          </div>
          <div className="space-y-2">
            <div>
              <Label>Price</Label>
              <Input aria-label="Price" value={summons.dining_price ?? ""} onChange={(e) => setSummons({ ...summons, dining_price: e.target.value || null })} />
            </div>
            <div>
              <Label>Booking deadline</Label>
              <Input aria-label="Booking deadline" type="date" value={summons.dining_deadline ?? ""} onChange={(e) => setSummons({ ...summons, dining_deadline: e.target.value || null })} />
            </div>
            <div>
              <Label>Dining enquiry contact</Label>
              <Input aria-label="Dining enquiry contact" placeholder="Name" value={summons.dining_enquiry_name ?? ""} onChange={(e) => setSummons({ ...summons, dining_enquiry_name: e.target.value || null })} />
            </div>
            <Input aria-label="Dining enquiry contact" placeholder="Email" value={summons.dining_enquiry_email ?? ""} onChange={(e) => setSummons({ ...summons, dining_enquiry_email: e.target.value || null })} />
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
            <div className="flex flex-col sm:flex-row gap-6 text-xs">
              <div className="flex-1 space-y-1">{left.map(cell)}</div>
              <div className="flex-1 space-y-1">{right.map(cell)}</div>
            </div>
          );
        })()}
      </Section>

      {attachable.length > 0 && (
        <div className="rounded border border-gold/40 bg-gold/10 p-3 space-y-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={attachOn} onCheckedChange={(v) => setAttachOn(v === true)} aria-label="Attach approved annual accounts" />
            <span className="text-primary-foreground">
              {attachable.length === 1 ? accountsOptionLabel(attachable[0]) : "Attach approved annual accounts"}
            </span>
          </label>
          {attachable.length > 1 && (
            <Select value={attachId} onValueChange={setAttachId}>
              <SelectTrigger aria-label="Choose which year" className="max-w-md"><SelectValue placeholder="Choose which year" /></SelectTrigger>
              <SelectContent>
                {attachable.map((a) => <SelectItem key={a.approval_id} value={a.approval_id}>{accountsOptionLabel(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-primary-foreground/80">
            Sent as a second download link in the summons email, separate from the summons itself. Test emails include it too, but only a real send records the accounts as sent.
            {alreadySent && " This summons has already been sent, so the accounts link will appear on test emails only."}
          </p>
        </div>
      )}

      <OmittedPostsNote officers={officers} reps={template.lodge_representatives} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => generatePdf("download")} disabled={busy}><Download className="w-4 h-4 mr-2" /> Download PDF</Button>
        <Button variant="outline" className="text-navy" onClick={() => generatePdf("save")} disabled={busy}><Save className="w-4 h-4 mr-2" /> Save to history</Button>
        <Button variant="outline" className="text-navy" onClick={emailTest} disabled={busy}><Mail className="w-4 h-4 mr-2" /> Send test email…</Button>
        <Button onClick={emailAll} disabled={busy} className="bg-gold text-navy hover:bg-gold/90"><Mail className="w-4 h-4 mr-2" /> Email to all members</Button>
        <Button
          onClick={() => setVisitorDialogOpen(true)}
          disabled={busy}
          className="bg-gold text-navy hover:bg-gold/90"
        >
          <Mail className="w-4 h-4 mr-2" /> Email to Visitors…
        </Button>
      </div>

      <VisitorEmailDialog
        open={visitorDialogOpen}
        onOpenChange={setVisitorDialogOpen}
        summons={summons}
        template={template}
        generatePdf={generatePdf}
        resolveOfficerDisplayName={resolveOfficerDisplayName}
      />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-navy-light/40 border border-gold/20 rounded p-4">
      <h2 className="font-serif text-lg text-gold">{title}</h2>
      {subtitle && <p className="text-xs text-primary-foreground/80 mb-2">{subtitle}</p>}
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
        {rows.length === 0 ? <p className="text-sm text-primary-foreground/80">No summonses saved yet.</p> : (
        <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          <table className="w-full text-sm">
            <thead className="text-xs text-primary-foreground/80">
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
        </div>
      )}
    </div>
  );
}



// ===================== Visitor Email Dialog =====================
type VisitorRow = {
  id: string;
  email: string;
  name: string | null;
  lodge_name: string | null;
  lodge_number: string | null;
  last_seen_at: string;
  /** Latest Booked/Attended meeting date, or null if he has never really visited. */
  real_last_seen: string | null;
};

function VisitorEmailDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summons: SummonsData;
  template: LodgeTemplate;
  generatePdf: (action: "download" | "save" | "email") => Promise<string | null>;
  resolveOfficerDisplayName: (positionKey: string) => Promise<string>;
}) {
  const { open, onOpenChange, summons, template, generatePdf, resolveOfficerDisplayName } = props;
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [salutations, setSalutations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // Per-recipient failure state (keyed by lowercased email) — populated after a send
  // returns failures. When the failure looks like an idempotency clash, we show a
  // "Resend anyway" button that re-sends just that recipient with force=true so the
  // Edge Function appends a unique suffix to the idempotency key.
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("visitor_contacts")
        .select("id,email,name,lodge_name,lodge_number,last_seen_at,opted_out_at")
        .is("opted_out_at", null)
        .order("last_seen_at", { ascending: false });
      if (error) { toast.error(error.message); setLoading(false); return; }
      // Only a Booked/Attended visit counts — apologies or a contact simply being
      // on file must never make a visitor look "recently seen".
      const { data: va } = await (supabase.from as any)("visitor_attendances").select(
        "visitor_contact_id, festive_board_attendance(attendance_status, festive_board_meetings(meeting_date))"
      );
      const { lastSeen } = countVisitorVisits((va ?? []) as VisitorAttendanceRow[], "9999-12-31");
      const list = ((data ?? []) as Omit<VisitorRow, "real_last_seen">[]).map((r) => ({
        ...r,
        real_last_seen: lastSeen[r.id] ?? null,
      })) as VisitorRow[];
      setRows(list);
      const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
      const sel: Record<string, boolean> = {};
      const sal: Record<string, string> = {};
      for (const r of list) {
        sel[r.id] = isRecentVisitor(r.real_last_seen, twoYearsAgo);
        sal[r.id] = parseSalutation(r.name);
      }
      setSelected(sel);
      setSalutations(sal);
      setLoading(false);
    })();
  }, [open]);

  const pickedCount = Object.values(selected).filter(Boolean).length;

  // Build the shared request payload (meeting/ics/pdf) once per send button click.
  // Returns null on validation failure (already toasts).
  const buildPayloadBase = async () => {
    if (!summons.meeting_date) { toast.error("Set the meeting date first"); return null; }
    const secretaryName = (await resolveOfficerDisplayName("secretary")) || "The Secretary";
    const meetingDate = summons.meeting_date!;
    const dateProbe = new Date(`${meetingDate}T00:00:00`);
    if (Number.isNaN(dateProbe.getTime())) {
      toast.error("Meeting date is invalid — please re-select it and save the summons");
      return null;
    }
    const meetingDateLabel = dateProbe.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const rawTime = (summons.meeting_time || "").toString();
    const parsed24 = rawTime.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    const parsed12 = rawTime.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);
    let hh = 18, mm = 15;
    if (parsed24) { hh = parseInt(parsed24[1], 10); mm = parseInt(parsed24[2], 10); }
    else if (parsed12) {
      hh = parseInt(parsed12[1], 10) % 12;
      if (/pm/i.test(parsed12[3])) hh += 12;
      mm = parsed12[2] ? parseInt(parsed12[2], 10) : 0;
    }
    const startDate = new Date(`${meetingDate}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
    if (Number.isNaN(startDate.getTime())) {
      toast.error("Could not build a valid event time — please check meeting date/time");
      return null;
    }
    const startIso = startDate.toISOString();
    const endIso = new Date(startDate.getTime() + 3 * 60 * 60 * 1000).toISOString();
    const venue = template.venue_address || "Masonic Centre, Guildford";
    const title = `${lodgeTitle({ lodgeName: template.lodge_name ?? "", lodgeNumber: template.lodge_number ?? "" }) || "Lodge"} — ${summons.meeting_type || "Meeting"} — ${meetingDateLabel}`;
    const ident = await loadDocIdentity();
    const ics = generateICS({
      title, location: venue, startTime: startIso, endTime: endIso,
      description: "Summons for the meeting is attached.",
    }, ident);
    const ics_filename = icsFilename(title, ident.lodgeName);
    const id = await generatePdf("email");
    if (!id) return null;
    return {
      summons_id: id,
      meeting_date_label: meetingDateLabel,
      meeting_time_label: summons.meeting_time || null,
      meeting_type_label: summons.meeting_type || null,
      venue,
      secretary_display_name: secretaryName,
      ics,
      ics_filename,
      event_start_iso: startIso,
      event_end_iso: endIso,
    };
  };

  // Detect Resend's duplicate-idempotency error so we surface a "Resend anyway"
  // action rather than a generic delivery failure.
  const isIdempotencyClash = (msg: string) =>
    /idempotency/i.test(msg) && /(match|conflict|dup|exist)/i.test(msg);

  const send = async () => {
    if (pickedCount === 0) { toast.error("Select at least one visitor"); return; }
    if (!window.confirm(`Send Summons #${summons.meeting_number} to ${pickedCount} visitor${pickedCount === 1 ? "" : "s"}?`)) return;
    setSending(true);
    setFailures({});
    try {
      const base = await buildPayloadBase();
      if (!base) { setSending(false); return; }
      const recipients = rows
        .filter((r) => selected[r.id])
        .map((r) => ({
          email: r.email,
          salutation: (salutations[r.id] || parseSalutation(r.name)).trim(),
          visitor_contact_id: r.id,
        }));
      const { data, error } = await supabase.functions.invoke("send-summons-to-visitors", {
        body: { ...base, recipients },
      });
      if (error) throw error;
      const d = data as any;
      toast.success(`Sent to ${d?.sent ?? 0} of ${d?.recipients ?? 0} visitor(s)`);
      const fails: { email: string; error: string }[] = d?.failures ?? [];
      if (fails.length) {
        const map: Record<string, string> = {};
        for (const f of fails) map[(f.email || "").toLowerCase()] = f.error || "failed";
        setFailures(map);
        toast.error(`${fails.length} delivery(ies) failed — review below`);
      } else {
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const resendOne = async (row: VisitorRow) => {
    setResendingEmail(row.email.toLowerCase());
    try {
      const base = await buildPayloadBase();
      if (!base) return;
      const { data, error } = await supabase.functions.invoke("send-summons-to-visitors", {
        body: {
          ...base,
          recipients: [{
            email: row.email,
            salutation: (salutations[row.id] || parseSalutation(row.name)).trim(),
            visitor_contact_id: row.id,
            force: true,
          }],
        },
      });
      if (error) throw error;
      const d = data as any;
      const fails: { email: string; error: string }[] = d?.failures ?? [];
      if ((d?.sent ?? 0) > 0) {
        toast.success(`Resent to ${row.email}`);
        setFailures((prev) => {
          const next = { ...prev };
          delete next[row.email.toLowerCase()];
          return next;
        });
      } else {
        toast.error(fails[0]?.error || "Resend failed");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Resend failed");
    } finally {
      setResendingEmail(null);
    }
  };

  const lastSeenLabel = (r: VisitorRow) => {
    const stale = !!r.real_last_seen && Date.now() - new Date(r.real_last_seen).getTime() > 2 * 365 * 24 * 60 * 60 * 1000;
    return (
      <>
        {r.real_last_seen
          ? new Date(r.real_last_seen).toLocaleDateString("en-GB")
          : <span className="text-primary-foreground/80">Not yet attended</span>}
        {stale && <span className="ml-1 text-primary-foreground/80">(&gt;2y)</span>}
      </>
    );
  };

  const salutationEditor = (r: VisitorRow) => (
    <>
      <Input
        value={salutations[r.id] ?? ""}
        onChange={(e) => setSalutations((s) => ({ ...s, [r.id]: e.target.value }))}
        className="h-8 min-w-[140px] w-full"
        placeholder="e.g. W Bro Smith"
      />
      <div className="text-[11px] text-primary-foreground/80 mt-0.5">
        Preview: <em>Dear {(salutations[r.id] || "Brother").trim()},</em>
      </div>
      {failures[r.email.toLowerCase()] && (
        <div className="mt-1 flex items-start gap-2 rounded border border-red-400/40 bg-red-500/10 p-1.5">
          <div className="text-[11px] text-red-200 flex-1 break-words">
            {failures[r.email.toLowerCase()]}
          </div>
          {isIdempotencyClash(failures[r.email.toLowerCase()]) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px] text-navy"
              onClick={() => resendOne(r)}
              disabled={resendingEmail === r.email.toLowerCase()}
            >
              {resendingEmail === r.email.toLowerCase() ? "Resending…" : "Resend anyway"}
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-navy text-primary-foreground border-gold/30 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold">Email Summons to Visitors</DialogTitle>
          <DialogDescription className="text-primary-foreground/70">
            Visitors seen in the last 2 years are pre-selected. Untick anyone you'd like to skip, and
            edit the salutation if the auto-parse is unusual.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto overflow-x-auto border border-gold/20 rounded">
          {loading ? (
            <p className="p-4 text-sm text-primary-foreground/70">Loading visitors…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-primary-foreground/70">No visitor contacts on file.</p>
          ) : (
            <>
              {/* Phone width: stacked cards so every control stays reachable without sideways scrolling */}
              <div className="sm:hidden divide-y divide-gold/10">
                {rows.map((r) => (
                  <div key={r.id} className="p-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        className="mt-1"
                        aria-label={`Select ${r.name || r.email || "visitor"}`}
                    checked={!!selected[r.id]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: !!v }))}
                      />
                      <div className="min-w-0">
                        <div className="break-words">{r.name || <span className="italic text-primary-foreground/80">no name</span>}</div>
                        <div className="text-xs text-primary-foreground/80 break-all">{r.email}</div>
                        <div className="text-xs text-primary-foreground/80 break-words">
                          {[r.lodge_name, r.lodge_number].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <div className="text-xs">{lastSeenLabel(r)}</div>
                      </div>
                    </div>
                    {salutationEditor(r)}
                  </div>
                ))}
              </div>
              <table className="hidden sm:table w-full text-sm">
                <thead className="text-xs text-primary-foreground/80 bg-navy-light/40 sticky top-0">
                  <tr>
                    <th className="text-left p-2 w-8"></th>
                    <th className="text-left p-2">Visitor</th>
                    <th className="text-left p-2">Lodge</th>
                    <th className="text-left p-2">Last seen</th>
                    <th className="text-left p-2">Salutation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-gold/10">
                      <td className="p-2 align-top">
                        <Checkbox
                          aria-label={`Select ${r.name || r.email || "visitor"}`}
                    checked={!!selected[r.id]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: !!v }))}
                        />
                      </td>
                      <td className="p-2 align-top">
                        <div>{r.name || <span className="italic text-primary-foreground/80">no name</span>}</div>
                        <div className="text-xs text-primary-foreground/80">{r.email}</div>
                      </td>
                      <td className="p-2 align-top">
                        {[r.lodge_name, r.lodge_number].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="p-2 align-top text-xs">{lastSeenLabel(r)}</td>
                      <td className="p-2 align-top">{salutationEditor(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between w-full">
          <span className="text-xs text-primary-foreground/70 mr-auto">
            {pickedCount} of {rows.length} selected
          </span>
          <Button variant="outline" className="text-navy" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || pickedCount === 0} className="bg-gold text-navy hover:bg-gold/90">
            <Mail className="w-4 h-4 mr-2" />
            {sending ? "Sending…" : `Send to ${pickedCount} visitor${pickedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
