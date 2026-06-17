// Lodge summons PDF — A4 LANDSCAPE booklet imposed for printing.
// Each PDF page contains two A5 panels side-by-side (a single sheet folded
// in half to A5 portrait). Panel order is the standard 4-page imposition:
//
//   PDF page 1 (OUTSIDE of folded sheet):   [ Back cover (p.4) | Front cover (p.1) ]
//   PDF page 2 (INSIDE of folded sheet):    [ Inside left (p.2) | Inside right (p.3) ]
//
// When printed double-sided (flip on short edge) and folded down the centre
// the panels read in the correct order: Front → Inside-L → Inside-R → Back.
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import {
  AgendaItem,
  Candidate,
  MemberRow,
  NoticeKey,
  OverflowPlan,
  formatDateLong,
  formatDateShort,
  formatMemberLine,
  memberSymbols,
  planOverflow,
  sortMembersBySeniority,
  splitTwoColumns,
} from "./summons";

export type LodgeTemplate = {
  lodge_name: string;
  lodge_number: string;
  province: string;
  consecration_date: string | null;
  logo_url: string | null;
  venue_address: string | null;
  regular_meeting_pattern: string | null;
  loi_details: string | null;
  provincial_website: string | null;
  mcf_contact: string | null;
  dining_booking_url: string | null;
  data_protection_text: string | null;
  data_protection_text_short: string | null;
  overseas_attendance_text: string | null;
  progression_notice_text: string | null;
  wm_contact: string | null;
  secretary_contact: string | null;
  royal_arch_rep: string | null;
  honorary_members: string | null;
  lodge_representatives: { role: string; name: string }[];
};

export type OfficerRollRow = { label: string; member: string };

export type SummonsData = {
  meeting_number: number;
  meeting_date: string | null;
  meeting_time: string | null;
  meeting_type: string | null;
  dress_code: string | null;
  minutes_confirmation_date: string | null;
  next_meeting_date: string | null;
  officer_night_date: string | null;
  agenda: AgendaItem[];
  candidates: Candidate[];
  dining_enquiry_name: string | null;
  dining_enquiry_email: string | null;
  dining_menu: string | null;
  dining_price: string | null;
  dining_deadline: string | null;
};

const NAVY = "#1B2A4A";
const GOLD = "#C9A432";
const GUTTER = 22;       // centre gutter between the two A5 panels
const PANEL_PAD = 22;    // inner padding on each panel
const FOLD_LINE_COLOR = "#E5E7EB";

