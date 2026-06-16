import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  category: "summons" | "meeting_minutes" | "committee_minutes" | "committee_agendas" | "media_files" | "ritual" | "other";
  file_path: string;
  file_size_bytes: number | null;
  created_at: string;
};

const CATEGORIES = [
  "summons",
  "meeting_minutes",
  "committee_minutes",
  "committee_agendas",
  "media_files",
  "other",
] as const;

const CATEGORY_LABELS: Record<typeof CATEGORIES[number] | "ritual", string> = {
  summons: "Summons",
  meeting_minutes: "Meeting minutes",
  committee_minutes: "Committee minutes",
  committee_agendas: "Committee agendas",
  media_files: "Media files",
  other: "Other",
  ritual: "Ritual",
};

export default function MembersDocuments() {
  const { isAdmin, user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<"all" | typeof CATEGORIES[number]>("all");
  const [busy, setBusy] = useState(false);

  // upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("summons");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("lodge_documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !user) return;
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${category}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("lodge-docs").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("lodge_documents").insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        file_path: path,
        file_size_bytes: file.size,
        uploaded_by: user.id,
      });
      if (dbErr) throw dbErr;
      toast.success("Document uploaded");
      setTitle("");
      setDescription("");
      setFile(null);
      (document.getElementById("doc-file") as HTMLInputElement | null)?.value &&
        ((document.getElementById("doc-file") as HTMLInputElement).value = "");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("lodge-docs").createSignedUrl(d.file_path, 60);
    if (error || !data) {
      toast.error("Couldn't generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleDelete = async (d: Doc) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    await supabase.storage.from("lodge-docs").remove([d.file_path]);
    await supabase.from("lodge_documents").delete().eq("id", d.id);
    toast.success("Deleted");
    load();
  };

  const filtered = docs.filter((d) => filter === "all" || d.category === filter);

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-2">Documents</h1>
        <p className="text-sm text-primary-foreground/60">Summons, meeting minutes, committee minutes, agendas, media files, ritual notes, and Lodge papers.</p>
      </div>

      {isAdmin && (
        <form
          onSubmit={handleUpload}
          className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div className="md:col-span-2 flex items-center gap-2 text-gold">
            <Upload className="w-4 h-4" />
            <h2 className="font-serif text-base">Upload a document</h2>
          </div>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. October Summons)"
            className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
            className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="md:col-span-2 bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <input
            id="doc-file"
            required
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="md:col-span-2 text-sm text-primary-foreground/70 file:mr-3 file:border-0 file:bg-gold/15 file:text-gold file:px-3 file:py-1.5 file:rounded-sm file:text-xs"
          />
          <button
            disabled={busy}
            className="md:col-span-2 bg-gold-shimmer text-accent-foreground px-4 py-2 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Upload
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 text-xs uppercase tracking-wider rounded-sm border ${
              filter === c
                ? "border-gold text-gold bg-gold/10"
                : "border-gold/20 text-primary-foreground/60 hover:text-gold"
            }`}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-primary-foreground/50">No documents in this category.</p>
      ) : (
        <ul className="divide-y divide-gold/10 border border-gold/15 rounded-sm bg-navy-dark/40">
          {filtered.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-gold shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{d.title}</p>
                  <p className="text-[11px] text-primary-foreground/50">
                    {CATEGORY_LABELS[d.category]} · {new Date(d.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(d)}
                  className="p-2 text-gold hover:bg-gold/10 rounded-sm"
                  aria-label="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(d)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-sm"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MembersLayout>
  );
}
