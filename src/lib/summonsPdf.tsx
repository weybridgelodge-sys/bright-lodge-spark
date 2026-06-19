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
  Font,
  pdf,
  Link,
} from "@react-pdf/renderer";

// Disable automatic hyphenation across the document — react-pdf otherwise
// breaks long words like "Foundation"/"Provincial" mid-word in narrow A5
// columns. Returning the whole word forces natural word wrapping instead.
Font.registerHyphenationCallback((word) => [word]);
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
  formatMemberShort,
  rankTitle,
  memberSymbols,
  planOverflow,
  sortMembersBySeniority,
  splitTwoColumns,
  subLetter,
} from "./summons";

export type LodgeTemplate = {
  lodge_name: string;
  lodge_number: string;
  province: string;
  consecration_date: string | null;
  logo_url: string | null;
  cover_left_image_url: string | null;
  cover_right_image_url: string | null;
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

export type OfficerRollRow = {
  label: string;
  member: string;
  member_formal?: string;
  post_nominals?: string | null;
  grand_rank?: string | null;
  provincial_rank?: string | null;
  rank?: string | null;
  email?: string | null;
  phone?: string | null;
};

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
    lineHeight: 1.3,
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
  // Typography — cover
  lodgeName: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    lineHeight: 1.15,
    color: NAVY,
    textAlign: "center",
    marginBottom: 4,
  },
  lodgeNameSmall: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    lineHeight: 1.2,
    color: NAVY,
    textAlign: "center",
    marginTop: 2,
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
    marginVertical: 6,
  },
  bottomSection: {
    marginTop: 2,
  },
  // Unified section heading: 11pt bold uppercase with consistent margins.
  panelHeading: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: NAVY,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionHeading: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: NAVY,
    marginTop: 8,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.75,
  },
  sectionHeadingLarge: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: NAVY,
    marginTop: 8,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.75,
  },
  // Body sizes — minimum 8.5pt anywhere.
  bodyText: { fontSize: 9, lineHeight: 1.3 },
  coverBody: { fontSize: 11, lineHeight: 1.35 },
  coverEmphasis: { fontSize: 12, lineHeight: 1.35, fontFamily: "Times-Bold" },
  smallText: { fontSize: 9, lineHeight: 1.3, color: "#222" },
  smallTextLarge: { fontSize: 9, lineHeight: 1.3, color: "#222" },
  // Static notices (data protection, overseas, etc.) — slightly tighter to
  // avoid mid-word breaks in narrow A5 columns, but never below 8.5pt.
  notice: { fontSize: 8.5, lineHeight: 1.3, color: "#222" },
  micro: { fontSize: 8.5, lineHeight: 1.25, color: "#444" },
  microLarge: { fontSize: 8.5, lineHeight: 1.25, color: "#444" },
  bold: { fontFamily: "Times-Bold" },
  italic: { fontFamily: "Times-Italic" },
  centered: { textAlign: "center" },

  // Cover
  crest: { width: 150, height: 150, alignSelf: "center", marginBottom: 4 },
  contactsRow: { flexDirection: "row", marginTop: 10, marginBottom: 6 },
  contactBlock: { flex: 1 },
  contactBlockRight: { flex: 1, alignItems: "flex-end" },
  invitation: { marginTop: 8 },
  dressBlock: {
    marginTop: 10,
    paddingTop: 6,
    borderTop: `0.5pt solid ${GOLD}`,
  },

  // Members — every entry occupies a fixed double-height row for visual
  // symmetry. Line 1: date + symbols + name. Line 2: post-nominals or blank.
  memberTable: { flexDirection: "row", marginTop: 4 },
  memberCol: { flex: 1, paddingHorizontal: 2 },
 memberRow: { flexDirection: "column", marginBottom: 2, height: 24 },
 memberLine1: { flexDirection: "row", height: 11 },
  memberDate: { width: 62, fontSize: 8.5 },
  memberMark: { width: 18, fontSize: 8.5, textAlign: "center" },
  memberName: { flex: 1, fontSize: 8.5 },
  memberPost: { fontSize: 8.5, paddingLeft: 80, height: 11 },

  // Officers
  officerRow: { flexDirection: "row", marginBottom: 1.5 },
  officerName: { flex: 1, fontSize: 9, paddingRight: 4 },
  officerRole: { width: 82, fontSize: 9, fontFamily: "Times-Bold", textAlign: "right" },

  // Agenda
  agendaRow: { flexDirection: "row", marginBottom: 3 },
  agendaNum: { width: 16, fontSize: 9, fontFamily: "Times-Bold" },
  agendaText: { flex: 1, fontSize: 9, lineHeight: 1.3 },

  // Dining
  diningRow: { flexDirection: "row", marginTop: 4 },
  diningBody: { flex: 1, paddingRight: 8 },
  diningQr: { width: 70, height: 70 },
});


