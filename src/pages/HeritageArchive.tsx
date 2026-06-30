import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

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
    ],
    notes: "By 1969, Harry Gibbs — passed to the Second Degree in November 1959 and raised here in February 1960 — presides as President over the Lodge's Ladies' Festival. His response toast is proposed by Harold Holyer, who appears in these pages as a Steward in 1961 and would become Immediate Past Master by this same evening.",
  },
];

const masters = [
  { years: "1949", name: "Roy Edmonds, M.B.E., P.G.St.B.", note: "Founder & First Master" },
  { years: "1950/51", name: "E. G. Stacey" },
  { years: "1951/52", name: "L. Lake, P.P.A.G.D.C." },
  { years: "1952/53", name: "F. T. Butt, P.P.A.G.D.C." },
  { years: "1953/54", name: "L. T. Anstead" },
  { years: "1954/55", name: "H. E. H. Boyle" },
  { years: "1955/56", name: "G. H. Knevett" },
  { years: "1956/57", name: "F. A. Edmonds" },
  { years: "1957/58", name: "A. J. Huntingford" },
  { years: "1958/59", name: "R. G. Batten, F.R.I.C.S." },
  { years: "1959/60", name: "W. J. Green, P.P.G.D." },
  { years: "1960/61", name: "H. Cohen, B.Sc." },
  { years: "1961/62", name: "J. Humphries" },
];

/* JSON-LD reflects what this page actually is: a CreativeWork describing
   the lodge's historical archive. No address/geo claims are made here —
   that schema belongs on the contact/profile page where it's accurate. */
const archiveSchema = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "Weybridge Lodge No. 6787 — A Record in Seven Documents, 1954–1969",
  description:
    "A digitised archive of six lodge summonses and a Ladies' Festival programme from Weybridge Lodge No. 6787, Province of Surrey, spanning 1954 to 1969.",
  about: {
    "@type": "Organization",
    name: "Weybridge Lodge No. 6787",
    foundingDate: "1949-01-19",
  },
  temporalCoverage: "1954/1969",
};

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <br />
      <span className="font-sans text-sm text-foreground">{value}</span>
    </div>
  );
}

