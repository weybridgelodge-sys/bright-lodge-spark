import { useState } from "react";

const PALETTE = {
  vellum: "#F5F0E8",
  vellumDark: "#EDE6D6",
  navy: "#1C294B",
  navyLight: "#2A3D6E",
  gold: "#B8962E",
  goldLight: "#D4AF6A",
  sepia: "#8B6F47",
  sepiaLight: "#C4A882",
  ink: "#2C2416",
  cream: "#FDFAF4",
};

type Officer = { name: string; role: string };

type SummonsDoc = {
  id: string;
  type: "summons";
  number: number;
  date: string;
  meetingDate: string;
  venue: string;
  wm: string;
  ipm?: string;
  masterElect?: string;
  secretary: string;
  keyBusiness: string[];
  officers: Officer[];
  charityRep?: string;
  notes?: string;
  colour: string;
};

type FestivalDoc = {
  id: string;
  type: "festival";
  number: null;
  date: string;
  wm: string;
  ipm: string;
  president: string;
  committee: string[];
  toastmaster: string;
  menu: string[];
  toasts: { toast: string; proposedBy: string; response?: string }[];
  entertainment: string[];
  officers: Officer[];
  notes?: string;
  colour: string;
};

type Doc = SummonsDoc | FestivalDoc;

const documents: Doc[] = [
  {
    id: "summons-29",
    type: "summons",
    number: 29,
    date: "15th October 1954",
    meetingDate: "Wednesday 27th October 1954",
    venue: "Masonic Hall, Chertsey",
    wm: "W. Bro. L. T. Anstead",
    masterElect: "Bro. H. E. Boyle",
    secretary: "N. E. Mills",
    keyBusiness: [
      "In memory of W. Bro. W. L. Lewis, P.P.G.St.B., who passed away 30th August 1954",
      "Installation of Bro. H. E. Boyle as Master for the ensuing year",
      "Motion to place £21 from the Benevolent Fund on the W. Master's list for R.M. Benevolent Institution",
      "Presentation of Past Master's Jewel to W. Bro. L. T. Anstead",
      "Election of Lodge Representative to Provincial Charity Committee",
    ],
    officers: [
      { name: "Bro. H. E. Boyle", role: "S.W." },
      { name: "Bro. G. H. Knevett", role: "J.W." },
      { name: "W. Bro. T. F. Kirkham, P.P.G.D.", role: "Chaplain" },
      { name: "W. Bro. H. C. Felmingham, P.P.A.G.D.C.", role: "Treasurer" },
      { name: "W. Bro. N. E. Mills, F.A.C.C.A., P.P.G.Treas.", role: "Secretary" },
      { name: "W. Bro. W. J. Green, F.C.A.", role: "Acting D.C." },
      { name: "Bro. A. J. Huntingford", role: "S.D." },
      { name: "Bro. F. Edmonds", role: "J.D." },
      { name: "W. Bro. R. B. Seaman, P.P.G.St.B.", role: "A.D.C." },
      { name: "W. Bro. A. H. Ley, F.R.I.B.A., P.A.G.S.Wks.", role: "Almoner" },
      { name: "W. Bro. C. Haydn Nokes, P.P.G.D.", role: "Organist" },
      { name: "W. Bro. F. L. Cook", role: "Asst. Secretary" },
      { name: "Bro. R. G. Batten, F.R.I.C.S.", role: "I.G." },
      { name: "W. Bro. W. J. Green, F.C.A.", role: "Steward" },
      { name: "Bro. W. Boyle", role: "Steward" },
      { name: "Bro. A. W. Green", role: "Steward" },
      { name: "Bro. H. Cohen, B.Sc.", role: "Steward" },
      { name: "Bro. C. S. Crook", role: "Steward" },
      { name: "Bro. W. H. Butler", role: "Tyler" },
    ],
    charityRep: "W. Bro. R. Edmonds, M.B.E., P.P.G.W.",
    notes: "The memorial notice for W. Bro. Lewis appears as a bordered panel on the agenda page — a deliberate typographic act of mourning within an otherwise administrative document.",
    colour: PALETTE.navy,
  },
  {
    id: "summons-33",
    type: "summons",
    number: 33,
    date: "14th March 1955",
    meetingDate: "Wednesday 23rd March 1955",
    venue: "Masonic Hall, Chertsey",
    wm: "W. Bro. H. E. Boyle",
    ipm: "W. Bro. L. T. Anstead",
    secretary: "N. E. Mills",
    keyBusiness: [
      "Ballot to initiate Mr George Kenyon, Chartered Mechanical Engineer, Ministry of Supply — born 28th September 1918",
      "Election by ballot of Master for the ensuing year",
      "Election of Treasurer and Tyler",
      "Election of two Brethren for Standing Committee and Audit Committee",
      "Reception of Almoner's Report",
      "Presentation of Past Master's Jewel to W. Bro. H. E. Boyle",
      "Motion to donate £21 to Royal Masonic Hospital 1955",
    ],
    officers: [
      { name: "Bro. G. H. Knevett", role: "S.W." },
      { name: "W. Bro. A. J. Huntingford", role: "J.W." },
      { name: "W. Bro. T. F. Kirkham, P.P.G.D.", role: "Chaplain" },
      { name: "W. Bro. H. C. Felmingham, P.P.A.G.D.C.", role: "Treasurer" },
      { name: "W. Bro. N. E. Mills, F.A.C.C.A., P.P.G.Treas.", role: "Secretary" },
      { name: "W. Bro. W. J. Green, F.C.A.", role: "D.C." },
      { name: "Bro. F. Edmonds", role: "S.D." },
      { name: "Bro. R. G. Batten, F.R.I.C.S.", role: "J.D." },
      { name: "W. Bro. R. B. Seaman, P.P.G.St.B.", role: "A.D.C." },
      { name: "W. Bro. A. H. Ley, F.R.I.B.A., P.A.G.S.Wks.", role: "Almoner" },
      { name: "W. Bro. F. L. Cook", role: "Asst. Secretary" },
      { name: "Bro. W. Boyle", role: "I.G." },
      { name: "Bro. A. W. Green", role: "Steward" },
      { name: "Bro. H. Cohen, B.Sc.", role: "Steward" },
      { name: "Bro. C. S. Crook", role: "Steward" },
      { name: "Bro. J. Humphries", role: "Steward" },
      { name: "Bro. W. C. Askew", role: "Steward" },
      { name: "Bro. W. H. Butler", role: "Tyler" },
    ],
    charityRep: "W. Bro. R. Edmonds, M.B.E., P.P.G.W.",
    notes: "This is the Installation meeting for the 1955 year. The Officers Night was announced for Monday 21st March at St. Alban's Hall, Weybridge — two days before the lodge meeting itself.",
    colour: PALETTE.navy,
  },
  {
    id: "summons-55",
    type: "summons",
    number: 55,
    date: "22nd October 1959",
    meetingDate: "Tuesday 3rd November 1959",
    venue: "Masonic Hall, Surbiton",
    wm: "W. Bro. Walter Joseph Green, P.P.G.D.",
    ipm: "W. Bro. R. G. Batten",
    secretary: "G. N. Mills",
    keyBusiness: [
      "Investment of W. Bro. A. H. Ley, P.A.G.S.Wks. as Almoner",
      "Passing of Bro. H. E. Gibbs to the Second Degree",
      "Reading of the Lodge Bye-Laws",
      "Receipt of Almoner's Report",
      "Report on Grand Lodge Communications",
    ],
    officers: [
      { name: "Bro. H. Cohen, B.Sc.", role: "S.W." },
      { name: "Bro. J. Humphries", role: "J.W." },
      { name: "W. Bro. A. J. Huntingford", role: "Chaplain" },
      { name: "W. Bro. H. C. Felmingham, P.P.G.D.", role: "Treasurer" },
      { name: "Bro. G. N. Mills, A.A.C.C.A.", role: "Secretary" },
      { name: "W. Bro. R. B. Seaman, P.P.G.St.B.", role: "D.C." },
      { name: "Bro. S. J. H. C. Harrison", role: "S.D." },
      { name: "Bro. V. E. Wick", role: "J.D." },
      { name: "W. Bro. F. T. Butt", role: "A.D.C." },
      { name: "W. Bro. A. H. Ley, F.R.I.B.A., P.A.G.S.Wks.", role: "Almoner" },
      { name: "W. Bro. F. H. Green", role: "Asst. Secretary" },
      { name: "Bro. E. F. G. Hills", role: "I.G." },
      { name: "Bro. R. H. Kidman", role: "Steward" },
      { name: "Bro. K. C. Thayne", role: "Steward" },
      { name: "Bro. S. C. Turner", role: "Steward" },
      { name: "Bro. G. Kenyon", role: "Steward" },
      { name: "Bro. S. L. Mullins", role: "Steward" },
      { name: "Bro. W. H. Butler", role: "Tyler" },
    ],
    charityRep: "W. Bro. R. Edmonds, M.B.E., P.G.St.B., P.P.G.W.",
    notes: "Harry E. Gibbs — passed here to the Second Degree in November 1959, raised to the Third in early 1960, and President of the Lodge's Ladies' Festival just nine years later. His progression through these pages is one of the quiet narrative threads running through the archive.",
    colour: PALETTE.navy,
  },
  {
    id: "summons-57",
    type: "summons",
    number: 57,
    date: "18th January 1960",
    meetingDate: "Tuesday 2nd February 1960",
    venue: "Masonic Hall, Surbiton",
    wm: "W. Bro. Walter Joseph Green, P.P.G.D.",
    ipm: "W. Bro. R. G. Batten",
    secretary: "G. N. Mills",
    keyBusiness: [
      "Ballot to initiate Mr Graham Stuart Turner, Sales Representative, George Newnes & Son Ltd — born 13th October 1935",
      "Raising of Bro. H. E. Gibbs to the Third Degree",
      "Report on Grand Lodge Communications",
      "Circulation of the Charity Box",
    ],
    officers: [
      { name: "Bro. H. Cohen, B.Sc.", role: "S.W." },
      { name: "Bro. J. Humphries", role: "J.W." },
      { name: "W. Bro. A. J. Huntingford", role: "Chaplain" },
      { name: "W. Bro. H. C. Felmingham, P.P.G.D.", role: "Treasurer" },
      { name: "Bro. G. N. Mills, A.A.C.C.A.", role: "Secretary" },
      { name: "W. Bro. R. B. Seaman, P.P.G.St.B.", role: "D.C." },
      { name: "Bro. S. J. H. C. Harrison", role: "S.D." },
      { name: "Bro. V. E. Wick", role: "J.D." },
      { name: "W. Bro. F. T. Butt", role: "A.D.C." },
      { name: "W. Bro. A. H. Ley, F.R.I.B.A., P.A.G.S.Wks.", role: "Almoner" },
      { name: "W. Bro. F. H. Green", role: "Asst. Secretary" },
      { name: "Bro. E. F. G. Hills", role: "I.G." },
      { name: "Bro. R. H. Kidman", role: "Steward" },
      { name: "Bro. K. C. Thayne", role: "Steward" },
      { name: "Bro. S. C. Turner", role: "Steward" },
      { name: "Bro. G. Kenyon", role: "Steward" },
      { name: "Bro. S. L. Mullins", role: "Steward" },
      { name: "Bro. W. H. Butler", role: "Tyler" },
    ],
    charityRep: "W. Bro. R. Edmonds, M.B.E., P.G.St.B., P.P.G.W.",
    notes: "The Officers' Night that season was announced for Monday 1st February 1960 at the Conservative Club, Church Street, Weybridge — the evening before this meeting. The Lodge of Instruction (the Noel Money Lodge) met Monday evenings at the same venue, with W. Bro. H. E. H. Boyle as Secretary.",
    colour: PALETTE.navy,
  },
  {
    id: "summons-65",
    type: "summons",
    number: 65,
    date: "26th October 1961",
    meetingDate: "Tuesday 7th November 1961",
    venue: "Masonic Hall, Surbiton",
    wm: "W. Bro. John Humphries",
    ipm: "W. Bro. H. Cohen, B.Sc.",
    secretary: "R. G. Batten",
    keyBusiness: [
      "Ballot to initiate Mr Eric Walter John Aldridge, Civil Servant, E.M.I. Electronics Ltd. (address redacted for privacy) — born 9th July 1914, proposed by Bro. S. L. Mullins, seconded by W. Bro. A. J. Huntingford",
      "Report on Grand Lodge Communications",
      "Circulation of the Charity Box",
    ],
    officers: [
      { name: "Bro. G. N. Mills, F.A.C.C.A., P.P.G.Stwd.", role: "S.W." },
      { name: "Bro. S. J. H. C. Harrison", role: "J.W." },
      { name: "W. Bro. A. J. Huntingford", role: "Chaplain" },
      { name: "W. Bro. H. C. Felmingham, P.P.G.D.", role: "Treasurer" },
      { name: "W. Bro. R. G. Batten, F.R.I.C.S.", role: "Secretary" },
      { name: "W. Bro. F. T. Butt, P.P.A.G.D.C.", role: "D.C." },
      { name: "Bro. V. E. Wick", role: "S.D." },
      { name: "Bro. E. F. G. Hills", role: "J.D." },
      { name: "W. Bro. F. A. Edmonds", role: "A.D.C." },
      { name: "W. Bro. A. H. Ley, F.R.I.B.A., P.A.G.S.Wks.", role: "Almoner" },
      { name: "W. Bro. F. H. Green, P.P.A.G.D.C. (Middx.)", role: "Asst. Secretary" },
      { name: "Bro. S. C. Turner", role: "I.G." },
      { name: "Bro. R. H. Kidman", role: "Steward" },
      { name: "Bro. G. K. Kenyon", role: "Steward" },
      { name: "Bro. S. L. Mullins", role: "Steward" },
      { name: "Bro. H. R. Holyer", role: "Steward" },
      { name: "Bro. W. H. Butler", role: "Tyler" },
    ],
    charityRep: "W. Bro. R. Edmonds, M.B.E., P.G.St.B., P.P.G.W.",
    notes: "The Members of the Lodge register in this summons runs back to the nine Founders of 1949 — a complete membership roll with addresses and dates (addresses redacted for privacy in this presentation). Note R. G. Batten, previously Secretary under W. J. Green: as with several Secretaries in this period, his home address also served as the Lodge's correspondence address — a reminder that the Lodge had no permanent premises of its own at this stage.",
    colour: PALETTE.navy,
  },
  {
    id: "summons-66",
    type: "summons",
    number: 66,
    date: "21st December 1961",
    meetingDate: "Tuesday 2nd January 1962",
    venue: "Masonic Hall, Surbiton",
    wm: "W. Bro. John Humphries",
    ipm: "W. Bro. H. Cohen, B.Sc.",
    secretary: "R. G. Batten",
    keyBusiness: [
      "Ballot to initiate Mr John Albert Ladd, Schoolmaster, Finnart House School (address redacted for privacy) — born 2nd September 1917, proposed by W. Bro. H. Cohen, seconded by Bro. S. S. Whitfield",
      "Passing of Bro. E. W. J. Aldridge to the Second Degree",
      "Reading of the Lodge Bye-Laws",
      "Report on Grand Lodge Communications",
    ],
    officers: [
      { name: "Bro. G. N. Mills, F.A.C.C.A., P.P.G.Stwd.", role: "S.W." },
      { name: "Bro. S. J. H. C. Harrison", role: "J.W." },
      { name: "W. Bro. A. J. Huntingford", role: "Chaplain" },
      { name: "W. Bro. H. C. Felmingham, P.P.G.D.", role: "Treasurer" },
      { name: "W. Bro. R. G. Batten, F.R.I.C.S.", role: "Secretary" },
      { name: "W. Bro. F. T. Butt, P.P.A.G.D.C.", role: "D.C." },
      { name: "Bro. V. E. Wick", role: "S.D." },
      { name: "Bro. E. F. G. Hills", role: "J.D." },
      { name: "W. Bro. F. A. Edmonds", role: "A.D.C." },
      { name: "W. Bro. A. H. Ley, F.R.I.B.A., P.A.G.S.Wks.", role: "Almoner" },
      { name: "W. Bro. F. H. Green, P.P.A.G.D.C. (Middx.)", role: "Asst. Secretary" },
      { name: "Bro. S. C. Turner", role: "I.G." },
      { name: "Bro. R. H. Kidman", role: "Steward" },
      { name: "Bro. G. K. Kenyon", role: "Steward" },
      { name: "Bro. S. L. Mullins", role: "Steward" },
      { name: "Bro. H. R. Holyer", role: "Steward" },
      { name: "Bro. W. H. Butler", role: "Tyler" },
    ],
    charityRep: "W. Bro. R. Edmonds, M.B.E., P.G.St.B., P.P.G.W.",
    notes: "The most consecutive pair in the archive: Summons No. 65 and No. 66 are just two months apart. Aldridge — balloted and initiated in November — is already being passed to the Second Degree here in January. The next regular meeting was announced for Tuesday 6th February 1962.",
    colour: PALETTE.navy,
  },
  {
    id: "festival-1969",
    type: "festival",
    number: null,
    date: "Friday 21st November 1969",
    wm: "W. Bro. Harry E. Gibbs",
    ipm: "W. Bro. Harold R. Holyer",
    president: "W. Bro. H. E. Gibbs",
    committee: [
      "W. Bro. G. N. Mills",
      "W. Bro. E. F. G. Hills",
      "Bro. C. Crook (Festival Secretary)",
    ],
    toastmaster: "Bro. Norman Caley",
    menu: [
      "Prawn Cocktail",
      "Cream of Asparagus",
      "Roast Aylesbury Duckling — Orange and Brandy Sauce, Chateau and Parsley Potatoes, Garden Peas",
      "Meringue Glacé",
      "Coffee",
    ],
    toasts: [
      { toast: "Her Majesty The Queen", proposedBy: "The President" },
      { toast: "The Ladies", proposedBy: "Bro. R. H. Kidman", response: "Mrs. Jessie Gibbs" },
      { toast: "The President", proposedBy: "W. Bro. Harold Holyer", response: "W. Bro. Harry Gibbs" },
    ],
    entertainment: [
      "Dancing to Bert Giddings and his Music — M.C.: Bro. Bert Giddings",
      "Cabaret: Norman Caley, Bridie Devon, Margaret White — presented by Mrs. Margery L. White Jr.",
      "Auld Lang Syne — 1 a.m.",
      "National Anthem",
    ],
    officers: [
      { name: "Bro. G. S. Turner", role: "S.W." },
      { name: "Bro. E. W. J. Aldridge", role: "J.W." },
      { name: "W. Bro. E. F. G. Hills", role: "Chaplain" },
      { name: "Bro. R. H. Kidman", role: "Treasurer" },
      { name: "W. Bro. S. C. Turner", role: "Secretary" },
      { name: "W. Bro. F. A. Edmonds, P.P.A.G.D.C.", role: "D.C." },
      { name: "Bro. J. A. Yates", role: "S.D." },
      { name: "Bro. C. Crook", role: "J.D." },
      { name: "W. Bro. V. E. T. Wick", role: "A.D.C." },
      { name: "W. Bro. H. Cohen, O.B.E., B.Sc., P.P.G.D.", role: "Almoner" },
      { name: "Bro. N. E. Taylor", role: "I.G." },
      { name: "Bro. H. R. Roach", role: "Steward" },
      { name: "Bro. J. A. Ladd", role: "Steward" },
      { name: "Bro. R. A. Gardner", role: "Steward" },
      { name: "Bro. E. C. Walker", role: "Steward" },
      { name: "Bro. T. W. Laffey", role: "Steward" },
      { name: "W. Bro. T. W. J. Regan, P.P.G.W.", role: "Steward" },
      { name: "Bro. N. E. Taylor", role: "Tyler" },
      { name: "Bro. S. S. Whitfield", role: "Charity Representative" },
      { name: "", role: "Organist" },
    ],
    notes: "By 1969, Harry Gibbs — passed to the Second Degree in November 1959 and raised here in February 1960 — presides as President over the Lodge's Ladies' Festival. His response toast is proposed by Harold Holyer, who appears in these pages as a Steward in 1961 and would become Immediate Past Master by this same evening.",
    colour: "#7B3F3F",
  },
];