// Collapse whitespace/newlines in CMS-edited notice text so paragraphs flow
// naturally in narrow A5 columns instead of breaking at every embedded \n.
const flow = (t: string) => t.replace(/\s+/g, " ").trim();

// Render a pre-formatted member/officer name so that post-nominals and
// Grand Rank appear in Times-Bold, while Provincial Rank and plain rank stay
// in regular weight.  All four fields follow the base name in the order:
// post-nominals → grand_rank → provincial_rank → rank.
function BoldNameText({
  fullName,
  post_nominals,
  grand_rank,
  provincial_rank,
  rank,
  style,
}: {
  fullName: string;
  post_nominals?: string | null;
  grand_rank?: string | null;
  provincial_rank?: string | null;
  rank?: string | null;
  style?: any;
}) {
  const posts = [
    { text: post_nominals?.trim(), bold: true },
    { text: grand_rank?.trim(), bold: true },
    { text: provincial_rank?.trim(), bold: false },
    { text: rank?.trim(), bold: false },
  ].filter((d) => d.text) as { text: string; bold: boolean }[];

  if (posts.length === 0) {
    return <Text style={style}>{fullName}</Text>;
  }

  const firstPost = posts[0].text;
  const idx = fullName.indexOf(` ${firstPost}`);
  if (idx === -1) {
    return <Text style={style}>{fullName}</Text>;
  }

  const base = fullName.slice(0, idx);
  return (
    <Text style={style}>
      <Text>{base}</Text>
      {posts.map((p, i) => (
        <Text key={i} style={p.bold ? s.bold : undefined}>
          {" "}{p.text}
        </Text>
      ))}
    </Text>
  );
}

// ---------- panel-level renderers ----------


export const DEFAULT_LOGO_URL = "/__l5e/assets-v1/045b91d4-9b41-490d-baa9-8486eca7cb05/weybridge-logo-no-bg.png";
export const DEFAULT_COVER_LEFT_URL = "/__l5e/assets-v1/f22695d7-afc6-46a8-9daf-9564690178fc/TLC-Patron-Pin.jpg";
export const DEFAULT_COVER_RIGHT_URL = "/__l5e/assets-v1/be3d0b35-5888-4ffa-b6b4-c7dfe04cc8f3/Festival_Gold_Award.png";

// URLs of earlier uploads that turned out to be truncated/broken. Any saved
// template still pointing at them is silently rewritten to the current default
// so the cover always renders.
const STALE_ASSET_URLS = new Set<string>([
  "/__l5e/assets-v1/3b24e36a-0ae2-48a6-beff-3f3a71f15e85/TLC-Patron-Pin.jpg",
  "/__l5e/assets-v1/7435bffd-65eb-49e7-9086-2c349fdb427f/Festival_Gold_Award_no_background.png",
  "/__l5e/assets-v1/57c18f79-500d-485c-bb45-3cef1b3bc800/weybridge-logo-navy.png",
]);
const resolveAssetUrl = (url: string | null | undefined, fallback: string) =>
  !url || STALE_ASSET_URLS.has(url) ? fallback : url;