const s = StyleSheet.create({
  // Outer A4-landscape page: row of two A5 panels with a faint fold line.
  page: {
    flexDirection: "row",
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: "#111",
    backgroundColor: "#FFFFFF",
  },
  panel: {
    flex: 1,
    padding: PANEL_PAD,
  },
  panelLeft: {
    borderRight: `0.5pt dashed ${FOLD_LINE_COLOR}`,
  },
  // Typography
  lodgeName: {
    fontFamily: "Times-Bold",
    fontSize: 20,
    color: NAVY,
    textAlign: "center",
  },
  lodgeNameSmall: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: NAVY,
    textAlign: "center",
  },
  province: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: NAVY,
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 1,
  },
  divider: {
    borderBottom: `1pt solid ${GOLD}`,
    marginVertical: 8,
  },
  thinDivider: {
    borderBottom: `0.5pt solid ${GOLD}`,
    marginVertical: 4,
  },
  panelHeading: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    color: NAVY,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  sectionHeading: {
    fontFamily: "Times-Bold",
    fontSize: 9,
    color: NAVY,
    marginTop: 6,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bodyText: { fontSize: 9, lineHeight: 1.35 },
  smallText: { fontSize: 7.5, lineHeight: 1.3, color: "#333" },
  micro: { fontSize: 6.5, lineHeight: 1.25, color: "#555" },
  bold: { fontFamily: "Times-Bold" },
  italic: { fontFamily: "Times-Italic" },
  centered: { textAlign: "center" },

  // Cover
  crest: { width: 300, height: 300, alignSelf: "center", marginBottom: 4 },
  contactsRow: { flexDirection: "row", marginTop: 10, marginBottom: 6 },
  contactBlock: { flex: 1 },
  invitation: { marginTop: 8 },
  dressBlock: {
    marginTop: 10,
    paddingTop: 6,
    borderTop: `0.5pt solid ${GOLD}`,
  },

  // Members
  memberTable: { flexDirection: "row", marginTop: 4 },
  memberCol: { flex: 1, paddingHorizontal: 2 },
  memberRow: { flexDirection: "row", marginBottom: 1 },
  memberDate: { width: 60, fontSize: 6.8 },
  memberMark: { width: 8, fontSize: 6.8, textAlign: "center" },
  memberName: { flex: 1, fontSize: 6.8 },

  noticeTable: { flexDirection: "row", marginTop: 4 },
  noticeCol: { flex: 1, paddingHorizontal: 2 },

  // Officers
  officerRow: { flexDirection: "row", marginBottom: 1 },
  officerName: { flex: 1, fontSize: 7.5, paddingRight: 4 },
  officerRole: { width: 78, fontSize: 7.5, fontFamily: "Times-Bold", textAlign: "right" },

  // Agenda
  agendaRow: { flexDirection: "row", marginBottom: 3 },
  agendaNum: { width: 16, fontSize: 9, fontFamily: "Times-Bold" },
  agendaText: { flex: 1, fontSize: 9, lineHeight: 1.35 },

  // Dining
  diningRow: { flexDirection: "row", marginTop: 4 },
  diningBody: { flex: 1, paddingRight: 8 },
  diningQr: { width: 70, height: 70 },
});

// ---------- panel-level renderers ----------

const FrontCoverPanel: React.FC<{ template: LodgeTemplate; summons: SummonsData }> = ({
  template,
  summons,
}) => (
  <View style={[s.panel]}>
    {template.logo_url ? <Image src={template.logo_url} style={s.crest} /> : null}
    <Text style={s.lodgeName}>{template.lodge_name}</Text>
    <Text style={s.lodgeNameSmall}>No. {template.lodge_number}</Text>
    <Text style={s.province}>PROVINCE OF {(template.province || "").toUpperCase()}</Text>
    <View style={s.divider} />

    <View style={s.contactsRow}>
      <View style={s.contactBlock}>
        <Text style={[s.bodyText, s.bold]}>
          {template.wm_contact?.split("\n")[0] || "Worshipful Master"}
        </Text>
        <Text style={[s.smallText, s.italic]}>Worshipful Master</Text>
        {template.wm_contact?.split("\n").slice(1).map((line, i) => (
          <Text key={i} style={s.smallText}>{line}</Text>
        ))}
      </View>
      <View style={s.contactBlock}>
        <Text style={[s.bodyText, s.bold]}>
          {template.secretary_contact?.split("\n")[0] || "Secretary"}
        </Text>
        <Text style={[s.smallText, s.italic]}>Secretary</Text>
        {template.secretary_contact?.split("\n").slice(1).map((line, i) => (
          <Text key={i} style={s.smallText}>{line}</Text>
        ))}
      </View>
    </View>

    <View style={s.invitation}>
      <Text style={s.bodyText}>Dear Sir and Brother,</Text>
      <Text style={[s.bodyText, { marginTop: 4 }]}>
        You are requested to attend the{" "}
        <Text style={s.bold}>
          {ordinal(summons.meeting_number)} {(summons.meeting_type || "Regular")} Meeting
        </Text>{" "}
        of the Lodge on
      </Text>
      <Text style={[s.bodyText, s.bold, s.centered, { marginTop: 6 }]}>
        {formatDateLong(summons.meeting_date)}
        {summons.meeting_time ? ` commencing ${summons.meeting_time}` : ""}
      </Text>
      {template.venue_address && (
        <Text style={[s.bodyText, s.centered, { marginTop: 4 }]}>
          at {template.venue_address}
        </Text>
      )}
      <Text style={[s.bodyText, { marginTop: 8 }]}>
        By command of the Worshipful Master.
      </Text>
      <Text style={s.bodyText}>Yours sincerely and fraternally,</Text>
      <Text style={[s.bodyText, s.bold, { marginTop: 4 }]}>
        {template.secretary_contact?.split("\n")[0] || "Secretary"}
      </Text>
    </View>

    {summons.dress_code && (
      <View style={s.dressBlock}>
        <Text style={[s.smallText, s.bold]}>Dress Code</Text>
        <Text style={s.smallText}>{summons.dress_code}</Text>
      </View>
    )}
  </View>
);