function SummonsCard({
  doc,
  isOpen,
  onToggle,
}: {
  doc: SummonsDoc;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const headingId = `${doc.id}-heading`;
  return (
    <article className="mb-8 border border-border border-l-4 border-l-navy bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${doc.id}-panel`}
        className="flex w-full items-start justify-between gap-4 bg-navy px-6 py-5 text-left"
      >
        <div>
          <p className="font-serif text-[0.7rem] uppercase tracking-[0.2em] text-gold">
            Province of Surrey — Weybridge Lodge No. 6787
          </p>
          <h3 id={headingId} className="font-serif text-lg text-background">
            Summons No. {doc.number} · {doc.date}
          </h3>
          <p className="font-sans text-sm italic text-gold/80">
            Meeting: {doc.meetingDate} · {doc.venue}
          </p>
        </div>
        <span aria-hidden="true" className="mt-1 min-w-[1.5rem] text-right text-lg text-gold">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      <div className="grid grid-cols-1 gap-2 px-6 pt-4 sm:grid-cols-2 sm:gap-x-8">
        <FieldRow label="Worshipful Master" value={doc.wm} />
        {doc.ipm && <FieldRow label="Immediate Past Master" value={doc.ipm} />}
        {doc.masterElect && <FieldRow label="Master Elect" value={doc.masterElect} />}
        <FieldRow label="Secretary" value={doc.secretary} />
      </div>

      {isOpen && (
        <div id={`${doc.id}-panel`} role="region" aria-labelledby={headingId} className="px-6 pb-6">
          <div className="mt-4 border-t border-border pt-4">
            <section className="mb-5">
              <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                Agenda — Principal Business
              </h4>
              <ol className="space-y-1">
                {doc.keyBusiness.map((item, i) => (
                  <li key={i} className="flex gap-3 font-sans text-sm leading-relaxed text-foreground">
                    <span className="shrink-0 font-mono text-gold">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mb-5">
              <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                Officers of the Lodge
              </h4>
              <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {doc.officers.map((o, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-border py-1 font-sans text-sm text-foreground"
                  >
                    <span>{o.name}</span>
                    <span className="ml-2 shrink-0 italic text-muted-foreground">{o.role}</span>
                  </li>
                ))}
              </ul>
              {doc.charityRep && (
                <p className="mt-2 font-sans text-sm italic text-muted-foreground">
                  Charity Representative: {doc.charityRep}
                </p>
              )}
            </section>

            {doc.notes && (
              <aside className="border-l-2 border-gold bg-background px-4 py-3 font-sans text-sm italic leading-relaxed text-muted-foreground">
                {doc.notes}
              </aside>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function FestivalCard({
  doc,
  isOpen,
  onToggle,
}: {
  doc: FestivalDoc;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const headingId = `${doc.id}-heading`;
  return (
    <article className="mb-8 border border-gold/40 border-l-4 border-l-navy bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${doc.id}-panel`}
        className="flex w-full items-start justify-between gap-4 bg-navy px-6 py-5 text-left"
      >
        <div>
          <p className="font-serif text-[0.7rem] uppercase tracking-[0.2em] text-gold">
            Weybridge Lodge No. 6787
          </p>
          <h3 id={headingId} className="font-serif text-lg italic text-background">
            Ladies' Festival
          </h3>
          <p className="font-sans text-sm text-gold/80">{doc.date}</p>
        </div>
        <span aria-hidden="true" className="mt-1 text-lg text-gold">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      <div className="grid grid-cols-1 gap-2 px-6 pt-4 sm:grid-cols-2 sm:gap-x-8">
        <FieldRow label="President" value={doc.president} />
        <FieldRow label="Worshipful Master" value={doc.wm} />
        <FieldRow label="Toastmaster" value={doc.toastmaster} />
        <FieldRow label="Immediate Past Master" value={doc.ipm} />
      </div>

      {isOpen && (
        <div id={`${doc.id}-panel`} role="region" aria-labelledby={headingId} className="px-6 pb-6">
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <section>
                <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                  Menu
                </h4>
                <p className="mb-1 font-sans text-xs italic text-muted-foreground">
                  "Eat, drink and be merry…"
                </p>
                <ul className="space-y-1 font-sans text-sm italic text-foreground">
                  {doc.menu.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                  Toasts
                </h4>
                <ul className="space-y-2">
                  {doc.toasts.map((t, i) => (
                    <li key={i} className="font-sans text-sm">
                      <p className="italic text-foreground">{t.toast}</p>
                      <p className="text-muted-foreground">
                        Proposed: {t.proposedBy}
                        {t.response ? ` · Response: ${t.response}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>

                <h4 className="mb-2 mt-4 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                  Evening
                </h4>
                <ul className="space-y-1 font-sans text-sm italic text-foreground">
                  {doc.entertainment.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mb-5">
              <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                Officers of the Lodge, 1969
              </h4>
              <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {doc.officers.map((o, i) => (
                  <li
                    key={`${o.name || "organist"}-${i}`}
                    className="flex justify-between border-b border-border py-1 font-sans text-sm text-foreground"
                  >
                    <span>{o.name || "—"}</span>
                    <span className="ml-2 shrink-0 italic text-muted-foreground">{o.role}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-5">
              <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                Festival Committee
              </h4>
              <ul className="font-sans text-sm text-foreground">
                {doc.committee.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </section>

            {doc.notes && (
              <aside className="border-l-2 border-gold bg-background px-4 py-3 font-sans text-sm italic leading-relaxed text-muted-foreground">
                {doc.notes}
              </aside>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function HeritageArchive() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const handleToggle = (id: string) => setOpenDoc((prev) => (prev === id ? null : id));

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <SEO
        title="The Heritage Archive — Weybridge Lodge No. 6787, Freemasons in Surrey"
        description="Six original lodge summonses and a 1969 Ladies' Festival programme from Weybridge Lodge No. 6787 — a Masonic Lodge meeting in Surrey since 1949. Explore the original documents and the brethren who served."
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(archiveSchema) }}
      />
      <Header />

      <main className="flex-1 bg-background text-foreground">
        <section className="bg-navy px-6 py-16 text-center sm:py-20">
          <p aria-hidden="true" className="mb-6 text-lg tracking-[0.6em] text-gold">
            ✦ ✦ ✦
          </p>
          <p className="mb-3 font-serif text-xs uppercase tracking-[0.3em] text-gold">
            Province of Surrey · Consecrated 19th January 1949
          </p>
          <h1 className="mb-2 font-serif text-3xl text-background sm:text-4xl">
            Weybridge Lodge No. 6787
          </h1>
          <p className="mb-8 font-serif text-lg italic text-gold sm:text-xl">
            A Record in Seven Documents, 1954–1969
          </p>
          <p aria-hidden="true" className="text-lg tracking-[0.6em] text-gold">
            ✦ ✦ ✦
          </p>
        </section>

        <div className="mx-auto max-w-3xl px-6 py-12">
          <section className="mb-12 border-y border-border py-8">
            <h2 className="mb-5 font-serif text-xs uppercase tracking-[0.25em] text-navy">
              Curator's Introduction
            </h2>
            <p className="mb-4 font-serif text-lg leading-relaxed text-foreground">
              Seven documents, the earliest from 1954 and the latest from 1969, trace fifteen
              years in the life of Weybridge Lodge No. 6787. They were never intended as
              archive pieces.
            </p>
            <p className="mb-4 font-sans text-sm leading-relaxed text-muted-foreground">
              A summons was a working paper — sent out, read, folded into a pocket, and very
              often discarded once the meeting had passed. That so many survive, in such
              legible condition, is itself worth noting: someone thought them worth keeping.
              We continue that act of care here.
            </p>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              Together these papers form something more valuable than any single artefact: a
              continuous thread. The same hands appear again and again under different titles
              — Secretary becomes Worshipful Master, Steward becomes Treasurer, candidate
              becomes Past Master. Read in sequence, they show a Lodge of Freemasons in Surrey
              governing itself, year on year, exactly as it was consecrated to do.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-5 flex items-center gap-4 font-serif text-xs uppercase tracking-[0.25em] text-navy">
              <span>Worshipful Masters, 1949–1962</span>
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </h2>
            <div className="overflow-x-auto pb-2">
              <ol className="flex min-w-[600px] gap-0">
                {masters.map((m, i) => (
                  <li
                    key={i}
                    className={`flex-1 border-t-2 border-r-2 border-gold px-2 py-2.5 ${
                      i === 0 ? "border-l-2" : ""
                    } ${i % 2 === 0 ? "bg-card" : "bg-background"}`}
                  >
                    <p className="mb-1 font-mono text-[0.6rem] tracking-wide text-gold">
                      {m.years}
                    </p>
                    <p className="font-serif text-[0.65rem] leading-tight text-navy">
                      {m.name}
                    </p>
                    {m.note && (
                      <p className="mt-1 font-sans text-[0.58rem] italic text-muted-foreground">
                        {m.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-2 font-sans text-xs italic text-muted-foreground">
              Reconstructed from the Members of the Lodge registers contained in the summonses
              below.
            </p>
          </section>

          <section>
            <h2 className="mb-6 flex items-center gap-4 font-serif text-xs uppercase tracking-[0.25em] text-navy">
              <span>The Documents</span>
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              <span className="font-mono text-[0.65rem] normal-case tracking-normal text-muted-foreground">
                Select any to expand
              </span>
            </h2>

            {documents.map((doc) =>
              doc.type === "summons" ? (
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
              )
            )}
          </section>

          <section className="mt-2 grid grid-cols-1 gap-8 border-t border-border pt-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                A Note on These Records
              </h3>
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                These pages are reproduced as a record for the Lodge and its members. Personal
                addresses and telephone numbers from the original summonses have been omitted
                in this presentation, as some named individuals may have living family
                connections. The original documents remain in private keeping.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                Can You Add to This Archive?
              </h3>
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                The summonses held here are No. 29, 33, 55, 57, 65, and 66 — a discontinuous
                run across thirteen years. If any member holds further summonses, festival
                programmes, photographs, or correspondence from the Lodge's history, we would
                be glad to hear from you.
              </p>
            </div>
          </section>

          {/* Two quiet, appropriately-scoped next steps rather than a sales CTA.
              Both route to existing pages — no destination is invented. */}
          <nav aria-label="Continue exploring" className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/history"
              className="flex w-full items-center justify-center gap-2 border border-gold bg-navy px-6 py-3 font-serif text-sm tracking-wide text-background transition-opacity hover:opacity-90 sm:w-auto"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Our History
            </Link>
            <Link
              to="/about/lodge-profile"
              className="flex w-full items-center justify-center gap-2 border border-border bg-card px-6 py-3 font-serif text-sm tracking-wide text-navy transition-opacity hover:opacity-90 sm:w-auto"
            >
              Meet the Lodge Today
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </nav>

          <p className="px-0 pb-2 pt-8 text-center font-sans text-xs tracking-wide text-muted-foreground">
            Weybridge Lodge No. 6787 · Province of Surrey · Consecrated 19th January 1949
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