const FrontCoverPanel: React.FC<{
  template: LodgeTemplate;
  summons: SummonsData;
  officers: OfficerRollRow[];
  logoDataUrl?: string | null;
  coverLeftDataUrl?: string | null;
  coverRightDataUrl?: string | null;
}> = ({ template, summons, officers, logoDataUrl, coverLeftDataUrl, coverRightDataUrl }) => {
  const wmFromRoll = officers.find((o) => o.label === "Worshipful Master")?.member_formal || officers.find((o) => o.label === "Worshipful Master")?.member;
  const secOfficer = officers.find((o) => o.label === "Secretary");
  const secFromRoll = secOfficer?.member_formal || secOfficer?.member;
  const secEmail = secOfficer?.email || null;
  const secPhone = secOfficer?.phone || null;
  // Address lines from the template. The first line historically stored the
  // Secretary's short name (e.g. "RD Smith") which now duplicates the officer
  // roll entry above — strip any leading line that looks like a person's name
  // (no digits, no commas, ≤ 4 words) so only the address remains.
  const rawSecLines = (template.secretary_contact || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const looksLikeName = (l: string) =>
    !!l && !/\d/.test(l) && !l.includes(",") && l.split(/\s+/).length <= 4;
  const secAddressLines = rawSecLines.length && looksLikeName(rawSecLines[0])
    ? rawSecLines.slice(1)
    : rawSecLines;
  const secName = secFromRoll || rawSecLines[0] || "—";
  const logoSrc = logoDataUrl || resolveAssetUrl(template.logo_url, DEFAULT_LOGO_URL);
  const leftSrc = coverLeftDataUrl || resolveAssetUrl(template.cover_left_image_url, DEFAULT_COVER_LEFT_URL);
  const rightSrc = coverRightDataUrl || resolveAssetUrl(template.cover_right_image_url, DEFAULT_COVER_RIGHT_URL);
  return (
  <View style={[s.panel]}>
    <Text style={s.lodgeName}>{template.lodge_name} No. {template.lodge_number}</Text>
    <Text style={s.province}>PROVINCE OF {(template.province || "").toUpperCase()}</Text>
    <View style={s.divider} />

     <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 4 }}>
       <View style={{ flex: 1, alignItems: "flex-start" }}>
         {leftSrc ? <Image src={leftSrc} style={{ height: 75 }} /> : null}
       </View>
       <View style={{ flex: 1, alignItems: "center" }}>
         {logoSrc ? <Image src={logoSrc} style={s.crest} /> : null}
       </View>
       <View style={{ flex: 1, alignItems: "flex-end" }}>
         {rightSrc ? <Image src={rightSrc} style={{ height: 75 }} /> : null}
       </View>
     </View>

    {wmFromRoll && (
      <Text style={s.province}>{wmFromRoll} - Worshipful Master</Text>
    )}


    <View style={{ marginTop: 10, marginBottom: 6, alignItems: "flex-start" }}>
      <Text style={s.bodyText}>{`${secName} (Secretary)`}</Text>
      {secEmail && <Text style={s.bodyText}>Email: {secEmail}</Text>}
      {secPhone && <Text style={s.bodyText}>Mobile: {secPhone}</Text>}
      {secAddressLines.map((line, i) => (
        <Text key={i} style={s.bodyText}>{line}</Text>
      ))}
    </View>


    <View style={s.invitation}>
      <Text style={[s.coverBody, s.centered]}>Dear Sir and Brother,</Text>
      <Text style={[s.coverBody, s.centered, { marginTop: 4 }]}>
        You are requested to attend the{" "}
        <Text style={s.bold}>
          {ordinal(summons.meeting_number)} {(summons.meeting_type || "Regular")} Meeting
        </Text>{" "}
        of the Lodge on
      </Text>
      <Text style={[s.coverEmphasis, s.centered, { marginTop: 6 }]}>
        {formatDateLong(summons.meeting_date)}
        {summons.meeting_time ? ` commencing ${summons.meeting_time}` : ""}
      </Text>
      {template.venue_address && (
        <Text style={[s.coverBody, s.centered, { marginTop: 4 }]}>
          at {template.venue_address}
        </Text>
      )}
      <Text style={[s.coverBody, s.centered, { marginTop: 8 }]}>
        By command of the Worshipful Master.
      </Text>
      <Text style={[s.coverBody, s.centered]}>Yours sincerely and fraternally,</Text>
      <Text style={[s.coverBody, s.centered, s.bold, { marginTop: 4 }]}>
        {secFromRoll ? `${secFromRoll} (Secretary)` : secName}
      </Text>
    </View>




    {summons.dress_code && (
      <View style={s.dressBlock}>
        <Text style={[s.smallText, s.bold, s.centered]}>Dress Code</Text>
        <Text style={[s.smallText, s.centered]}>{summons.dress_code}</Text>
      </View>
    )}
  </View>
  );
};