const BackCoverPanel: React.FC<{
  template: LodgeTemplate;
  members: MemberRow[];
  overflow: OverflowPlan;
  hidden: Set<NoticeKey>;
  shortened: Set<NoticeKey>;
}> = ({ template, members, overflow, hidden, shortened }) => {
  const sorted = sortMembersBySeniority(members);
  const { left, right } = splitTwoColumns(sorted);

  const memberLine = (m: MemberRow) => {
    const sym = memberSymbols(m);
    const date = formatDateShort(m.initiation_date || m.joined_lodge_date);
    const tag = m.initiation_date ? "(I)" : m.joined_lodge_date ? "(J)" : "";
    const mark = sym.pastMaster ? "+" : sym.royalArch ? "✠" : "";
    return (
      <View key={m.id} style={s.memberRow}>
        <Text style={s.memberDate}>{date} {tag}</Text>
        <Text style={s.memberMark}>{mark}</Text>
        <Text style={s.memberName}>{formatMemberLine(m)}</Text>
      </View>
    );
  };

  return (
    <View style={s.panel}>
      <Text style={s.panelHeading}>LIST OF MEMBERS</Text>
      <View style={s.memberTable}>
        <View style={s.memberCol}>{left.map(memberLine)}</View>
        <View style={s.memberCol}>{right.map(memberLine)}</View>
      </View>
      <Text style={[s.micro, { marginTop: 4 }]}>
        + Past Master of the Lodge   # Past Master in the Lodge   ✠ HRA Chapter
      </Text>

      {template.honorary_members && (
        <Text style={[s.smallText, s.bold, { marginTop: 4 }]}>
          HONORARY MEMBER: <Text style={{ fontFamily: "Times-Roman" }}>{template.honorary_members}</Text>
        </Text>
      )}

      <View style={s.thinDivider} />

      <View style={s.noticeTable}>
        <View style={s.noticeCol}>
          {!hidden.has("regular_meetings") && template.regular_meeting_pattern && (
            <>
              <Text style={s.sectionHeading}>Regular Meetings</Text>
              <Text style={s.smallText}>{template.regular_meeting_pattern}</Text>
            </>
          )}
          {!hidden.has("loi") && template.loi_details && (
            <>
              <Text style={s.sectionHeading}>Lodge of Instruction</Text>
              <Text style={s.smallText}>{template.loi_details}</Text>
            </>
          )}
          {template.progression_notice_text && (
            <Text style={[s.smallText, s.bold, { marginTop: 3 }]}>
              {template.progression_notice_text}
            </Text>
          )}
          {template.royal_arch_rep && (
            <Text style={[s.smallText, { marginTop: 4 }]}>
              <Text style={s.bold}>Royal Arch Representative: </Text>
              {template.royal_arch_rep}
            </Text>
          )}
          {template.mcf_contact && (
            <Text style={s.smallText}>
              <Text style={s.bold}>Masonic Charitable Foundation: </Text>
              {template.mcf_contact}
            </Text>
          )}
          {template.provincial_website && (
            <Text style={[s.smallText, s.bold]}>
              Provincial website: {template.provincial_website}
            </Text>
          )}
        </View>

        <View style={s.noticeCol}>
          {!hidden.has("data_protection") && template.data_protection_text && (
            <>
              <Text style={s.sectionHeading}>Data Protection Act</Text>
              <Text style={s.micro}>
                {shortened.has("data_protection")
                  ? (template.data_protection_text_short ||
                      "See lodge data protection notice — copies available from the Secretary.")
                  : template.data_protection_text}
              </Text>
            </>
          )}

          {!hidden.has("overseas") && template.overseas_attendance_text && (
            <>
              <Text style={s.sectionHeading}>Attendance at Lodges Overseas</Text>
              <Text style={s.micro}>{template.overseas_attendance_text}</Text>
            </>
          )}
        </View>
      </View>

      {/* overflow.fontSize is currently informational only — members already
          render at a fixed compact size that fits the A5 panel. */}
      {overflow.fontSize < 7 && (
        <Text style={[s.micro, { marginTop: 2, color: "#999" }]}>
          (Membership list condensed to fit.)
        </Text>
      )}
    </View>
  );
};

