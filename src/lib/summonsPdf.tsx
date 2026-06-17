// PDF document for the lodge summons. A4 portrait, multi-page booklet layout.
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
  candidateAgendaLabel,
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

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  cover: {
    alignItems: "center",
    borderBottom: `2pt solid ${GOLD}`,
    paddingBottom: 12,
    marginBottom: 14,
  },
  lodgeName: { fontSize: 22, fontFamily: "Times-Bold", color: NAVY },
  lodgeNo: { fontSize: 14, color: NAVY, marginTop: 2 },
  meetingMeta: { fontSize: 11, marginTop: 6, textAlign: "center" },
  h2: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: NAVY,
    marginTop: 10,
    marginBottom: 4,
    borderBottom: `0.5pt solid ${GOLD}`,
    paddingBottom: 2,
  },
  h3: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: NAVY,
    marginTop: 8,
    marginBottom: 2,
  },
  twoCol: { flexDirection: "row", gap: 14 },
  col: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  agendaRow: { flexDirection: "row", marginBottom: 2 },
  agendaNum: { width: 18, fontFamily: "Helvetica-Bold" },
  member: { marginBottom: 1 },
  small: { fontSize: 8.5, lineHeight: 1.3 },
  caption: { fontSize: 7.5, color: "#555" },
  notice: { fontSize: 8, marginTop: 6, color: "#333" },
  qr: { width: 90, height: 90 },
  candidateBlock: {
    border: `0.5pt solid #ccc`,
    padding: 6,
    marginTop: 4,
    borderRadius: 2,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 32,
    right: 32,
    fontSize: 7.5,
    color: "#777",
    textAlign: "center",
  },
});

function renderMemberLine(m: MemberRow): string {
  const sym = memberSymbols(m);
  const marks =
    (sym.pastMaster ? "+ " : "  ") + (sym.royalArch ? "✠ " : "");
  return `${marks}${formatDateShort(m.initiation_date || m.joined_lodge_date)} — ${formatMemberLine(m)}`;
}