const BackCoverPanel: React.FC<{
  template: LodgeTemplate;
  members: MemberRow[];
  overflow: OverflowPlan;
  hidden: Set<NoticeKey>;
  shortened: Set<NoticeKey>;
}> = ({ template, members, overflow, hidden, shortened }) => {
  // Honorary members are listed separately in the dedicated HONORARY MEMBER
  // line below — exclude them from the main subscribing-members list.
  const subscribing = members.filter((m) => !m.is_honorary_member);
  const sorted = sortMembersBySeniority(subscribing);
  const { left, right } = splitTwoColumns(sorted);

  // Available width (pt) for the name text within a member row.
  // A4 landscape page = 842pt → each A5 panel = 421pt. Panel inner width
  // = 421 - 2*PANEL_PAD(22) = 377pt, split into 2 columns ≈ 188pt each,
  // minus 2*2 paddingHorizontal = 184pt. Date col 62 + mark col 18 leaves
  // ~104pt for the name. Keep a small safety margin.
  const NAME_AVAIL_PT = 100;
  const BASE_NAME_SIZE = 8.5;
  const MIN_NAME_SIZE = 8;
  // Times-Roman average glyph width ≈ 0.5 * fontSize.
  const fitNameFontSize = (text: string) => {
    if (!text) return BASE_NAME_SIZE;
    const needed = NAME_AVAIL_PT / (text.length * 0.5);
    if (needed >= BASE_NAME_SIZE) return BASE_NAME_SIZE;
    return Math.max(MIN_NAME_SIZE, Math.floor(needed * 10) / 10);
  };

  const memberLine = (m: MemberRow) => {
    const sym = memberSymbols(m);
    const date = formatDateShort(m.initiation_date || m.joined_lodge_date);
    const tag = m.initiation_date ? "(I)" : m.joined_lodge_date ? "(J)" : "";
    const mark = `${sym.pastMaster ? "+" : ""}${sym.royalArch ? "†" : ""}`;
    const nameLine = `${rankTitle(m)} ${formatMemberShort(m)}`;
    const nameSize = fitNameFontSize(nameLine);
    const postParts = [
      { text: m.post_nominals?.trim(), bold: true },
      { text: m.grand_rank?.trim(), bold: true },
      { text: m.provincial_rank?.trim(), bold: false },
      { text: m.rank?.trim(), bold: false },
    ].filter((p) => p.text) as { text: string; bold: boolean }[];
    return (
      <View key={m.id} style={s.memberRow}>
        <View style={s.memberLine1}>
          <Text style={s.memberDate}>{date} {tag}</Text>
          <Text style={s.memberMark}>{mark}</Text>
          <Text style={[s.memberName, { fontSize: nameSize }]} wrap={false}>{nameLine}</Text>
        </View>
        {postParts.length === 0 ? (
          <View style={{ height: 11 }} />
        ) : (
          <Text style={s.memberPost} wrap={false}>
            {postParts.map((p, i) => (
              <Text key={i} style={p.bold ? s.bold : undefined}>
                {i > 0 ? " " : ""}{p.text}
              </Text>
            ))}
          </Text>
        )}
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
        + Past Master of the Lodge   # Past Master in the Lodge   † HRA Chapter
      </Text>


      {template.honorary_members && (
        <Text style={[s.smallText, s.bold, { marginTop: 4 }]}>
          HONORARY MEMBER: <Text style={{ fontFamily: "Times-Roman" }}>{template.honorary_members}</Text>
        </Text>
      )}

      <View style={s.thinDivider} />

      <View style={s.bottomSection}>
        {!hidden.has("regular_meetings") && template.regular_meeting_pattern && (
          <>
            <Text style={s.sectionHeadingLarge}>Regular Meetings</Text>
            <Text style={s.smallTextLarge}>{flow(template.regular_meeting_pattern)}</Text>
          </>
        )}
        {!hidden.has("loi") && template.loi_details && (
          <>
            <Text style={s.sectionHeadingLarge}>Lodge of Instruction</Text>
            <Text style={s.smallTextLarge}>
              {flow(`${template.loi_details}${template.progression_notice_text ? ` ${template.progression_notice_text}` : ""}`)}
            </Text>
          </>
        )}
        {(template.royal_arch_rep || template.mcf_contact || template.provincial_website) && (
          <Text style={[s.microLarge, { marginTop: 6 }]}>
            {template.royal_arch_rep && (
              <>
                <Text style={s.bold}>Royal Arch Representative: </Text>
                {template.royal_arch_rep}
              </>
            )}
            {template.royal_arch_rep && (template.mcf_contact || template.provincial_website) ? "  |  " : ""}
            {template.mcf_contact && (
              <>
                <Text style={s.bold}>MCF: </Text>
                {template.mcf_contact}
              </>
            )}
            {template.mcf_contact && template.provincial_website ? "  |  " : ""}
            {template.provincial_website && (
              <>
                <Text style={s.bold}>Province: </Text>
                {template.provincial_website}
              </>
            )}
          </Text>
        )}
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
  hidden: Set<NoticeKey>;
  shortened: Set<NoticeKey>;
}> = ({ template, officers, hidden, shortened }) => (
  <View style={s.panel}>
    <Text style={s.panelHeading}>OFFICERS {officerSeason()}</Text>
    {officers.filter((o) => o.member).map((o, i) => (
      <View key={i} style={s.officerRow}>
        <BoldNameText
          style={s.officerName}
          fullName={o.member}
          post_nominals={o.post_nominals}
          grand_rank={o.grand_rank}
          provincial_rank={o.provincial_rank}
          rank={o.rank}
        />
        <Text style={s.officerRole}>{shortRole(o.label)}</Text>
      </View>
    ))}

    {template.lodge_representatives?.length > 0 && (
      <>
        <View style={s.thinDivider} />
        <View>
          {template.lodge_representatives.map((r, i) => {
            const cleanedRole = (r.role ?? "")
              .replace(/^\s*lodge\s+representative\s+to\s+/i, "")
              .trim();
            return (
              <Text key={i} style={s.smallText}>
                <Text>{r.name}</Text> — Lodge representative to {cleanedRole}
              </Text>
            );
          })}
        </View>
        <View style={s.thinDivider} />
      </>
    )}

    {!hidden.has("data_protection") && template.data_protection_text && (
      <>
        <Text style={s.sectionHeadingLarge}>Data Protection Act</Text>
        <Text style={s.microLarge}>
          {shortened.has("data_protection")
            ? flow(template.data_protection_text_short ||
                "See lodge data protection notice — copies available from the Secretary.")
            : flow(template.data_protection_text)}
        </Text>
      </>
    )}
    {!hidden.has("overseas") && template.overseas_attendance_text && (
      <>
        <Text style={s.sectionHeadingLarge}>Attendance at Lodges Overseas</Text>
        <Text style={s.microLarge}>{flow(template.overseas_attendance_text)}</Text>
      </>
    )}
  </View>
);

const AgendaPanel: React.FC<{
  template: LodgeTemplate;
  summons: SummonsData;
  diningQrDataUrl: string | null;
}> = ({ template, summons, diningQrDataUrl }) => (
  <View style={s.panel}>
    <Text style={s.panelHeading}>AGENDA</Text>
    {summons.agenda.length === 0 ? (
      <Text style={s.smallText}>No agenda items.</Text>
    ) : (
      summons.agenda.map((item, i) => (
        <View key={item.id} wrap={false}>
          <View style={s.agendaRow}>
            <Text style={s.agendaNum}>{i + 1}.</Text>
            <Text style={s.agendaText}>{item.label}</Text>
          </View>
          {item.children && item.children.length > 0 && (
            <View style={{ marginLeft: 16, marginBottom: 2 }}>
              {item.children.map((c, ci) => (
                <View key={c.id} style={s.agendaRow}>
                  <Text style={s.agendaNum}>{subLetter(ci)}.</Text>
                  <Text style={s.agendaText}>{c.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))
    )}

    {Array.from({ length: 7 }).map((_, i) => (
      <Text key={`agenda-spacer-${i}`} style={{ fontSize: 9, lineHeight: 1.3 }}> </Text>
    ))}

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

    {(summons.next_meeting_date || summons.officer_night_date) && (
      <View style={s.thinDivider} />
    )}
    {summons.next_meeting_date && (
      <Text style={s.smallText}>
        The date of the next regular meeting is{" "}
        <Text style={s.bold}>{formatDateLong(summons.next_meeting_date)}</Text>.
      </Text>
    )}
    {summons.officer_night_date && (
      <Text style={[s.smallText, s.bold, { marginTop: 3, textDecoration: "underline" }]}>
        Officer Night will be held on {formatDateLong(summons.officer_night_date)}.
      </Text>
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
  logoDataUrl: string | null;
  coverLeftDataUrl: string | null;
  coverRightDataUrl: string | null;
  overflow: OverflowPlan;
  manualHidden?: NoticeKey[];
}> = ({ template, officers, members, summons, diningQrDataUrl, logoDataUrl, coverLeftDataUrl, coverRightDataUrl, overflow, manualHidden = [] }) => {
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
          <FrontCoverPanel template={template} summons={summons} officers={officers} logoDataUrl={logoDataUrl} coverLeftDataUrl={coverLeftDataUrl} coverRightDataUrl={coverRightDataUrl} />
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
            hidden={hidden}
            shortened={shortened}
          />
        </View>
        <View style={{ flex: 1, padding: 0 }}>
          <AgendaPanel template={template} summons={summons} diningQrDataUrl={diningQrDataUrl} />
        </View>
      </Page>
    </Document>
  );
};

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    // Resolve relative asset paths (e.g. "/__l5e/assets-v1/...") against the
    // current origin so react-pdf can fetch them in the browser.
    const abs =
      typeof window !== "undefined" && url.startsWith("/")
        ? `${window.location.origin}${url}`
        : url;
    const res = await fetch(abs);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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
  const logoUrl = resolveAssetUrl(args.template.logo_url, DEFAULT_LOGO_URL);
  const coverLeftUrl = resolveAssetUrl(args.template.cover_left_image_url, DEFAULT_COVER_LEFT_URL);
  const coverRightUrl = resolveAssetUrl(args.template.cover_right_image_url, DEFAULT_COVER_RIGHT_URL);
  const logoDataUrl = logoUrl ? await fetchImageAsDataUrl(logoUrl) : null;
  const coverLeftDataUrl = coverLeftUrl ? await fetchImageAsDataUrl(coverLeftUrl) : null;
  const coverRightDataUrl = coverRightUrl ? await fetchImageAsDataUrl(coverRightUrl) : null;
  const overflow = planOverflow(args.members.length);
  const doc = (
    <SummonsDocument
      template={args.template}
      officers={args.officers}
      members={args.members}
      summons={args.summons}
      diningQrDataUrl={diningQrDataUrl}
      logoDataUrl={logoDataUrl}
      coverLeftDataUrl={coverLeftDataUrl}
      coverRightDataUrl={coverRightDataUrl}
      overflow={overflow}
      manualHidden={args.manualHidden}
    />
  );

  return await pdf(doc).toBlob();
}
