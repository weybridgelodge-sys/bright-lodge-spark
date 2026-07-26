import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Trash2, Download, Loader2, ExternalLink, Link2, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

type Degree = "entered_apprentice" | "fellow_craft" | "master_mason" | "installed_master";
type DegreeOrGeneral = Degree | "general";

const DEGREES: Degree[] = ["entered_apprentice", "fellow_craft", "master_mason", "installed_master"];
const DEGREE_LABEL: Record<Degree, string> = {
  entered_apprentice: "Entered Apprentice",
  fellow_craft: "Fellow Craft",
  master_mason: "Master Mason",
  installed_master: "Installed Masters",
};
const GENERAL_LABEL = "General (all members)";

type Category =
  | "summons" | "meeting_minutes" | "committee_minutes" | "committee_agendas"
  | "media_files" | "ritual" | "newsletter" | "learning_development" | "other";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  file_path: string;
  file_size_bytes: number | null;
  created_at: string;
  required_degree: Degree | null;
  is_general: boolean;
};

const CATEGORIES = [
  "summons", "meeting_minutes", "committee_minutes", "committee_agendas",
  "media_files", "newsletter", "learning_development", "other",
] as const;

const CATEGORY_LABELS: Record<typeof CATEGORIES[number] | "ritual", string> = {
  summons: "Summons",
  meeting_minutes: "Meeting minutes",
  committee_minutes: "Committee minutes",
  committee_agendas: "Committee agendas",
  media_files: "Media files",
  newsletter: "Newsletters",
  learning_development: "Learning & Development",
  other: "Other",
  ritual: "Ritual",
};