const masters = [
  { years: "1949", name: "W. Bro. Roy Edmonds, M.B.E., P.G.St.B.", note: "Founder & First Master" },
  { years: "1950/51", name: "W. Bro. E. G. Stacey" },
  { years: "1951/52", name: "W. Bro. L. Lake, P.P.A.G.D.C." },
  { years: "1952/53", name: "W. Bro. F. T. Butt, P.P.A.G.D.C." },
  { years: "1953/54", name: "W. Bro. L. T. Anstead" },
  { years: "1954/55", name: "W. Bro. H. E. H. Boyle" },
  { years: "1955/56", name: "W. Bro. G. H. Knevett" },
  { years: "1956/57", name: "W. Bro. F. A. Edmonds" },
  { years: "1957/58", name: "W. Bro. A. J. Huntingford" },
  { years: "1958/59", name: "W. Bro. R. G. Batten, F.R.I.C.S." },
  { years: "1959/60", name: "W. Bro. W. J. Green, P.P.G.D." },
  { years: "1960/61", name: "W. Bro. H. Cohen, B.Sc." },
  { years: "1961/62", name: "W. Bro. J. Humphries" },
];

function SummonsCard({ doc, isOpen, onToggle }: { doc: SummonsDoc; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{
      marginBottom: "2rem",
      background: PALETTE.cream,
      border: `1px solid ${PALETTE.sepiaLight}`,
      borderLeft: `4px solid ${PALETTE.navy}`,
      boxShadow: "2px 4px 16px rgba(28,41,75,0.07)",
      position: "relative",
    }}>
      <div style={{
        background: PALETTE.navy,
        padding: "1.25rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        cursor: "pointer",
      }} onClick={onToggle}>
        <div>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: PALETTE.goldLight,
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "0.35rem",
          }}>
            Province of Surrey — Weybridge Lodge No. 6787
          </div>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: PALETTE.cream,
            fontSize: "1.1rem",
            fontWeight: "normal",
            letterSpacing: "0.02em",
          }}>
            Summons No. {doc.number} &nbsp;·&nbsp; {doc.date}
          </div>
          <div style={{
            color: PALETTE.sepiaLight,
            fontSize: "0.8rem",
            marginTop: "0.3rem",
            fontStyle: "italic",
          }}>
            Meeting: {doc.meetingDate} &nbsp;·&nbsp; {doc.venue}
          </div>
        </div>
        <div style={{
          color: PALETTE.goldLight,
          fontSize: "1.2rem",
          marginTop: "0.25rem",
          userSelect: "none",
          minWidth: "1.5rem",
          textAlign: "right",
        }}>
          {isOpen ? "−" : "+"}
        </div>
      </div>

      <div style={{ padding: "1rem 1.5rem 0.75rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem 2rem",
          fontSize: "0.82rem",
          color: PALETTE.ink,
        }}>
          <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>Worshipful Master</span><br />{doc.wm}</div>
          {doc.ipm && <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>Immediate Past Master</span><br />{doc.ipm}</div>}
          {doc.masterElect && <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>Master Elect</span><br />{doc.masterElect}</div>}
          <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>Secretary</span><br />{doc.secretary}</div>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "0 1.5rem 1.5rem" }}>
          <div style={{ borderTop: `1px solid ${PALETTE.vellumDark}`, paddingTop: "1rem", marginTop: "0.5rem" }}>
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                color: PALETTE.navy,
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.6rem",
              }}>Agenda — Principal Business</div>
              {doc.keyBusiness.map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginBottom: "0.4rem",
                  fontSize: "0.82rem",
                  color: PALETTE.ink,
                  lineHeight: "1.5",
                }}>
                  <span style={{ color: PALETTE.gold, flexShrink: 0, fontFamily: "monospace", marginTop: "0.05rem" }}>{i + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                color: PALETTE.navy,
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.6rem",
              }}>Officers of the Lodge</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "0.25rem 1rem",
              }}>
                {doc.officers.map((o, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.78rem",
                    color: PALETTE.ink,
                    padding: "0.2rem 0",
                    borderBottom: `1px solid ${PALETTE.vellumDark}`,
                  }}>
                    <span>{o.name}</span>
                    <span style={{ color: PALETTE.sepia, flexShrink: 0, marginLeft: "0.5rem", fontStyle: "italic" }}>{o.role}</span>
                  </div>
                ))}
              </div>
              {doc.charityRep && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: PALETTE.sepia, fontStyle: "italic" }}>
                  Charity Representative: {doc.charityRep}
                </div>
              )}
            </div>

            {doc.notes && (
              <div style={{
                background: PALETTE.vellum,
                borderLeft: `3px solid ${PALETTE.gold}`,
                padding: "0.75rem 1rem",
                fontSize: "0.8rem",
                color: PALETTE.sepia,
                fontStyle: "italic",
                lineHeight: "1.6",
              }}>
                {doc.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FestivalCard({ doc, isOpen, onToggle }: { doc: FestivalDoc; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{
      marginBottom: "2rem",
      background: "#FDF8F5",
      border: `1px solid #C4A882`,
      borderLeft: `4px solid #7B3F3F`,
      boxShadow: "2px 4px 20px rgba(123,63,63,0.10)",
    }}>
      <div style={{
        background: "#7B3F3F",
        padding: "1.25rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        cursor: "pointer",
      }} onClick={onToggle}>
        <div>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#D4AF6A",
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "0.35rem",
          }}>
            Weybridge Lodge No. 6787
          </div>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: PALETTE.cream,
            fontSize: "1.2rem",
            fontStyle: "italic",
          }}>
            Ladies' Festival
          </div>
          <div style={{
            color: "#C4A882",
            fontSize: "0.8rem",
            marginTop: "0.3rem",
          }}>
            {doc.date}
          </div>
        </div>
        <div style={{ color: "#D4AF6A", fontSize: "1.2rem", marginTop: "0.25rem", userSelect: "none" }}>
          {isOpen ? "−" : "+"}
        </div>
      </div>

      <div style={{ padding: "1rem 1.5rem 0.75rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 2rem", fontSize: "0.82rem", color: PALETTE.ink }}>
          <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>President</span><br />{doc.president}</div>
          <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>Worshipful Master</span><br />{doc.wm}</div>
          <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>Toastmaster</span><br />{doc.toastmaster}</div>
          <div><span style={{ color: PALETTE.sepia, fontVariant: "small-caps" }}>Immediate Past Master</span><br />{doc.ipm}</div>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "0 1.5rem 1.5rem" }}>
          <div style={{ borderTop: `1px solid #E8D5B7`, paddingTop: "1rem", marginTop: "0.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#7B3F3F", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Menu</div>
                <div style={{ fontSize: "0.78rem", color: PALETTE.ink, fontStyle: "italic", lineHeight: "1.8" }}>
                  <div style={{ color: PALETTE.sepia, marginBottom: "0.25rem", fontSize: "0.7rem" }}>"Eat, drink and be merry…"</div>
                  {doc.menu.map((item, i) => (
                    <div key={i} style={{ marginBottom: "0.25rem" }}>{item}</div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#7B3F3F", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Toasts</div>
                {doc.toasts.map((t, i) => (
                  <div key={i} style={{ marginBottom: "0.6rem", fontSize: "0.78rem" }}>
                    <div style={{ fontStyle: "italic", color: PALETTE.ink }}>{t.toast}</div>
                    <div style={{ color: PALETTE.sepia }}>Proposed: {t.proposedBy}{t.response ? ` · Response: ${t.response}` : ""}</div>
                  </div>
                ))}

                <div style={{ marginTop: "1rem", fontFamily: "Georgia, 'Times New Roman', serif", color: "#7B3F3F", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Evening</div>
                {doc.entertainment.map((e, i) => (
                  <div key={i} style={{ fontSize: "0.78rem", color: PALETTE.ink, marginBottom: "0.25rem", fontStyle: "italic" }}>{e}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#7B3F3F", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Officers of the Lodge 1969–70</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.25rem 1rem" }}>
                {doc.officers.filter(o => o.name).map((o, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: PALETTE.ink, padding: "0.2rem 0", borderBottom: `1px solid #E8D5B7` }}>
                    <span>{o.name}</span>
                    <span style={{ color: PALETTE.sepia, flexShrink: 0, marginLeft: "0.5rem", fontStyle: "italic" }}>{o.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#7B3F3F", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Festival Committee</div>
              {doc.committee.map((m, i) => (
                <div key={i} style={{ fontSize: "0.82rem", color: PALETTE.ink, marginBottom: "0.2rem" }}>{m}</div>
              ))}
            </div>

            {doc.notes && (
              <div style={{ background: "#F5EDE3", borderLeft: "3px solid #B8962E", padding: "0.75rem 1rem", fontSize: "0.8rem", color: PALETTE.sepia, fontStyle: "italic", lineHeight: "1.6" }}>
                {doc.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeritageArchive() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setOpenDoc(prev => prev === id ? null : id);
  };

  return (
    <div style={{
      background: PALETTE.vellum,
      minHeight: "100vh",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: PALETTE.ink,
    }}>
      <div style={{
        background: PALETTE.navy,
        padding: "4rem 2rem 3rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ color: PALETTE.gold, fontSize: "1.1rem", letterSpacing: "0.6em", marginBottom: "1.5rem" }}>
          ✦ &nbsp; ✦ &nbsp; ✦
        </div>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: PALETTE.goldLight,
          fontSize: "0.75rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          marginBottom: "0.75rem",
        }}>
          Province of Surrey · Consecrated 19th January 1949
        </div>
        <h1 style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: PALETTE.cream,
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: "normal",
          margin: "0 0 0.5rem",
          lineHeight: "1.2",
        }}>
          Weybridge Lodge No. 6787
        </h1>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: PALETTE.goldLight,
          fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
          fontStyle: "italic",
          marginBottom: "2rem",
        }}>
          A Record in Seven Documents, 1954–1969
        </div>
        <div style={{ color: PALETTE.gold, fontSize: "1.1rem", letterSpacing: "0.6em" }}>
          ✦ &nbsp; ✦ &nbsp; ✦
        </div>
      </div>

      <div style={{
        maxWidth: "780px",
        margin: "0 auto",
        padding: "3rem 2rem",
      }}>
        <div style={{
          borderTop: `1px solid ${PALETTE.sepiaLight}`,
          borderBottom: `1px solid ${PALETTE.sepiaLight}`,
          padding: "2rem 0",
          marginBottom: "3rem",
        }}>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: PALETTE.navy,
            fontSize: "0.7rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
          }}>
            Curator's Introduction
          </div>
          <p style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(1rem, 2vw, 1.15rem)",
            lineHeight: "1.8",
            color: PALETTE.ink,
            margin: "0 0 1rem",
          }}>
            Seven documents, the earliest from 1954 and the latest from 1969, trace fifteen years in the life of Weybridge Lodge No. 6787. They were never intended as archive pieces.
          </p>
          <p style={{
            fontSize: "0.9rem",
            lineHeight: "1.8",
            color: PALETTE.sepia,
            margin: "0 0 1rem",
          }}>
            A summons was a working paper — sent out, read, folded into a pocket, and very often discarded once the meeting had passed. That so many survive, in such legible condition, is itself worth noting: someone thought them worth keeping. We continue that act of care here.
          </p>
          <p style={{
            fontSize: "0.9rem",
            lineHeight: "1.8",
            color: PALETTE.sepia,
            margin: "0",
          }}>
            Together these papers form something more valuable than any single artefact: a continuous thread. The same hands appear again and again under different titles — Secretary becomes Worshipful Master, Steward becomes Treasurer, candidate becomes Past Master. Read in sequence, they show a Lodge governing itself, year on year, exactly as it was consecrated to do.
          </p>
        </div>

        <div style={{ marginBottom: "3rem" }}>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: PALETTE.navy,
            fontSize: "0.7rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
            <span>Worshipful Masters 1949–1962</span>
            <div style={{ flex: 1, height: "1px", background: PALETTE.sepiaLight }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 0, minWidth: "600px" }}>
              {masters.map((m, i) => (
                <div key={i} style={{
                  flex: 1,
                  borderLeft: i === 0 ? `2px solid ${PALETTE.gold}` : "none",
                  borderTop: `2px solid ${PALETTE.gold}`,
                  borderRight: `2px solid ${PALETTE.gold}`,
                  padding: "0.6rem 0.5rem 0.5rem",
                  background: i % 2 === 0 ? PALETTE.cream : PALETTE.vellum,
                  position: "relative",
                }}>
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: "0.6rem",
                    color: PALETTE.gold,
                    marginBottom: "0.3rem",
                    letterSpacing: "0.05em",
                  }}>{m.years}</div>
                  <div style={{
                    fontSize: "0.65rem",
                    color: PALETTE.navy,
                    lineHeight: "1.3",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}>{m.name.replace("W. Bro. ", "")}</div>
                  {m.note && (
                    <div style={{ fontSize: "0.58rem", color: PALETTE.sepia, fontStyle: "italic", marginTop: "0.2rem" }}>{m.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: PALETTE.sepia, fontStyle: "italic", marginTop: "0.6rem" }}>
            Reconstructed from the Members of the Lodge registers contained in the summonses below.
          </div>
        </div>

        <div>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: PALETTE.navy,
            fontSize: "0.7rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
            <span>The Documents</span>
            <div style={{ flex: 1, height: "1px", background: PALETTE.sepiaLight }} />
            <span style={{ color: PALETTE.sepia, fontSize: "0.65rem", fontFamily: "monospace" }}>Select any to expand</span>
          </div>

          {documents.map(doc => doc.type === "summons" ? (
            <SummonsCard
              key={doc.id}
              doc={doc}
              isOpen={openDoc === doc.id}
              onToggle={() => handleToggle(doc.id)}
            />
          ) : (
            <FestivalCard
              key={doc.id}
              doc={doc}
              isOpen={openDoc === doc.id}
              onToggle={() => handleToggle(doc.id)}
            />
          ))}
        </div>

        <div style={{
          borderTop: `1px solid ${PALETTE.sepiaLight}`,
          paddingTop: "2rem",
          marginTop: "1rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          fontSize: "0.78rem",
          color: PALETTE.sepia,
          lineHeight: "1.7",
        }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", color: PALETTE.navy, fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>A Note on These Records</div>
            <p style={{ margin: 0 }}>
              These pages are reproduced as a record for the Lodge and its members. Personal addresses and telephone numbers from the original summonses have been omitted in this presentation, as some named individuals may have living family connections. The original documents remain in private keeping.
            </p>
          </div>
          <div>
            <div style={{ fontFamily: "Georgia, serif", color: PALETTE.navy, fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Can You Add to This Archive?</div>
            <p style={{ margin: 0 }}>
              The summonses held here are No. 29, 33, 55, 57, 65, and 66 — a discontinuous run across thirteen years. If any member holds further summonses, festival programmes, photographs, or correspondence from the Lodge's history, we would be glad to hear from you.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "2rem 0 1rem", color: PALETTE.sepiaLight, fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          Weybridge Lodge No. 6787 · Province of Surrey · Consecrated 19th January 1949
        </div>
      </div>
    </div>
  );
}