const OfficersDiningPanel: React.FC<{
  template: LodgeTemplate;
  officers: OfficerRollRow[];
  summons: SummonsData;
  diningQrDataUrl: string | null;
}> = ({ template, officers, summons, diningQrDataUrl }) => (
  <View style={s.panel}>
    <Text style={s.panelHeading}>OFFICERS {officerSeason()}</Text>
    {officers.filter((o) => o.member).map((o, i) => (
      <View key={i} style={s.officerRow}>
        <Text style={s.officerName}>{o.member}</Text>
        <Text style={s.officerRole}>{shortRole(o.label)}</Text>
      </View>
    ))}

    {template.lodge_representatives?.length > 0 && (
      <View style={{ marginTop: 6 }}>
        {template.lodge_representatives.map((r, i) => (
          <Text key={i} style={s.smallText}>
            <Text>{r.name}</Text> — Lodge representative to {r.role}
          </Text>
        ))}
      </View>
    )}

    <View style={s.thinDivider} />

    <Text style={s.sectionHeading}>Dining Arrangements</Text>
    <View style={s.diningRow}>
      <View style={s.diningBody}>
        {summons.dining_price && (
          <Text style={[s.smallText, s.bold]}>{summons.dining_price}</Text>
        )}
        {summons.dining_menu && (
          <Text style={[s.smallText, { marginTop: 2 }]}>{summons.dining_menu}</Text>
        )}
        {template.dining_booking_url && (
          <Text style={[s.smallText, s.bold, { marginTop: 4 }]}>
            Please book online at: {template.dining_booking_url}
          </Text>
        )}
        {summons.dining_deadline && (
          <Text style={[s.smallText, { marginTop: 2 }]}>
            All bookings by{" "}
            <Text style={s.bold}>{formatDateLong(summons.dining_deadline)}</Text>
            {" "}or you will not be fed.
          </Text>
        )}
        {(summons.dining_enquiry_name || summons.dining_enquiry_email) && (
          <Text style={[s.smallText, { marginTop: 4 }]}>
            Dining enquiries: {summons.dining_enquiry_name}
            {summons.dining_enquiry_email ? ` — ${summons.dining_enquiry_email}` : ""}
          </Text>
        )}
      </View>
      {diningQrDataUrl && (
        <View style={{ alignItems: "center" }}>
          <Image src={diningQrDataUrl} style={s.diningQr} />
          <Text style={[s.micro, { marginTop: 2 }]}>Scan to book</Text>
        </View>
      )}
    </View>
  </View>
);

