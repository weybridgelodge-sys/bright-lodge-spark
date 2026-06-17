// Browser print preview for the lodge summons.
// Renders the same data the PDF uses, but as in-page A4 landscape sheets
// styled for the browser's native print dialog (window.print()).
//
// Designed to be embedded inside SummonsBuilder as a "Print Preview" tab.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import {
  formatDateLong,
  formatDateShort,
  formatMemberLine,
  MemberRow,
  sortMembersBySeniority,
  splitTwoColumns,
} from "@/lib/summons";
import { LodgeTemplate, OfficerRollRow, SummonsData } from "@/lib/summonsPdf";

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

  const sortedMembers = useMemo(() => sortMembersBySeniority(members), [members]);

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
          <Sheet1 template={template} summons={current} members={sortedMembers} />
          <Sheet2 template={template} summons={current} officers={officers} />
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

// ---------- Sheet 1: members panel | invitation panel ----------

function Sheet1({
  template,
  summons,
  members,
}: {
  template: LodgeTemplate;
  summons: SummonsData;
  members: MemberRow[];
}) {
  const { left, right } = splitTwoColumns(members);

  return (
    <section className="summons-sheet">
      {/* LEFT PANEL: Members list & lodge notices */}
      <div className="summons-panel border-r border-dashed border-slate-200">
        <h2 className="text-center text-sm font-bold tracking-widest uppercase text-[#1B2A4A] mb-2">
          List of Members
        </h2>
        <div className="grid grid-cols-2 gap-3 text-[8.5px] leading-tight">
          <div className="space-y-[2px]">{left.map((m) => <MemberLine key={m.id} m={m} />)}</div>
          <div className="space-y-[2px]">{right.map((m) => <MemberLine key={m.id} m={m} />)}</div>
        </div>
        <p className="text-[7px] text-slate-600 mt-2">
          + Past Master of the Lodge &nbsp; # Past Master in the Lodge &nbsp; ✠ HRA Chapter
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
          <Notice label="Lodge of Instruction">{template.loi_details}</Notice>
        )}
        {template.data_protection_text && (
          <Notice label="Data Protection Act" small>{template.data_protection_text}</Notice>
        )}
        {template.overseas_attendance_text && (
          <Notice label="Attendance at Lodges Overseas" small>{template.overseas_attendance_text}</Notice>
        )}
        {template.progression_notice_text && (
          <p className="text-[8px] font-bold mt-2">{template.progression_notice_text}</p>
        )}
        {template.royal_arch_rep && (
          <p className="text-[8.5px] mt-2"><strong>Royal Arch Rep: </strong>{template.royal_arch_rep}</p>
        )}
        {template.mcf_contact && (
          <p className="text-[8.5px]"><strong>MCF: </strong>{template.mcf_contact}</p>
        )}
        {template.provincial_website && (
          <p className="text-[8.5px] font-bold">Provincial website: {template.provincial_website}</p>
        )}
      </div>

      {/* RIGHT PANEL: Invitation letter */}
      <div className="summons-panel">
        <div className="space-y-6 text-[10px] leading-relaxed">
          <div className="text-center space-y-1">
            {template.logo_url && (
              <img
                src={template.logo_url}
                alt="Lodge crest"
                className="mx-auto mb-1"
                style={{ width: 80, height: 80, objectFit: "contain" }}
              />
            )}
            <h1 className="text-2xl font-bold uppercase tracking-widest border-b border-black pb-2 text-[#1B2A4A]">
              {template.lodge_name}
            </h1>
            <p className="text-xs uppercase font-semibold tracking-wider">No. {template.lodge_number}</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-600">
              Province of {template.province}
            </p>
          </div>

          <div className="grid grid-cols-2 text-center font-semibold border-b border-slate-200 pb-3">
            <div>
              <p className="text-slate-500 uppercase text-[9px] tracking-wider mb-0.5">Worshipful Master</p>
              <p className="text-[11px] font-bold whitespace-pre-line">
                {officers.find((o) => o.label === "Worshipful Master")?.member
                  || template.wm_contact?.split("\n")[0]
                  || "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 uppercase text-[9px] tracking-wider mb-0.5">Secretary</p>
              <p className="text-[11px] font-bold whitespace-pre-line">
                {officers.find((o) => o.label === "Secretary")?.member
                  || template.secretary_contact?.split("\n")[0]
                  || "—"}
              </p>
            </div>
          </div>


          <div className="space-y-3">
            <p className="font-bold">Dear Sir and Brother,</p>

            <p>
              You are requested to attend the{" "}
              <strong className="underline">
                {ordinal(summons.meeting_number)} {summons.meeting_type || "Regular"} Meeting
              </strong>{" "}
              of the Lodge on:
            </p>

            <div className="border border-slate-200 rounded p-3 text-center space-y-1 print:border-none print:p-0">
              <p className="text-[11px] font-bold tracking-tight">
                {formatDateLong(summons.meeting_date)}
              </p>
              {summons.meeting_time && (
                <p className="font-semibold">commencing Tyling at {summons.meeting_time}</p>
              )}
              {template.venue_address && (
                <p className="text-[9px] text-slate-700 mt-1 print:text-black">
                  at {template.venue_address}
                </p>
              )}
            </div>

            <p className="italic text-center pt-1">By command of the Worshipful Master.</p>
            <p className="text-right font-semibold pt-2">Yours sincerely and fraternally,</p>
            <p className="text-right font-bold text-[11px] tracking-wide">
              {template.secretary_contact?.split("\n")[0] || "Secretary"}
            </p>
            <p className="text-right text-[9px] uppercase tracking-wider text-slate-500 -mt-1">
              Secretary
            </p>
          </div>

          {summons.dress_code && (
            <div className="border-t border-black pt-2 text-[9px] space-y-1">
              <p><strong>Dress Code:</strong></p>
              <p className="font-medium">{summons.dress_code}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- Sheet 2: officers + dining | agenda ----------

function Sheet2({
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
      <div className="summons-panel border-r border-dashed border-slate-200">
        <h2 className="text-center text-sm font-bold tracking-widest uppercase text-[#1B2A4A] mb-2">
          Officers
        </h2>
        <ul className="text-[9px] space-y-[2px]">
          {officers.filter((o) => o.member).map((o, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{o.member}</span>
              <span className="font-bold text-right">{o.label}</span>
            </li>
          ))}
        </ul>

        <hr className="border-t border-[#C9A432] my-3" />

        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mb-1">
          Dining Arrangements
        </h3>
        <div className="text-[9px] space-y-1">
          {summons.dining_price && <p className="font-bold">{summons.dining_price}</p>}
          {summons.dining_menu && <p>{summons.dining_menu}</p>}
          {template.dining_booking_url && (
            <p className="font-bold">Book online: {template.dining_booking_url}</p>
          )}
          {summons.dining_deadline && (
            <p>All bookings by <strong>{formatDateLong(summons.dining_deadline)}</strong>.</p>
          )}
          {(summons.dining_enquiry_name || summons.dining_enquiry_email) && (
            <p>
              Enquiries: {summons.dining_enquiry_name}
              {summons.dining_enquiry_email ? ` — ${summons.dining_enquiry_email}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="summons-panel">
        <h2 className="text-center text-sm font-bold tracking-widest uppercase text-[#1B2A4A] mb-2">
          Agenda
        </h2>
        {summons.agenda.length === 0 ? (
          <p className="text-[9px]">No agenda items.</p>
        ) : (
          <ol className="text-[10px] space-y-1">
            {summons.agenda.map((a, i) => (
              <li key={a.id} className="flex gap-2">
                <span className="font-bold w-5">{i + 1}.</span>
                <span className="flex-1">{a.label}</span>
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

        <hr className="border-t border-[#C9A432] my-2" />

        {summons.next_meeting_date && (
          <p className="text-[9px] mt-2">
            Next regular meeting: <strong>{formatDateLong(summons.next_meeting_date)}</strong>.
          </p>
        )}
        {summons.officer_night_date && (
          <p className="text-[9px] font-bold underline mt-1">
            Officer Night: {formatDateLong(summons.officer_night_date)}.
          </p>
        )}
      </div>
    </section>
  );
}

function MemberLine({ m }: { m: MemberRow }) {
  const date = formatDateShort(m.initiation_date || m.joined_lodge_date);
  const tag = m.initiation_date ? "(I)" : m.joined_lodge_date ? "(J)" : "";
  const mark = m.is_past_master ? "+" : m.is_royal_arch ? "✠" : "";
  return (
    <div className="flex gap-1">
      <span className="w-[60px] shrink-0">{date} {tag}</span>
      <span className="w-[8px] text-center shrink-0">{mark}</span>
      <span className="flex-1">{formatMemberLine(m)}</span>
    </div>
  );
}

function Notice({ label, children, small }: { label: string; children: React.ReactNode; small?: boolean }) {
  return (
    <div className="mt-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#1B2A4A]">{label}</p>
      <p className={small ? "text-[7.5px] leading-snug text-slate-700" : "text-[8.5px]"}>{children}</p>
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
        padding: 12mm 10mm;
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
