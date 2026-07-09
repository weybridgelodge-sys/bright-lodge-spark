import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Upload, Trash2, Download, Loader2, ShieldCheck, Clock, Eye, ExternalLink, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Degree = "entered_apprentice" | "fellow_craft" | "master_mason" | "installed_master";
type DegreeOrGeneral = Degree | "general";

const DEGREES: Degree[] = ["entered_apprentice", "fellow_craft", "master_mason", "installed_master"];

const DEGREE_LEVEL: Record<Degree, number> = {
  entered_apprentice: 1,
  fellow_craft: 2,
  master_mason: 3,
  installed_master: 4,
};

const DEGREE_LABEL: Record<Degree, string> = {
  entered_apprentice: "Entered Apprentice",
  fellow_craft: "Fellow Craft",
  master_mason: "Master Mason",
  installed_master: "Installed Masters",
};

const GENERAL_LABEL = "General Ritual";

const UPLOAD_OPTIONS: { value: DegreeOrGeneral; label: string }[] = [
  { value: "general", label: GENERAL_LABEL },
  ...DEGREES.map((d) => ({ value: d, label: DEGREE_LABEL[d] })),
];

type Doc = {
  id: string;
  title: string;
  description: string | null;
  required_degree: Degree;
  is_general: boolean;
  file_path: string;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

export default function MembersRitual() {
  const { isAdmin, user, profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  // admin "preview as member" toggle — null = full admin view
  const [previewDegree, setPreviewDegree] = useState<Degree | null>(null);

  // upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [degree, setDegree] = useState<DegreeOrGeneral>("general");
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

  const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !user) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        `File too large (${formatFileSize(file.size)}). Maximum upload size is ${formatFileSize(
          MAX_FILE_SIZE_BYTES
        )}. Try compressing the video or uploading from a Wi-Fi connection.`
      );
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const isGeneral = degree === "general";
      const folder = isGeneral ? "general" : degree;
      // Stable path: <folder>/<uuid>.<ext> — never changes, so a 20-year signed URL
      // stays valid across future revisions when the file is replaced in place.
      const docId = crypto.randomUUID();
      const path = `${folder}/${docId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ritual-docs").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("ritual_documents").insert({
        title: title.trim(),
        description: description.trim() || null,
        required_degree: isGeneral ? "entered_apprentice" : (degree as Degree),
        is_general: isGeneral,
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
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg === "Failed to fetch" || (err instanceof TypeError && msg === "Failed to fetch")) {
        toast.error(
          "Upload failed: network error or file too large. Try a smaller file, use Wi-Fi, or reduce video quality."
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReplace = async (d: Doc) => {
    // Replaces the file at the SAME storage path so any previously generated
    // (long-lived) signed URLs continue to resolve — now to the new file.
    // Note: CDN/browser caches may serve the old file for a few minutes.
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const newFile = input.files?.[0];
      if (!newFile) return;
      const oldExt = (d.file_path.split(".").pop() || "").toLowerCase();
      const newExt = (newFile.name.split(".").pop() || "").toLowerCase();
      if (oldExt && newExt && oldExt !== newExt) {
        if (!confirm(`The existing file is .${oldExt} but the new file is .${newExt}. Replacing with a different file type is not recommended — printed links may open the wrong viewer. Continue anyway?`)) return;
      }
      if (!confirm(`Replace "${d.title}" with "${newFile.name}"? The shareable link stays the same.`)) return;
      setBusy(true);
      try {
        const { error: upErr } = await supabase.storage.from("ritual-docs").upload(d.file_path, newFile, {
          contentType: newFile.type || "application/octet-stream",
          upsert: true,
        });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase
          .from("ritual_documents")
          .update({ file_size_bytes: newFile.size })
          .eq("id", d.id);
        if (dbErr) throw dbErr;
        toast.success("File replaced — existing links now point to the new version");
        load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Replace failed");
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const handleCopyLongLivedLink = async (d: Doc) => {
    // 20 years in seconds — for printed QR codes / booklets. Bucket stays private; link is unguessable.
    const TWENTY_YEARS = 60 * 60 * 24 * 365 * 20;
    const { data, error } = await supabase.storage
      .from("ritual-docs")
      .createSignedUrl(d.file_path, TWENTY_YEARS);
    if (error || !data) {
      toast.error("Couldn't generate shareable link");
      return;
    }
    try {
      await navigator.clipboard.writeText(data.signedUrl);
      toast.success("20-year link copied to clipboard");
    } catch {
      window.prompt("Copy this 20-year signed link:", data.signedUrl);
    }
  };


  const handleView = async (d: Doc) => {
    const { data, error } = await supabase.storage
      .from("ritual-docs")
      .createSignedUrl(d.file_path, 60);
    if (error || !data) {
      toast.error("Couldn't open document");
      return;
    }
    try {
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error("fetch failed");
      const ext = (d.file_path.split(".").pop() || "").toLowerCase();
      const mimeByExt: Record<string, string> = {
        pdf: "application/pdf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        mp4: "video/mp4",
        mp3: "audio/mpeg",
        txt: "text/plain",
        html: "text/html",
      };
      const original = res.headers.get("content-type") || "";
      const type =
        original && !original.includes("octet-stream") ? original : mimeByExt[ext] || original || "application/octet-stream";
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
    const { data, error } = await supabase.storage
      .from("ritual-docs")
      .createSignedUrl(d.file_path, 60, { download: filename });
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

  const visibleDocs =
    isAdmin && previewDegree
      ? docs.filter(
          (d) => d.is_general || DEGREE_LEVEL[d.required_degree] <= DEGREE_LEVEL[previewDegree]
        )
      : docs;

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
        <div className="mb-6 bg-gold/5 border border-gold/20 rounded-sm p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gold text-[11px] font-semibold uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" /> Preview as member
          </div>
          <select
            value={previewDegree ?? ""}
            onChange={(e) => setPreviewDegree((e.target.value || null) as Degree | null)}
            className="bg-navy border border-gold/20 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-gold text-primary-foreground"
          >
            <option value="">Full admin view (all degrees)</option>
            {DEGREES.map((d) => (
              <option key={d} value={d}>
                {DEGREE_LABEL[d]}
              </option>
            ))}
          </select>
          {previewDegree && (
            <span className="text-[11px] text-primary-foreground/60">
              Showing what a <span className="text-gold">{DEGREE_LABEL[previewDegree]}</span> would see.
            </span>
          )}
        </div>
      )}

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
              onChange={(e) => setDegree(e.target.value as DegreeOrGeneral)}
              className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            >
              {UPLOAD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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
            <span className="text-[11px] text-primary-foreground/50">
              Videos (MP4), PDFs, images and other documents are allowed. Maximum file size: {formatFileSize(MAX_FILE_SIZE_BYTES)}.
            </span>
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
      ) : visibleDocs.length === 0 ? (
        <p className="text-sm text-primary-foreground/50">
          {isAdmin && previewDegree
            ? `No ritual material visible to a ${DEGREE_LABEL[previewDegree]}.`
            : "No ritual material is available at your current degree."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleDocs.map((d) => (
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
                      {d.is_general ? GENERAL_LABEL : DEGREE_LABEL[d.required_degree]}
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
                  onClick={() => handleView(d)}
                  className="p-2 text-gold hover:bg-gold/10 rounded-sm"
                  aria-label="Open in new tab"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(d)}
                  className="p-2 text-gold hover:bg-gold/10 rounded-sm"
                  aria-label="Download"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleCopyLongLivedLink(d)}
                      className="p-2 text-gold hover:bg-gold/10 rounded-sm"
                      aria-label="Copy 20-year shareable link"
                      title="Copy 20-year shareable link (for printed QR codes)"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReplace(d)}
                      className="p-2 text-gold hover:bg-gold/10 rounded-sm"
                      aria-label="Replace file (keep same link)"
                      title="Replace file — keeps the same shareable link"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-sm"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MembersLayout>
  );
}