const SummonsDocument: React.FC<{
  template: LodgeTemplate;
  officers: OfficerRollRow[];
  members: MemberRow[];
  summons: SummonsData;
  diningQrDataUrl: string | null;
  overflow: OverflowPlan;
  manualHidden?: NoticeKey[];
}> = ({ template, officers, members, summons, diningQrDataUrl, overflow, manualHidden = [] }) => {
  const sorted = sortMembersBySeniority(members);
  const { left, right } = splitTwoColumns(sorted);
  const hidden = new Set([...overflow.hidden, ...manualHidden]);
  const shortened = new Set(overflow.shortened);

  return (
    <Document title={`Summons #${summons.meeting_number}`}>
      {/* PAGE 1 — Cover + Officers */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          {template.logo_url ? (
            <Image src={template.logo_url} style={{ width: 60, height: 60, marginBottom: 6 }} />
          ) : null}
          <Text style={styles.lodgeName}>{template.lodge_name}</Text>
          <Text style={styles.lodgeNo}>
            No. {template.lodge_number} — Province of {template.province}
          </Text>
          {template.consecration_date && (
            <Text style={styles.caption}>
              Consecrated {formatDateShort(template.consecration_date)}
            </Text>
          )}
          <Text style={styles.meetingMeta}>
            Summons to the {summons.meeting_type || "Regular"} Meeting{"\n"}
            Meeting No. {summons.meeting_number} —{" "}
            {formatDateLong(summons.meeting_date)}
            {summons.meeting_time ? ` at ${summons.meeting_time}` : ""}
          </Text>
          {template.venue_address && (
            <Text style={styles.meetingMeta}>{template.venue_address}</Text>
          )}
          {summons.dress_code && (
            <Text style={{ ...styles.meetingMeta, fontFamily: "Times-Italic" }}>
              Dress: {summons.dress_code}
            </Text>
          )}
        </View>

        <Text style={styles.h2}>Officers of the Lodge</Text>
        <View style={styles.twoCol}>
          {splitTwoColumnArrays(officers).map((col, i) => (
            <View key={i} style={styles.col}>
              {col.map((o, j) => (
                <Text key={j} style={styles.small}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{o.label}: </Text>
                  {o.member || "—"}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {template.honorary_members && (
          <>
            <Text style={styles.h3}>Honorary Members</Text>
            <Text style={styles.small}>{template.honorary_members}</Text>
          </>
        )}

        {template.lodge_representatives?.length > 0 && (
          <>
            <Text style={styles.h3}>Lodge Representatives</Text>
            {template.lodge_representatives.map((r, i) => (
              <Text key={i} style={styles.small}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{r.role}: </Text>
                {r.name}
              </Text>
            ))}
          </>
        )}

        <View style={{ ...styles.twoCol, marginTop: 8 }}>
          <View style={styles.col}>
            {template.royal_arch_rep && (
              <>
                <Text style={styles.h3}>Royal Arch Representative</Text>
                <Text style={styles.small}>{template.royal_arch_rep}</Text>
              </>
            )}
            {template.wm_contact && (
              <>
                <Text style={styles.h3}>Worshipful Master</Text>
                <Text style={styles.small}>{template.wm_contact}</Text>
              </>
            )}
          </View>
          <View style={styles.col}>
            {template.secretary_contact && (
              <>
                <Text style={styles.h3}>Secretary</Text>
                <Text style={styles.small}>{template.secretary_contact}</Text>
              </>
            )}
            {template.mcf_contact && (
              <>
                <Text style={styles.h3}>Masonic Charitable Foundation</Text>
                <Text style={styles.small}>{template.mcf_contact}</Text>
              </>
            )}
          </View>
        </View>

        <Text style={styles.footer}>{template.lodge_name} No. {template.lodge_number} — Summons</Text>
      </Page>

      {/* PAGE 2 — Agenda + Candidates */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Agenda</Text>
        {summons.agenda.length === 0 ? (
          <Text style={styles.small}>No agenda items.</Text>
        ) : (
          summons.agenda.map((item, i) => (
            <View key={item.id} style={styles.agendaRow}>
              <Text style={styles.agendaNum}>{i + 1}.</Text>
              <Text style={{ flex: 1 }}>{item.label}</Text>
            </View>
          ))
        )}

        {summons.minutes_confirmation_date && (
          <>
            <Text style={styles.h3}>Minutes</Text>
            <Text style={styles.small}>
              Minutes of the meeting held on {formatDateLong(summons.minutes_confirmation_date)} to be read and confirmed.
            </Text>
          </>
        )}

        {summons.candidates.length > 0 && (
          <>
            <Text style={styles.h2}>Candidates</Text>
            {summons.candidates.map((c) => (
              <View key={c.id} style={styles.candidateBlock}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  {c.ceremony_type}: {c.name}
                </Text>
                {c.dob && <Text style={styles.small}>Date of Birth: {formatDateShort(c.dob)}</Text>}
                {c.occupation && <Text style={styles.small}>Occupation: {c.occupation}</Text>}
                {c.address && <Text style={styles.small}>Address: {c.address}</Text>}
                {(c.proposer || c.seconder) && (
                  <Text style={styles.small}>
                    Proposed by {c.proposer || "—"}, seconded by {c.seconder || "—"}
                    {c.date_proposed ? ` on ${formatDateShort(c.date_proposed)}` : ""}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {summons.next_meeting_date && (
          <>
            <Text style={styles.h3}>Next Meeting</Text>
            <Text style={styles.small}>{formatDateLong(summons.next_meeting_date)}</Text>
          </>
        )}
        {summons.officer_night_date && (
          <>
            <Text style={styles.h3}>Officer Night</Text>
            <Text style={styles.small}>{formatDateLong(summons.officer_night_date)}</Text>
          </>
        )}

        <Text style={styles.footer}>{template.lodge_name} No. {template.lodge_number} — Summons</Text>
      </Page>

      {/* PAGE 3 — Members + Notices */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>
          List of Members ({sorted.length}) — by seniority
        </Text>
        <Text style={styles.caption}>
          + Past Master &nbsp; # Past Master of this Lodge &nbsp; ✠ Holy Royal Arch
        </Text>
        <View style={{ ...styles.twoCol, marginTop: 4 }}>
          <View style={styles.col}>
            {left.map((m) => (
              <Text key={m.id} style={{ ...styles.member, fontSize: overflow.fontSize }}>
                {renderMemberLine(m)}
              </Text>
            ))}
          </View>
          <View style={styles.col}>
            {right.map((m) => (
              <Text key={m.id} style={{ ...styles.member, fontSize: overflow.fontSize }}>
                {renderMemberLine(m)}
              </Text>
            ))}
          </View>
        </View>

        {!hidden.has("regular_meetings") && template.regular_meeting_pattern && (
          <>
            <Text style={styles.h3}>Regular Meetings</Text>
            <Text style={styles.notice}>{template.regular_meeting_pattern}</Text>
          </>
        )}
        {!hidden.has("loi") && template.loi_details && (
          <>
            <Text style={styles.h3}>Lodge of Instruction</Text>
            <Text style={styles.notice}>{template.loi_details}</Text>
          </>
        )}
        {!hidden.has("provincial_mcf") && (
          <Text style={styles.notice}>
            {shortened.has("provincial_mcf")
              ? `${template.provincial_website || ""} — MCF: ${template.mcf_contact || ""}`
              : `${template.provincial_website ? `Province: ${template.provincial_website}` : ""}`}
          </Text>
        )}
        {!hidden.has("data_protection") && template.data_protection_text && (
          <>
            <Text style={styles.h3}>Data Protection</Text>
            <Text style={styles.notice}>
              {shortened.has("data_protection")
                ? (template.data_protection_text_short ||
                    "See lodge data protection notice — copies available from the Secretary.")
                : template.data_protection_text}
            </Text>
          </>
        )}
        {!hidden.has("overseas") && template.overseas_attendance_text && (
          <>
            <Text style={styles.h3}>Attendance at Lodges Overseas</Text>
            <Text style={styles.notice}>{template.overseas_attendance_text}</Text>
          </>
        )}
        {template.progression_notice_text && (
          <>
            <Text style={styles.h3}>Progression of Office</Text>
            <Text style={styles.notice}>{template.progression_notice_text}</Text>
          </>
        )}

        <Text style={styles.footer}>{template.lodge_name} No. {template.lodge_number} — Summons</Text>
      </Page>

      {/* PAGE 4 — Dining */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Festive Board</Text>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            {summons.dining_menu && (
              <>
                <Text style={styles.h3}>Menu</Text>
                <Text style={styles.small}>{summons.dining_menu}</Text>
              </>
            )}
            {summons.dining_price && (
              <Text style={{ ...styles.small, marginTop: 6 }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Price: </Text>
                {summons.dining_price}
              </Text>
            )}
            {summons.dining_deadline && (
              <Text style={styles.small}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Booking deadline: </Text>
                {formatDateLong(summons.dining_deadline)}
              </Text>
            )}
            {(summons.dining_enquiry_name || summons.dining_enquiry_email) && (
              <>
                <Text style={styles.h3}>Dining Enquiries</Text>
                <Text style={styles.small}>{summons.dining_enquiry_name}</Text>
                <Text style={styles.small}>{summons.dining_enquiry_email}</Text>
              </>
            )}
            {template.dining_booking_url && (
              <>
                <Text style={styles.h3}>Book online</Text>
                <Text style={styles.small}>{template.dining_booking_url}</Text>
              </>
            )}
          </View>
          {diningQrDataUrl && (
            <View>
              <Image src={diningQrDataUrl} style={styles.qr} />
              <Text style={{ ...styles.caption, textAlign: "center", marginTop: 4 }}>
                Scan to book
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>{template.lodge_name} No. {template.lodge_number} — Summons</Text>
      </Page>
    </Document>
  );
};

function splitTwoColumnArrays<T>(items: T[]): [T[], T[]] {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
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