const AgendaPanel: React.FC<{
  template: LodgeTemplate;
  summons: SummonsData;
}> = ({ template, summons }) => (
  <View style={s.panel}>
    <Text style={s.panelHeading}>AGENDA</Text>
    {summons.agenda.length === 0 ? (
      <Text style={s.smallText}>No agenda items.</Text>
    ) : (
      summons.agenda.map((item, i) => (
        <View key={item.id} style={s.agendaRow}>
          <Text style={s.agendaNum}>{i + 1}.</Text>
          <Text style={s.agendaText}>{item.label}</Text>
        </View>
      ))
    )}

    {summons.candidates.length > 0 && (
      <View style={{ marginTop: 6 }}>
        <Text style={s.sectionHeading}>Candidate Details</Text>
        {summons.candidates.map((c) => (
          <Text key={c.id} style={[s.smallText, { marginBottom: 3 }]}>
            <Text style={s.bold}>{c.ceremony_type}: {c.name}</Text>
            {c.dob ? `, D.O.B ${formatDateShort(c.dob)}` : ""}
            {c.occupation ? `, ${c.occupation}` : ""}
            {c.address ? `, of ${c.address}` : ""}
            {(c.proposer || c.seconder) ? (
              <>
                . Proposed by {c.proposer || "—"} and seconded by {c.seconder || "—"}
                {c.date_proposed ? ` on ${formatDateShort(c.date_proposed)}` : ""}.
              </>
            ) : "."}
          </Text>
        ))}
      </View>
    )}

    <View style={s.thinDivider} />

    {summons.next_meeting_date && (
      <Text style={[s.smallText, { marginTop: 4 }]}>
        The date of the next regular meeting is{" "}
        <Text style={s.bold}>{formatDateLong(summons.next_meeting_date)}</Text>.
      </Text>
    )}
    {summons.officer_night_date && (
      <Text style={[s.smallText, s.bold, { marginTop: 3, textDecoration: "underline" }]}>
        Officer Night will be held on {formatDateLong(summons.officer_night_date)}.
      </Text>
    )}
  </View>
);

// ---------- helpers ----------

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

// Abbreviate long role labels for the right-hand officer column.
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

// ---------- document ----------

const SummonsDocument: React.FC<{
  template: LodgeTemplate;
  officers: OfficerRollRow[];
  members: MemberRow[];
  summons: SummonsData;
  diningQrDataUrl: string | null;
  overflow: OverflowPlan;
  manualHidden?: NoticeKey[];
}> = ({ template, officers, members, summons, diningQrDataUrl, overflow, manualHidden = [] }) => {
  const hidden = new Set<NoticeKey>([...overflow.hidden, ...manualHidden]);
  const shortened = new Set<NoticeKey>(overflow.shortened);

  return (
    <Document title={`Summons #${summons.meeting_number}`}>
      {/* OUTSIDE of folded sheet: back cover (left panel) | front cover (right panel) */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={[s.panel, s.panelLeft, { flex: 1, padding: 0 }]}>
          <BackCoverPanel
            template={template}
            members={members}
            overflow={overflow}
            hidden={hidden}
            shortened={shortened}
          />
        </View>
        <View style={{ flex: 1, padding: 0 }}>
          <FrontCoverPanel template={template} summons={summons} />
        </View>
      </Page>

      {/* INSIDE of folded sheet: officers + dining (left) | agenda (right) */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={[s.panel, s.panelLeft, { flex: 1, padding: 0 }]}>
          <OfficersDiningPanel
            template={template}
            officers={officers}
            summons={summons}
            diningQrDataUrl={diningQrDataUrl}
          />
        </View>
        <View style={{ flex: 1, padding: 0 }}>
          <AgendaPanel template={template} summons={summons} />
        </View>
      </Page>
    </Document>
  );
};

export async function generateSummonsBlob(args: {
  template: LodgeTemplate;
  officers: OfficerRollRow[];
  members: MemberRow[];
  summons: SummonsData;
  manualHidden?: NoticeKey[];
}): Promise<Blob> {
  let diningQrDataUrl: string | null = null;
  if (args.template.dining_booking_url) {
    try {
      diningQrDataUrl = await QRCode.toDataURL(args.template.dining_booking_url, {
        margin: 1,
        width: 240,
      });
    } catch {
      diningQrDataUrl = null;
    }
  }
  const overflow = planOverflow(args.members.length);
  const doc = (
    <SummonsDocument
      template={args.template}
      officers={args.officers}
      members={args.members}
      summons={args.summons}
      diningQrDataUrl={diningQrDataUrl}
      overflow={overflow}
      manualHidden={args.manualHidden}
    />
  );
  return await pdf(doc).toBlob();
}
