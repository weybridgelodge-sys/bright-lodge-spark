// Browser print preview for the lodge summons.
// Mirrors the four-panel A4-landscape imposition produced by summonsPdf.tsx:
//   Sheet 1 (outside fold):  [ Back cover · Members | Front cover · Invitation ]
//   Sheet 2 (inside fold):   [ Officers + Notices    | Agenda + Next meeting + Dining ]
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import {
  formatDateLong,
  formatDateShort,
  formatMemberShort,
  rankTitle,
  memberSymbols,
  MemberRow,
  sortMembersBySeniority,
  splitTwoColumns,
  subLetter,
} from "@/lib/summons";
import {
  LodgeTemplate,
  OfficerRollRow,
  SummonsData,
  DEFAULT_LOGO_URL,
  DEFAULT_COVER_LEFT_URL,
  DEFAULT_COVER_RIGHT_URL,
} from "@/lib/summonsPdf";

type Props = {
  template: LodgeTemplate;
  officers: OfficerRollRow[];
  members: MemberRow[];
};

type SummonsRow = SummonsData & { id: string };

export default function SummonsPrintPreview({ template, officers, members }: Props) {
  const [list, setList] = useState<SummonsRow[]>([]);
  const [pickedId, setPickedId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("summonses")
        .select("*")
        .order("meeting_number", { ascending: false })
        .limit(20);
      const rows = (data ?? []) as any[];
      setList(rows.map(rowToSummons));
      if (rows.length) setPickedId(rows[0].id);
    })();
  }, []);

  const current = useMemo(
    () => list.find((s) => s.id === pickedId) ?? null,
    [list, pickedId],
  );

  const subscribingMembers = useMemo(
    () => sortMembersBySeniority(members.filter((m) => !m.is_honorary_member)),
    [members],
  );

  return (
    <div className="space-y-4">
      <div className="bg-navy-light/40 border border-gold/20 rounded p-4 no-print flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs text-primary-foreground/70 block mb-1">Pick a saved summons</label>
          <Select value={pickedId} onValueChange={setPickedId}>
            <SelectTrigger><SelectValue placeholder="Pick a summons…" /></SelectTrigger>
            <SelectContent>
              {list.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  #{s.meeting_number} — {formatDateShort(s.meeting_date)} ({s.meeting_type || "Regular"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => window.print()}
          disabled={!current}
          className="bg-gold text-navy hover:bg-gold/90"
        >
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>

      {!current ? (
        <p className="text-sm text-primary-foreground/60 no-print">
          Save a summons from the New Summons tab to print-preview it here.
        </p>
      ) : (
        <div className="summons-print-root bg-white text-black mx-auto shadow-xl">
          <SheetOutside template={template} summons={current} members={subscribingMembers} officers={officers} />
          <SheetInside template={template} summons={current} officers={officers} />
        </div>
      )}

      <PrintStyles />
    </div>
  );
}

// ---------- helpers ----------

