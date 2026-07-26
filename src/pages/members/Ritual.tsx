import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Download, Loader2, ShieldCheck, Clock, ExternalLink, FileText, Video, Music, Search } from "lucide-react";
import { toast } from "sonner";

type Degree = "entered_apprentice" | "fellow_craft" | "master_mason" | "installed_master";
type DocType = "text" | "audio" | "video";

const DEGREE_LEVEL: Record<Degree, number> = {
  entered_apprentice: 1, fellow_craft: 2, master_mason: 3, installed_master: 4,
};
const DEGREE_LABEL: Record<Degree, string> = {
  entered_apprentice: "Entered Apprentice",
  fellow_craft: "Fellow Craft",
  master_mason: "Master Mason",
  installed_master: "Installed Masters",
};
const GENERAL_LABEL = "General Ritual";

const DOC_TYPE_LABEL: Record<DocType, string> = { text: "Text", audio: "Audio", video: "Video" };
const DOC_TYPE_ICON: Record<DocType, typeof FileText> = { text: FileText, audio: Music, video: Video };

type Doc = {
  id: string;
  title: string;
  description: string | null;
  required_degree: Degree;
  is_general: boolean;
  doc_type: DocType;
  file_path: string;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

export default function MembersRitual() {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<DocType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("ritual_documents")
        .select("*")
        .order("title", { ascending: true });
      if (error) toast.error(error.message);
      setDocs((data as Doc[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleView = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("ritual-docs").createSignedUrl(d.file_path, 60);
    if (error || !data) { toast.error("Couldn't open document"); return; }
    try {
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error("fetch failed");
      const ext = (d.file_path.split(".").pop() || "").toLowerCase();
      const mimeByExt: Record<string, string> = {
        pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
        gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
        mp4: "video/mp4", mp3: "audio/mpeg", txt: "text/plain", html: "text/html",
      };
      const original = res.headers.get("content-type") || "";
      const type = original && !original.includes("octet-stream") ? original : mimeByExt[ext] || original || "application/octet-stream";
      const blob = await res.blob();
      const inlineBlob = blob.type === type ? blob : new Blob([blob], { type });
      const url = URL.createObjectURL(inlineBlob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      window.open(data.signedUrl, "_blank", "noopener");
    }
  };

  const handleDownload = async (d: Doc) => {
    const filename = d.file_path.split("/").pop() || d.title;
    const { data, error } = await supabase.storage.from("ritual-docs").createSignedUrl(d.file_path, 60, { download: filename });
    if (error || !data) { toast.error("Couldn't generate download link"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const myDegree = (profile as { degree?: Degree } | null)?.degree ?? "entered_apprentice";
  const isPastMaster = (profile as { is_past_master?: boolean } | null)?.is_past_master ?? false;
  const effectiveDegree: Degree = isPastMaster ? "installed_master" : myDegree;

  const visibleDocs = useMemo(() => {
    let list = docs.filter((d) => d.is_general || DEGREE_LEVEL[d.required_degree] <= DEGREE_LEVEL[effectiveDegree]);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q));
    }
    if (typeFilter !== "all") list = list.filter((d) => (d.doc_type ?? "text") === typeFilter);
    return [...list].sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
  }, [docs, effectiveDegree, searchQuery, typeFilter]);

  const TYPE_FILTERS: { value: DocType | "all"; label: string }[] = [
    { value: "all", label: "All" }, { value: "text", label: "Text" },
    { value: "audio", label: "Audio" }, { value: "video", label: "Video" },
  ];

  return (
    <MembersLayout>
      <div className="mb-8 flex items-start justify-between gap-3 border-b border-gold/15 pb-4">
        <div>
          <h1 className="font-serif text-3xl text-gold mb-1">Ritual Rehearsal Syllabus</h1>
          <p className="text-xs text-primary-foreground/60">
            Material is displayed according to your verified Masonic degree
            {profile && (
              <>
                {" "}— currently{" "}
                <span className="text-gold font-medium">{DEGREE_LABEL[myDegree]}</span>
                {isPastMaster && <span className="text-gold/80"> · Past Master (Installed Masters access)</span>}.
              </>
            )}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 text-gold text-[11px] font-semibold uppercase tracking-wider border border-gold/20">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure Archive
        </div>
      </div>

      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or description…"
          className="w-full bg-navy border border-gold/20 rounded-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gold"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-gold/70 font-semibold mr-1">Filter by type</span>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`px-3 py-1.5 rounded-sm text-xs border transition-colors ${
              typeFilter === f.value
                ? "bg-gold/20 text-gold border-gold/40"
                : "bg-navy border-gold/15 text-primary-foreground/70 hover:border-gold/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-primary-foreground/60 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Validating credentials…
        </div>
      ) : visibleDocs.length === 0 ? (
        <p className="text-sm text-primary-foreground/50">No ritual material is available at your current degree.</p>
      ) : (
        <ul className="space-y-3">
          {visibleDocs.map((d) => {
            const TypeIcon = DOC_TYPE_ICON[d.doc_type ?? "text"];
            return (
              <li key={d.id} className="bg-navy-dark/60 border border-gold/15 rounded-sm p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:border-gold/30 transition-colors">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2.5 bg-gold/10 rounded-sm text-gold shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-tight line-clamp-2" title={d.title}>{d.title}</h3>
                    {d.description && <p className="text-xs text-primary-foreground/60 mt-1">{d.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-primary-foreground/55">
                      <span className="text-gold bg-gold/5 px-2 py-0.5 rounded-sm border border-gold/15">
                        {d.is_general ? GENERAL_LABEL : DEGREE_LABEL[d.required_degree]}
                      </span>
                      <span className="flex items-center gap-1 text-gold bg-gold/5 px-2 py-0.5 rounded-sm border border-gold/15">
                        <TypeIcon className="w-3 h-3" />
                        {DOC_TYPE_LABEL[d.doc_type ?? "text"]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(d.updated_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-1 shrink-0 flex-wrap justify-end border-t border-gold/10 pt-2 sm:border-t-0 sm:pt-0">
                  <button
                    onClick={() => handleView(d)}
                    className="p-2.5 sm:p-2 text-gold hover:bg-gold/10 rounded-sm"
                    aria-label="Open in new tab"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(d)}
                    className="p-2.5 sm:p-2 text-gold hover:bg-gold/10 rounded-sm"
                    aria-label="Download"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </MembersLayout>
  );
}
