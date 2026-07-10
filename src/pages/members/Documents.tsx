import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Trash2, Download, Loader2, ExternalLink, Link2, RefreshCw, Eye, ShieldCheck } from "lucide-react";
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
const GENERAL_LABEL = "General (all members)";

type Category =
  | "summons"
  | "meeting_minutes"
  | "committee_minutes"
  | "committee_agendas"
  | "media_files"
  | "ritual"
  | "newsletter"
  | "learning_development"
  | "other";

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
  "summons",
  "meeting_minutes",
  "committee_minutes",
  "committee_agendas",
  "media_files",
  "newsletter",
  "learning_development",
  "other",
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

export default function MembersDocuments() {
  const { isAdmin, user, profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<"all" | typeof CATEGORIES[number]>("all");
  const [busy, setBusy] = useState(false);

  // admin "preview as member" — only affects the Learning & Development gate.
  const [previewDegree, setPreviewDegree] = useState<Degree | null>(null);

  // upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("summons");
  const [degree, setDegree] = useState<DegreeOrGeneral>("general");
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
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const docId = crypto.randomUUID();
      const path = `${category}/${docId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("lodge-docs").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;

      // Degree gating only applies to Learning & Development documents.
      const gated = category === "learning_development";
      const isGeneral = gated ? degree === "general" : true;
      const requiredDegree: Degree | null = gated && !isGeneral ? (degree as Degree) : null;

      const { error: dbErr } = await supabase.from("lodge_documents").insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        file_path: path,
        file_size_bytes: file.size,
        uploaded_by: user.id,
        is_general: isGeneral,
        required_degree: requiredDegree,
      });
      if (dbErr) throw dbErr;
      toast.success("Document uploaded");
      setTitle("");
      setDescription("");
      setFile(null);
      setDegree("general");
      const el = document.getElementById("doc-file") as HTMLInputElement | null;
      if (el) el.value = "";
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
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
        if (!confirm(`The existing file is .${oldExt} but the new file is .${newExt}. Replacing with a different file type is not recommended — printed links may open the wrong viewer. Continue anyway?`)) return;
      }
      if (!confirm(`Replace "${d.title}" with "${newFile.name}"? The shareable link stays the same.`)) return;
      setBusy(true);
      try {
        const { error: upErr } = await supabase.storage.from("lodge-docs").upload(d.file_path, newFile, {
          contentType: newFile.type || "application/octet-stream",
          upsert: true,
        });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase
          .from("lodge_documents")
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

  const handleView = async (d: Doc) => {
    const safeTitle = d.title.replace(/[<>&]/g, "");
    const win = window.open("about:blank", "_blank");
    if (!win) {
      toast.error("Please allow pop-ups to open documents");
      return;
    }
    win.opener = null;
    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>html,body{margin:0;height:100%;background:#0b1220;color:#eee;font-family:system-ui,sans-serif}.msg{min-height:100%;display:grid;place-items:center;padding:2rem;text-align:center;box-sizing:border-box}</style></head><body><div class="msg">Opening document…</div></body></html>`);
    win.document.close();

    const { data, error } = await supabase.storage.from("lodge-docs").createSignedUrl(d.file_path, 300);
    if (error || !data) {
      win.document.body.innerHTML = `<div class="msg">Couldn't open document.</div>`;
      toast.error("Couldn't open document");
      return;
    }

    const ext = (d.file_path.split(".").pop() || "").toLowerCase();
    const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
    const isPdf = ext === "pdf";
    const safeUrl = data.signedUrl.replace(/"/g, "&quot;");

    let bodyHtml: string;
    if (isImage) {
      bodyHtml = `<img src="${safeUrl}" alt="${safeTitle}" style="max-width:100%;height:auto;display:block;margin:auto"/>`;
    } else if (isPdf) {
      const googleViewer = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(data.signedUrl)}`.replace(/"/g, "&quot;");
      bodyHtml = `
        <iframe src="${googleViewer}" title="${safeTitle}" style="width:100%;height:100%;border:0;background:#fff"></iframe>
        <a href="${safeUrl}" target="_blank" rel="noopener" style="position:fixed;right:12px;bottom:12px;background:#c9a432;color:#1b2a4a;padding:10px 14px;border-radius:2px;text-decoration:none;font:600 13px system-ui,sans-serif">Open original</a>`;
    } else {
      bodyHtml = `<iframe src="${safeUrl}" style="width:100%;height:100%;border:0"></iframe>`;
    }

    win.document.open();
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>html,body{margin:0;height:100%;background:#0b1220}</style></head><body>${bodyHtml}</body></html>`
    );
    win.document.close();
  };


  const handleDownload = async (d: Doc) => {
    const filename = d.file_path.split("/").pop() || d.title;
    const { data, error } = await supabase.storage
      .from("lodge-docs")
      .createSignedUrl(d.file_path, 60, { download: filename });
    if (error || !data) {
      toast.error("Couldn't generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };
  const handleCopyLongLivedLink = async (d: Doc) => {
    const TWENTY_YEARS = 60 * 60 * 24 * 365 * 20;
    const { data, error } = await supabase.storage
      .from("lodge-docs")
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


  const handleDelete = async (d: Doc) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    await supabase.storage.from("lodge-docs").remove([d.file_path]);
    await supabase.from("lodge_documents").delete().eq("id", d.id);
    toast.success("Deleted");
    load();
  };

  const myDegree = (profile as { degree?: Degree } | null)?.degree ?? "entered_apprentice";
  const isPastMaster = (profile as { is_past_master?: boolean } | null)?.is_past_master ?? false;
  // Past Masters get Installed Masters level access on L&D material.
  const effectiveDegree: Degree = isPastMaster ? "installed_master" : myDegree;

  // Degree gate applies ONLY to Learning & Development documents.
  // Admins see everything unless "Preview as member" is selected.
  const canSeeLD = (d: Doc): boolean => {
    if (d.category !== "learning_development") return true;
    if (d.is_general) return true;
    if (isAdmin && !previewDegree) return true;
    const viewer: Degree = isAdmin && previewDegree ? previewDegree : effectiveDegree;
    const need = d.required_degree ?? "entered_apprentice";
    return DEGREE_LEVEL[viewer] >= DEGREE_LEVEL[need];
  };

  const filtered = docs
    .filter((d) => d.category !== "ritual")
    .filter((d) => filter === "all" || d.category === filter)
    .filter(canSeeLD);

  const showLDGateBanner = filter === "learning_development" || filter === "all";

  return (
    <MembersLayout>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-gold mb-2">Documents</h1>
          <p className="text-sm text-primary-foreground/60">Summons, meeting minutes, committee minutes, agendas, media files, ritual notes, and Lodge papers.</p>
          {showLDGateBanner && profile && (
            <p className="text-[11px] text-primary-foreground/55 mt-2">
              Learning &amp; Development material is displayed according to your verified Masonic degree — currently{" "}
              <span className="text-gold font-medium">{DEGREE_LABEL[myDegree]}</span>
              {isPastMaster && <span className="text-gold/80"> · Past Master (Installed Masters access)</span>}.
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 text-gold text-[11px] font-semibold uppercase tracking-wider border border-gold/20 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure Archive
        </div>
      </div>

      {isAdmin && (
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
            {DEGREES.map((d) => (
              <option key={d} value={d}>
                {DEGREE_LABEL[d]}
              </option>
            ))}
          </select>
          {previewDegree && (
            <span className="text-[11px] text-primary-foreground/60">
              Showing Learning &amp; Development as a <span className="text-gold">{DEGREE_LABEL[previewDegree]}</span> would see it.
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
          {category === "learning_development" && (
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-gold/70 font-semibold">Minimum degree to view</span>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value as DegreeOrGeneral)}
                className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
              >
                <option value="general">{GENERAL_LABEL}</option>
                {DEGREES.map((d) => (
                  <option key={d} value={d}>{DEGREE_LABEL[d]}</option>
                ))}
              </select>
              <span className="text-[10px] text-primary-foreground/50">
                Members at or above this degree will see the document. Past Masters always see Installed Masters material.
              </span>
            </label>
          )}
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
            <li key={d.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 py-3 hover:bg-gold/5 transition-colors">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-gold shrink-0 mt-1" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight line-clamp-2" title={d.title}>{d.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-primary-foreground/50">
                    <span className="text-gold bg-gold/5 px-2 py-0.5 rounded-sm border border-gold/15">
                      {CATEGORY_LABELS[d.category]}
                    </span>
                    <span>{new Date(d.created_at).toLocaleDateString("en-GB")}</span>
                    {d.category === "learning_development" && (
                      <span className="text-gold">
                        {d.is_general ? GENERAL_LABEL : DEGREE_LABEL[d.required_degree ?? "entered_apprentice"]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end border-t border-gold/10 pt-2 sm:border-t-0 sm:pt-0">
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
