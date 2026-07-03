import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { sanityClient, urlFor } from "@/lib/sanity";

// ─────────────────────────────────────────────────────────────────────
// Sanity types + query
// ─────────────────────────────────────────────────────────────────────

type SanityImageRef = { asset?: { _ref?: string; url?: string } };

type HeritageDoc = {
  _id: string;
  title: string;
  date?: string;
  category: "summons" | "programme" | "photograph" | "other";
  description?: string;
  transcription?: PortableTextBlock[];
  thumbnailImage?: SanityImageRef;
  documentFile?: { asset?: { url?: string } };
  documentPages?: SanityImageRef[];
  displayOrder?: number;
};

const HERITAGE_QUERY = `*[_type == "heritageDocument"] | order(displayOrder asc, date asc) {
  _id,
  title,
  date,
  category,
  description,
  transcription,
  thumbnailImage,
  documentFile { asset->{url} },
  documentPages[]{ asset->{url} },
  displayOrder
}`;

// ─────────────────────────────────────────────────────────────────────
// Static Worshipful Masters strip (unchanged — sourced from the summons registers)
// ─────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<HeritageDoc["category"], string> = {
  summons: "Summons",
  programme: "Programme",
  photograph: "Photograph",
  other: "Document",
};

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function DocumentCard({
  doc,
  isOpen,
  onToggle,
}: {
  doc: HeritageDoc;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const headingId = `${doc._id}-heading`;
  const thumbUrl = doc.thumbnailImage
    ? (() => {
        try {
          return urlFor(doc.thumbnailImage).width(320).height(320).fit("crop").auto("format").url();
        } catch {
          return null;
        }
      })()
    : null;
  const pdfUrl = doc.documentFile?.asset?.url;
  const pages = (doc.documentPages || [])
    .map((p) => {
      try {
        return urlFor(p).width(1400).auto("format").url();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u));

  return (
    <article className="mb-8 border border-border border-l-4 border-l-navy bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${doc._id}-panel`}
        className="flex w-full items-start justify-between gap-4 bg-navy px-6 py-5 text-left"
      >
        <div className="flex gap-4">
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt=""
              className="hidden h-16 w-16 flex-shrink-0 rounded-sm border border-gold/40 object-cover sm:block"
              loading="lazy"
            />
          )}
          <div>
            <p className="font-serif text-[0.7rem] uppercase tracking-[0.2em] text-gold">
              Province of Surrey — {CATEGORY_LABEL[doc.category]}
            </p>
            <h3 id={headingId} className="font-serif text-lg text-background">
              {doc.title}
            </h3>
            {doc.date && (
              <p className="font-sans text-sm italic text-gold/80">{formatDate(doc.date)}</p>
            )}
          </div>
        </div>
        <span aria-hidden="true" className="mt-1 min-w-[1.5rem] text-right text-lg text-gold">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {doc.description && (
        <div className="px-6 pt-4">
          <p className="font-sans text-sm leading-relaxed text-foreground">{doc.description}</p>
        </div>
      )}

      {isOpen && (
        <div id={`${doc._id}-panel`} role="region" aria-labelledby={headingId} className="px-6 pb-6">
          <div className="mt-4 border-t border-border pt-4 space-y-6">
            {doc.transcription && doc.transcription.length > 0 && (
              <section className="font-sans text-sm leading-relaxed text-foreground [&_p]:mb-3 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-xs [&_h2]:uppercase [&_h2]:tracking-[0.15em] [&_h2]:text-navy [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-serif [&_h3]:text-sm [&_h3]:text-navy [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                <PortableText value={doc.transcription} />
              </section>
            )}

            {pdfUrl && (
              <section>
                <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                  Scanned Document
                </h4>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-gold bg-navy px-4 py-2 font-sans text-sm text-background transition-opacity hover:opacity-90"
                >
                  <FileText size={16} aria-hidden="true" />
                  View PDF
                </a>
              </section>
            )}

            {!pdfUrl && pages.length > 0 && (
              <section>
                <h4 className="mb-2 font-serif text-xs uppercase tracking-[0.15em] text-navy">
                  Scanned Pages
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {pages.map((u, i) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-border bg-background"
                    >
                      <img src={u} alt={`${doc.title} — page ${i + 1}`} className="w-full" loading="lazy" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────

export default function HeritageArchive() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const handleToggle = (id: string) => setOpenDoc((prev) => (prev === id ? null : id));

  const { data: documents, isLoading, isError } = useQuery({
    queryKey: ["heritage-documents"],
    queryFn: () => sanityClient.fetch<HeritageDoc[]>(HERITAGE_QUERY),
    staleTime: 5 * 60 * 1000,
  });

  const docs = documents ?? [];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <SEO
        title="Heritage Archive"
        description="Archival summons, historic records and founding heritage of Weybridge Lodge No. 6787, Freemasons meeting at Guildford Masonic Centre since 1949."
        canonical="/heritage"
        type="article"
        schema={archiveSchema}
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

            {isLoading && (
              <p className="py-8 text-center font-sans text-sm italic text-muted-foreground">
                Loading archive…
              </p>
            )}
            {isError && (
              <p className="py-8 text-center font-sans text-sm italic text-muted-foreground">
                Unable to load archive documents. Please try again shortly.
              </p>
            )}
            {!isLoading && !isError && docs.length === 0 && (
              <p className="py-8 text-center font-sans text-sm italic text-muted-foreground">
                No archive documents have been published yet.
              </p>
            )}

            {docs.map((doc) => (
              <DocumentCard
                key={doc._id}
                doc={doc}
                isOpen={openDoc === doc._id}
                onToggle={() => handleToggle(doc._id)}
              />
            ))}
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

          <nav aria-label="Continue exploring" className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/history"
              className="flex w-full items-center justify-center gap-2 border border-gold bg-navy px-6 py-3 font-serif text-sm tracking-wide text-background transition-opacity hover:opacity-90 sm:w-auto"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Our History
            </Link>
            <Link
              to="/lodge-profile"
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