function Inner() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<"all" | typeof CATEGORIES[number]>("all");
  const [busy, setBusy] = useState(false);
  const [previewDegree, setPreviewDegree] = useState<Degree | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("summons");
  const [degree, setDegree] = useState<DegreeOrGeneral>("general");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    const { data } = await supabase.from("lodge_documents").select("*").order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !user) return;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const docId = crypto.randomUUID();
      const path = `${category}/${docId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("lodge-docs").upload(path, file, {
        contentType: file.type || "application/octet-stream", upsert: false,
      });
      if (upErr) throw upErr;
      const gated = category === "learning_development";
      const isGeneral = gated ? degree === "general" : true;
      const requiredDegree: Degree | null = gated && !isGeneral ? (degree as Degree) : null;
      const { error: dbErr } = await supabase.from("lodge_documents").insert({
        title: title.trim(), description: description.trim() || null, category,
        file_path: path, file_size_bytes: file.size, uploaded_by: user.id,
        is_general: isGeneral, required_degree: requiredDegree,
      });
      if (dbErr) throw dbErr;
      toast.success("Document uploaded");
      setTitle(""); setDescription(""); setFile(null); setDegree("general");
      const el = document.getElementById("doc-file") as HTMLInputElement | null;
      if (el) el.value = "";
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); }
  };

  const handleReplace = async (d: Doc) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const newFile = input.files?.[0];
      if (!newFile) return;
      const oldExt = (d.file_path.split(".").pop() || "").toLowerCase();
      const newExt = (newFile.name.split(".").pop() || "").toLowerCase();
      if (oldExt && newExt && oldExt !== newExt) {
        if (!confirm(`The existing file is .${oldExt} but the new file is .${newExt}. Continue anyway?`)) return;
      }
      if (!confirm(`Replace "${d.title}" with "${newFile.name}"?`)) return;
      setBusy(true);
      try {
        const { error: upErr } = await supabase.storage.from("lodge-docs").upload(d.file_path, newFile, {
          contentType: newFile.type || "application/octet-stream", upsert: true,
        });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from("lodge_documents").update({ file_size_bytes: newFile.size }).eq("id", d.id);
        if (dbErr) throw dbErr;
        toast.success("File replaced");
        load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Replace failed");
      } finally { setBusy(false); }
    };
    input.click();
  };

  const handleView = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("lodge-docs").createSignedUrl(d.file_path, 300);
    if (error || !data) { toast.error("Couldn't open document"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleDownload = async (d: Doc) => {
    const filename = d.file_path.split("/").pop() || d.title;
    const { data, error } = await supabase.storage.from("lodge-docs").createSignedUrl(d.file_path, 60, { download: filename });
    if (error || !data) { toast.error("Couldn't generate download link"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleCopyLongLivedLink = async (d: Doc) => {
    const SEVEN_DAYS = 60 * 60 * 24 * 7;
    const { data, error } = await supabase.storage.from("lodge-docs").createSignedUrl(d.file_path, SEVEN_DAYS);
    if (error || !data) { toast.error("Couldn't generate shareable link"); return; }
    try {
      await navigator.clipboard.writeText(data.signedUrl);
      toast.success("7-day link copied to clipboard");
    } catch { window.prompt("Copy this 7-day signed link:", data.signedUrl); }
  };

  const handleDelete = async (d: Doc) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    await supabase.storage.from("lodge-docs").remove([d.file_path]);
    await supabase.from("lodge_documents").delete().eq("id", d.id);
    toast.success("Deleted");
    load();
  };

  // Preview-as-member gate for L&D
  const canSeeLD = (d: Doc): boolean => {
    if (d.category !== "learning_development") return true;
    if (d.is_general) return true;
    if (!previewDegree) return true;
    const LVL: Record<Degree, number> = { entered_apprentice: 1, fellow_craft: 2, master_mason: 3, installed_master: 4 };
    const need = d.required_degree ?? "entered_apprentice";
    return LVL[previewDegree] >= LVL[need];
  };

  const CATEGORY_ORDER: Record<string, number> = CATEGORIES.reduce((acc, c, i) => ({ ...acc, [c]: i }), {} as Record<string, number>);
  const filtered = docs
    .filter((d) => d.category !== "ritual")
    .filter((d) => filter === "all" || d.category === filter)
    .filter(canSeeLD)
    .sort((a, b) => {
      const catDiff = (CATEGORY_ORDER[a.category] ?? 999) - (CATEGORY_ORDER[b.category] ?? 999);
      if (catDiff !== 0) return catDiff;
      return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    });

  return (
    <MembersLayout>
      <div className="mb-6 border-b border-gold/15 pb-4">
        <h1 className="font-serif text-3xl text-gold mb-1">Document Archive — Admin</h1>
        <p className="text-xs text-primary-foreground/60">Upload, replace, and manage Lodge documents.</p>
      </div>

      <div className="mb-4 bg-gold/5 border border-gold/20 rounded-sm p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-gold text-[11px] font-semibold uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5" /> Preview L&amp;D as member
        </div>
        <select
          value={previewDegree ?? ""}
          onChange={(e) => setPreviewDegree((e.target.value || null) as Degree | null)}
          className="bg-navy border border-gold/20 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-gold text-primary-foreground"
        >
          <option value="">Full admin view (all degrees)</option>
          {DEGREES.map((d) => <option key={d} value={d}>{DEGREE_LABEL[d]}</option>)}
        </select>
      </div>

      <form onSubmit={handleUpload} className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 flex items-center gap-2 text-gold">
          <Upload className="w-4 h-4" />
          <h2 className="font-serif text-base">Upload a document</h2>
        </div>
        <input required value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. October Summons)"
          className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold" />
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
          className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold">
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        {category === "learning_development" && (
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-gold/70 font-semibold">Minimum degree to view</span>
            <select value={degree} onChange={(e) => setDegree(e.target.value as DegreeOrGeneral)}
              className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold">
              <option value="general">{GENERAL_LABEL}</option>
              {DEGREES.map((d) => <option key={d} value={d}>{DEGREE_LABEL[d]}</option>)}
            </select>
          </label>
        )}
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="md:col-span-2 bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold" />
        <input id="doc-file" required type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="md:col-span-2 text-sm text-primary-foreground/70 file:mr-3 file:border-0 file:bg-gold/15 file:text-gold file:px-3 file:py-1.5 file:rounded-sm file:text-xs" />
        <button disabled={busy}
          className="md:col-span-2 bg-gold-shimmer text-accent-foreground px-4 py-2 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Upload
        </button>
      </form>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 sm:py-1 text-xs uppercase tracking-wider rounded-sm border ${
              filter === c ? "border-gold text-gold bg-gold/10"
                : "border-gold/20 text-primary-foreground/60 hover:text-gold"
            }`}>{c === "all" ? "All" : CATEGORY_LABELS[c]}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-primary-foreground/50">No documents in this category.</p>
      ) : (
        <ul className="divide-y divide-gold/10 border border-gold/15 rounded-sm bg-navy-dark/40">
          {filtered.map((d) => (
            <li key={d.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 py-3 hover:bg-gold/5 transition-colors">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-gold shrink-0 mt-1" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight line-clamp-2" title={d.title}>{d.title}</p>
                  {d.description && <p className="text-xs text-primary-foreground/70 mt-1 whitespace-pre-wrap">{d.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-primary-foreground/50">
                    <span className="text-gold bg-gold/5 px-2 py-0.5 rounded-sm border border-gold/15">{CATEGORY_LABELS[d.category]}</span>
                    <span>{new Date(d.created_at).toLocaleDateString("en-GB")}</span>
                    {d.category === "learning_development" && (
                      <span className="text-gold">
                        {d.is_general ? GENERAL_LABEL : DEGREE_LABEL[d.required_degree ?? "entered_apprentice"]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-1 shrink-0 flex-wrap justify-end border-t border-gold/10 pt-2 sm:border-t-0 sm:pt-0">
                <button onClick={() => handleView(d)} className="p-2.5 sm:p-2 text-gold hover:bg-gold/10 rounded-sm" aria-label="Open" title="Open in new tab"><ExternalLink className="w-4 h-4" /></button>
                <button onClick={() => handleDownload(d)} className="p-2.5 sm:p-2 text-gold hover:bg-gold/10 rounded-sm" aria-label="Download" title="Download"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleCopyLongLivedLink(d)} className="p-2.5 sm:p-2 text-gold hover:bg-gold/10 rounded-sm" aria-label="Copy 7-day link" title="Copy 7-day shareable link"><Link2 className="w-4 h-4" /></button>
                <button onClick={() => handleReplace(d)} className="p-2.5 sm:p-2 text-gold hover:bg-gold/10 rounded-sm" aria-label="Replace" title="Replace file"><RefreshCw className="w-4 h-4" /></button>
                <span className="hidden sm:block w-px h-4 bg-gold/20 mx-0.5" />
                <button onClick={() => handleDelete(d)} className="p-2.5 sm:p-2 text-red-400 hover:bg-red-500/10 rounded-sm ml-1 sm:ml-0" aria-label="Delete" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MembersLayout>
  );
}

export default function DocumentsAdmin() {
  return <ProtectedRoute adminOnly><Inner /></ProtectedRoute>;
}
