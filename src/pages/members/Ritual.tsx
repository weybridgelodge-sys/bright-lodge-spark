import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Upload, Trash2, Download, Loader2, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";

type Degree = "entered_apprentice" | "fellow_craft" | "master_mason" | "installed_master";

const DEGREES: Degree[] = ["entered_apprentice", "fellow_craft", "master_mason", "installed_master"];

const DEGREE_LABEL: Record<Degree, string> = {
  entered_apprentice: "Entered Apprentice",
  fellow_craft: "Fellow Craft",
  master_mason: "Master Mason",
  installed_master: "Installed Masters",
};

type Doc = {
  id: string;
  title: string;
  description: string | null;
  required_degree: Degree;
  file_path: string;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

export default function MembersRitual() {
  const { isAdmin, user, profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  // upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [degree, setDegree] = useState<Degree>("entered_apprentice");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ritual_documents")
      .select("*")
      .order("required_degree", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs((data as Doc[]) ?? []);
    setLoading(false);
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
      const path = `${degree}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("ritual-docs").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("ritual_documents").insert({
        title: title.trim(),
        description: description.trim() || null,
        required_degree: degree,
        file_path: path,
        file_size_bytes: file.size,
        uploaded_by: user.id,
      });
      if (dbErr) throw dbErr;
      toast.success("Ritual document uploaded");
      setTitle("");
      setDescription("");
      setFile(null);
      const el = document.getElementById("ritual-file") as HTMLInputElement | null;
      if (el) el.value = "";
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage
      .from("ritual-docs")
      .createSignedUrl(d.file_path, 60);
    if (error || !data) {
      toast.error("Couldn't generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleDelete = async (d: Doc) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    await supabase.storage.from("ritual-docs").remove([d.file_path]);
    const { error } = await supabase.from("ritual_documents").delete().eq("id", d.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const myDegree = (profile as { degree?: Degree } | null)?.degree ?? "entered_apprentice";
  const isPastMaster = (profile as { is_past_master?: boolean } | null)?.is_past_master ?? false;

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

      {isAdmin && (
        <form
          onSubmit={handleUpload}
          className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div className="md:col-span-2 flex items-center gap-2 text-gold">
            <Upload className="w-4 h-4" />
            <h2 className="font-serif text-base">Upload ritual document</h2>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-gold/70 font-semibold">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. First Degree Tracing Board"
              className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-gold/70 font-semibold">Degree</span>
            <select
              value={degree}
              onChange={(e) => setDegree(e.target.value as Degree)}
              className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            >
              {DEGREES.map((d) => (
                <option key={d} value={d}>
                  {DEGREE_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-gold/70 font-semibold">Description (optional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary or notes"
              className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-gold/70 font-semibold">File</span>
            <input
              id="ritual-file"
              required
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-primary-foreground/70 file:mr-3 file:border-0 file:bg-gold/15 file:text-gold file:px-3 file:py-1.5 file:rounded-sm file:text-xs"
            />
          </label>
          <button
            disabled={busy}
            className="md:col-span-2 bg-gold-shimmer text-accent-foreground px-4 py-2 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Upload
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-primary-foreground/60 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Validating credentials…
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-primary-foreground/50">
          No ritual material is available at your current degree.
        </p>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => (
            <li
              key={d.id}
              className="bg-navy-dark/60 border border-gold/15 rounded-sm p-4 flex items-start justify-between gap-3 hover:border-gold/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 bg-gold/10 rounded-sm text-gold shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-tight">{d.title}</h3>
                  {d.description && (
                    <p className="text-xs text-primary-foreground/60 mt-1">{d.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-primary-foreground/55">
                    <span className="text-gold bg-gold/5 px-2 py-0.5 rounded-sm border border-gold/15">
                      {DEGREE_LABEL[d.required_degree]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(d.updated_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(d)}
                  className="p-2 text-gold hover:bg-gold/10 rounded-sm"
                  aria-label="Download"
                  title="Download"
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
