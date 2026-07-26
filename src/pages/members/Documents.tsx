import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Degree = "entered_apprentice" | "fellow_craft" | "master_mason" | "installed_master";

const DEGREE_LEVEL: Record<Degree, number> = {
  entered_apprentice: 1, fellow_craft: 2, master_mason: 3, installed_master: 4,
};
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

export default function MembersDocuments() {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<"all" | typeof CATEGORIES[number]>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lodge_documents")
        .select("*")
        .order("created_at", { ascending: false });
      setDocs((data as Doc[]) ?? []);
    })();
  }, []);

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

  const myDegree = (profile as { degree?: Degree } | null)?.degree ?? "entered_apprentice";
  const isPastMaster = (profile as { is_past_master?: boolean } | null)?.is_past_master ?? false;
  const effectiveDegree: Degree = isPastMaster ? "installed_master" : myDegree;

  const canSeeLD = (d: Doc): boolean => {
    if (d.category !== "learning_development") return true;
    if (d.is_general) return true;
    const need = d.required_degree ?? "entered_apprentice";
    return DEGREE_LEVEL[effectiveDegree] >= DEGREE_LEVEL[need];
  };

  const CATEGORY_ORDER: Record<string, number> = CATEGORIES.reduce(
    (acc, c, i) => ({ ...acc, [c]: i }),
    {} as Record<string, number>
  );
  const filtered = docs
    .filter((d) => d.category !== "ritual")
    .filter((d) => filter === "all" || d.category === filter)
    .filter(canSeeLD)
    .sort((a, b) => {
      const catDiff = (CATEGORY_ORDER[a.category] ?? 999) - (CATEGORY_ORDER[b.category] ?? 999);
      if (catDiff !== 0) return catDiff;
      return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    });

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

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 sm:py-1 text-xs uppercase tracking-wider rounded-sm border ${
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
                  {d.description && (
                    <p className="text-xs text-primary-foreground/70 mt-1 whitespace-pre-wrap">{d.description}</p>
                  )}
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
          ))}
        </ul>
      )}
    </MembersLayout>
  );
}