function rowToSummons(r: any): SummonsRow {
  return {
    id: r.id,
    meeting_number: r.meeting_number,
    meeting_date: r.meeting_date,
    meeting_time: r.meeting_time,
    meeting_type: r.meeting_type,
    dress_code: r.dress_code,
    minutes_confirmation_date: r.minutes_confirmation_date,
    next_meeting_date: r.next_meeting_date,
    officer_night_date: r.officer_night_date,
    agenda: r.agenda ?? [],
    candidates: r.candidates ?? [],
    dining_enquiry_name: r.dining_enquiry_name,
    dining_enquiry_email: r.dining_enquiry_email,
    dining_menu: r.dining_menu ?? null,
    dining_price: r.dining_price ?? null,
    dining_deadline: r.dining_deadline ?? null,
  };
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function officerSeason(): string {
  const now = new Date();
  const y = now.getMonth() + 1 >= 10 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${(y + 1).toString().slice(-2)}`;
}

function shortRole(label: string): string {
  const map: Record<string, string> = {
    "Worshipful Master": "WM",
    "Immediate Past Master": "IPM",
    "Senior Warden": "SW",
    "Junior Warden": "JW",
    "Senior Deacon": "SD",
    "Junior Deacon": "JD",
    "Inner Guard": "IG",
    "Director of Ceremonies": "DC",
    "Assistant Director of Ceremonies": "ADC",
    "Charity Steward": "Ch. Steward",
    "Membership Officer": "LMO",
    "Assistant Secretary": "Asst. Secretary",
    "Assistant Tyler": "Asst. Tyler",
  };
  return map[label] || label;
}

function OfficerNameInline({ o }: { o: OfficerRollRow }) {
  const parts = [
    { text: o.post_nominals?.trim(), bold: true },
    { text: o.grand_rank?.trim(), bold: true },
    { text: o.provincial_rank?.trim(), bold: false },
    { text: o.rank?.trim(), bold: false },
  ].filter((p) => p.text) as { text: string; bold: boolean }[];
  if (!parts.length) return <span>{o.member}</span>;
  const first = parts[0].text;
  const idx = o.member.indexOf(` ${first}`);
  if (idx === -1) return <span>{o.member}</span>;
  const base = o.member.slice(0, idx);
  return (
    <span>
      {base}
      {parts.map((p, i) => (
        <span key={i} className={p.bold ? "font-bold" : ""}> {p.text}</span>
      ))}
    </span>
  );
}

// ---------- Sheet 1 (outside): back cover (members) | front cover (invitation) ----------

function SheetOutside({
  template,
  summons,
  members,
  officers,
}: {
  template: LodgeTemplate;
  summons: SummonsData;
  members: MemberRow[];
  officers: OfficerRollRow[];
}) {
  const { left, right } = splitTwoColumns(members);
  return (
    <section className="summons-sheet">
      <BackCoverPanel template={template} left={left} right={right} />
      <FrontCoverPanel template={template} summons={summons} officers={officers} />
    </section>
  );
}

function BackCoverPanel({
  template,
  left,
  right,
}: {
  template: LodgeTemplate;
  left: MemberRow[];
  right: MemberRow[];
}) {
  return (
    <div className="summons-panel border-r border-dashed border-slate-200">
      <h2 className="text-center text-[11px] font-bold tracking-widest uppercase text-[#1B2A4A] mb-2">
        List of Members
      </h2>
      <div className="grid grid-cols-2 gap-3 text-[8.5px] leading-tight">
        <div className="space-y-[2px]">{left.map((m) => <MemberLine key={m.id} m={m} />)}</div>
        <div className="space-y-[2px]">{right.map((m) => <MemberLine key={m.id} m={m} />)}</div>
      </div>
      <p className="text-[8px] text-slate-600 mt-2">
        + Past Master of the Lodge &nbsp; # Past Master in the Lodge &nbsp; † HRA Chapter
      </p>

      {template.honorary_members && (
        <p className="text-[8.5px] mt-2">
          <strong>HONORARY MEMBER:</strong> {template.honorary_members}
        </p>
      )}

      <hr className="border-t border-[#C9A432] my-2" />

      {template.regular_meeting_pattern && (
        <Notice label="Regular Meetings">{template.regular_meeting_pattern}</Notice>
      )}
      {template.loi_details && (
        <Notice label="Lodge of Instruction">
          {template.loi_details}
          {template.progression_notice_text ? ` ${template.progression_notice_text}` : ""}
        </Notice>
      )}
      {(template.royal_arch_rep || template.mcf_contact || template.provincial_website) && (
        <p className="text-[8px] mt-2 leading-snug">
          {template.royal_arch_rep && (<><strong>Royal Arch Representative: </strong>{template.royal_arch_rep}</>)}
          {template.royal_arch_rep && (template.mcf_contact || template.provincial_website) ? "  |  " : ""}
          {template.mcf_contact && (<><strong>MCF: </strong>{template.mcf_contact}</>)}
          {template.mcf_contact && template.provincial_website ? "  |  " : ""}
          {template.provincial_website && (<><strong>Province: </strong>{template.provincial_website}</>)}
        </p>
      )}
    </div>
  );
}

function FrontCoverPanel({
  template,
  summons,
  officers,
}: {
  template: LodgeTemplate;
  summons: SummonsData;
  officers: OfficerRollRow[];
}) {
  const wmOfficer = officers.find((o) => o.label === "Worshipful Master");
  const wmName = wmOfficer?.member_formal || wmOfficer?.member || null;
  const secOfficer = officers.find((o) => o.label === "Secretary");
  const secName = secOfficer?.member_formal || secOfficer?.member || null;
  const rawSecLines = (template.secretary_contact || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const looksLikeName = (l: string) => !!l && !/\d/.test(l) && !l.includes(",") && l.split(/\s+/).length <= 4;
  const secAddressLines = rawSecLines.length && looksLikeName(rawSecLines[0]) ? rawSecLines.slice(1) : rawSecLines;
  const logoSrc = template.logo_url || DEFAULT_LOGO_URL;
  const leftSrc = template.cover_left_image_url || DEFAULT_COVER_LEFT_URL;
  const rightSrc = template.cover_right_image_url || DEFAULT_COVER_RIGHT_URL;

  return (
    <div className="summons-panel">
      <h1 className="text-center text-[22px] leading-tight font-serif font-bold text-[#1B2A4A]">
        {template.lodge_name} No. {template.lodge_number}
      </h1>
      <p className="text-center text-[11px] font-bold tracking-widest text-[#1B2A4A] mt-1">
        PROVINCE OF {(template.province || "").toUpperCase()}
      </p>
      <hr className="border-t border-[#C9A432] my-2" />

      <div className="flex items-center mt-2 mb-1">
        <div className="flex-1 flex justify-start">
          {leftSrc && <img src={leftSrc} alt="" style={{ height: 75 }} />}
        </div>
        <div className="flex-1 flex justify-center">
          {logoSrc && <img src={logoSrc} alt="Lodge crest" style={{ width: 130, height: 130, objectFit: "contain" }} />}
        </div>
        <div className="flex-1 flex justify-end">
          {rightSrc && <img src={rightSrc} alt="" style={{ height: 75 }} />}
        </div>
      </div>

      {wmName && (
        <p className="text-center text-[11px] font-bold tracking-widest text-[#1B2A4A] mt-1">
          {wmName} – Worshipful Master
        </p>
      )}

      <div className="mt-3 text-[9px] leading-snug">
        <p>{(secName || rawSecLines[0] || "—") + " (Secretary)"}</p>
        {secOfficer?.email && <p>Email: {secOfficer.email}</p>}
        {secOfficer?.phone && <p>Mobile: {secOfficer.phone}</p>}
        {secAddressLines.map((line, i) => <p key={i}>{line}</p>)}
      </div>

      <div className="mt-3 text-center text-[11px] leading-snug space-y-1">
        <p>Dear Sir and Brother,</p>
        <p>
          You are requested to attend the{" "}
          <strong>
            {ordinal(summons.meeting_number)} {summons.meeting_type || "Regular"} Meeting
          </strong>{" "}
          of the Lodge on
        </p>
        <p className="text-[12px] font-bold mt-1">
          {formatDateLong(summons.meeting_date)}
          {summons.meeting_time ? ` commencing ${summons.meeting_time}` : ""}
        </p>
        {template.venue_address && (
          <p>at {template.venue_address}</p>
        )}
        <p className="mt-2">By command of the Worshipful Master.</p>
        <p>Yours sincerely and fraternally,</p>
        <p className="font-bold">{secName ? `${secName} (Secretary)` : (rawSecLines[0] || "Secretary")}</p>
      </div>

      {summons.dress_code && (
        <div className="mt-3 pt-2 border-t border-[#C9A432] text-center text-[9px]">
          <p className="font-bold">Dress Code</p>
          <p>{summons.dress_code}</p>
        </div>
      )}
    </div>
  );
}

// ---------- Sheet 2 (inside): Officers + Notices | Agenda + Next meeting + Dining ----------

function SheetInside({
  template,
  summons,
  officers,
}: {
  template: LodgeTemplate;
  summons: SummonsData;
  officers: OfficerRollRow[];
}) {
  return (
    <section className="summons-sheet">
      <OfficersNoticesPanel template={template} officers={officers} />
      <AgendaPanel template={template} summons={summons} />
    </section>
  );
}

function OfficersNoticesPanel({ template, officers }: { template: LodgeTemplate; officers: OfficerRollRow[] }) {
  const filled = officers.filter((o) => o.member);
  return (
    <div className="summons-panel border-r border-dashed border-slate-200">
      <h2 className="text-center text-[11px] font-bold tracking-widest uppercase text-[#1B2A4A] mb-2">
        Officers {officerSeason()}
      </h2>
      <ul className="text-[9px] space-y-[1.5px]">
        {filled.map((o, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="flex-1 pr-1"><OfficerNameInline o={o} /></span>
            <span className="font-bold text-right w-[82px]">{shortRole(o.label)}</span>
          </li>
        ))}
      </ul>

      {template.lodge_representatives?.length > 0 && (
        <>
          <hr className="border-t border-[#C9A432] my-2" />
          <div className="text-[9px] space-y-[1.5px]">
            {template.lodge_representatives.map((r, i) => {
              const cleaned = (r.role ?? "").replace(/^\s*lodge\s+representative\s+to\s+/i, "").trim();
              return <p key={i}>{r.name} — Lodge representative to {cleaned}</p>;
            })}
          </div>
          <hr className="border-t border-[#C9A432] my-2" />
        </>
      )}

      {template.data_protection_text && (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mt-2 mb-1">Data Protection Act</h3>
          <p className="text-[8.5px] leading-snug">{template.data_protection_text}</p>
        </>
      )}
      {template.overseas_attendance_text && (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mt-2 mb-1">Attendance at Lodges Overseas</h3>
          <p className="text-[8.5px] leading-snug">{template.overseas_attendance_text}</p>
        </>
      )}
    </div>
  );
}

function AgendaPanel({ template, summons }: { template: LodgeTemplate; summons: SummonsData }) {
  return (
    <div className="summons-panel">
      <h2 className="text-center text-[11px] font-bold tracking-widest uppercase text-[#1B2A4A] mb-2">
        Agenda
      </h2>
      {summons.agenda.length === 0 ? (
        <p className="text-[9px]">No agenda items.</p>
      ) : (
        <ol className="text-[10px] space-y-1">
          {summons.agenda.map((a, i) => (
            <li key={a.id}>
              <div className="flex gap-2">
                <span className="font-bold w-5">{i + 1}.</span>
                <span className="flex-1">{a.label}</span>
              </div>
              {a.children && a.children.length > 0 && (
                <ol className="pl-6 mt-0.5 space-y-0.5">
                  {a.children.map((c, ci) => (
                    <li key={c.id} className="flex gap-2">
                      <span className="font-bold w-4">{subLetter(ci)}.</span>
                      <span className="flex-1">{c.label}</span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}

      {summons.candidates.length > 0 && (
        <div className="mt-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mb-1">
            Candidate Details
          </h3>
          {summons.candidates.map((c) => (
            <p key={c.id} className="text-[9px] mb-1">
              <strong>{c.ceremony_type}: {c.name}</strong>
              {c.dob ? `, D.O.B ${formatDateShort(c.dob)}` : ""}
              {c.occupation ? `, ${c.occupation}` : ""}
              {c.address ? `, of ${c.address}` : ""}
              {(c.proposer || c.seconder)
                ? `. Proposed by ${c.proposer || "—"} and seconded by ${c.seconder || "—"}${c.date_proposed ? ` on ${formatDateShort(c.date_proposed)}` : ""}.`
                : "."}
            </p>
          ))}
        </div>
      )}

      {(summons.next_meeting_date || summons.officer_night_date) && (
        <hr className="border-t border-[#C9A432] my-2" />
      )}
      {summons.next_meeting_date && (
        <p className="text-[9px] text-center">
          The date of the next regular meeting is{" "}
          <strong>{formatDateLong(summons.next_meeting_date)}</strong>.
        </p>
      )}
      {summons.officer_night_date && (
        <p className="text-[9px] font-bold underline text-center mt-1">
          Officer Night will be held on {formatDateLong(summons.officer_night_date)}.
        </p>
      )}

      <hr className="border-t border-[#C9A432] my-2" />
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mb-1">
        Dining Arrangements
      </h3>
      <div className="text-[9px] space-y-1">
        {summons.dining_price && <p className="font-bold">{summons.dining_price}</p>}
        {summons.dining_menu && <p>{summons.dining_menu}</p>}
        {template.dining_booking_url && (
          <p className="font-bold">Please book online at: {template.dining_booking_url}</p>
        )}
        {summons.dining_deadline && (
          <p>All bookings by <strong>{formatDateLong(summons.dining_deadline)}</strong> or you will not be fed.</p>
        )}
        {(summons.dining_enquiry_name || summons.dining_enquiry_email) && (
          <p>
            Dining enquiries: {summons.dining_enquiry_name}
            {summons.dining_enquiry_email ? ` — ${summons.dining_enquiry_email}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function MemberLine({ m }: { m: MemberRow }) {
  const date = formatDateShort(m.initiation_date || m.joined_lodge_date);
  const tag = m.initiation_date ? "(I)" : m.joined_lodge_date ? "(J)" : "";
  const sym = memberSymbols(m);
  const mark = `${sym.pastMaster ? "+" : ""}${sym.royalArch ? "†" : ""}`;
  const nameLine = `${rankTitle(m)} ${formatMemberShort(m)}`;
  const postParts = [
    { text: m.post_nominals?.trim(), bold: true },
    { text: m.grand_rank?.trim(), bold: true },
    { text: m.provincial_rank?.trim(), bold: false },
    { text: m.rank?.trim(), bold: false },
  ].filter((p) => p.text) as { text: string; bold: boolean }[];
  return (
    <div>
      <div className="flex gap-1">
        <span className="w-[60px] shrink-0">{date} {tag}</span>
        <span className="w-[16px] text-center shrink-0">{mark}</span>
        <span className="flex-1">{nameLine}</span>
      </div>
      {postParts.length > 0 && (
        <div className="pl-[80px] text-[8px] leading-tight">
          {postParts.map((p, i) => (
            <span key={i} className={p.bold ? "font-bold" : ""}>{i > 0 ? " " : ""}{p.text}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Notice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#1B2A4A]">{label}</p>
      <p className="text-[8.5px] leading-snug">{children}</p>
    </div>
  );
}

// ---------- Print CSS ----------

function PrintStyles() {
  return (
    <style>{`
      .summons-print-root {
        width: 297mm;
        max-width: 100%;
      }
      .summons-sheet {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 297mm;
        min-height: 210mm;
        padding: 0;
        background: #ffffff;
        page-break-after: always;
      }
      .summons-panel {
        padding: 10mm 8mm;
        overflow: hidden;
      }

      @media print {
        @page { size: A4 landscape; margin: 0; }
        body, html { background: #ffffff !important; }
        .no-print, header, nav, footer, button { display: none !important; }

        .summons-print-root {
          box-shadow: none !important;
          width: 297mm !important;
        }
        .summons-sheet {
          box-shadow: none !important;
          border: none !important;
          break-after: page;
          page-break-after: always;
        }
        .summons-panel {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `}</style>
  );
}
