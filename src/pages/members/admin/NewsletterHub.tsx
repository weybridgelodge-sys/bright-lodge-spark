import { useEffect, useState } from "react";
import {
  Mail, Send, Eye, Users, FileEdit, CheckCircle2, Loader2, AlertCircle, Save, Trash2,
  FileClock, Plus, Type, Image as ImageIcon, ArrowUp, ArrowDown, Columns, Rows, Copy,
} from "lucide-react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoAsset from "@/assets/weybridge-logo-white.png.asset.json";

type Audience = "members" | "visitors";
type Status = "draft" | "ready_to_send";
type Layout = "single" | "masonry";

type Block =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; url: string; alt?: string; caption?: string };

interface Section {
  id: string;
  heading: string;
  layout: Layout;
  blocks: Block[];
}

interface NewsletterContent {
  sections: Section[];
}

interface DraftRow {
  id: string;
  subject: string;
  target_list: string;
  content: any;
  content_visitors: any;
  status: string;
  audience: string | null;
  unified_content: boolean | null;
  created_at: string;
}


const DEFAULT_SUBJECT = "Weybridge Lodge No. 6787 — Monthly News & Labours";
const SITE_ORIGIN = "https://bright-lodge-spark.lovable.app";
const LOGO_URL = `${SITE_ORIGIN}${logoAsset.url}`;

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_SECTIONS = (): Section[] => [
  { id: uid(), heading: "From the WM's Desk", layout: "single", blocks: [{ id: uid(), type: "text", text: "" }] },
  { id: uid(), heading: "Last Meeting Labours", layout: "single", blocks: [{ id: uid(), type: "text", text: "" }] },
  { id: uid(), heading: "Charity Spotlight", layout: "single", blocks: [{ id: uid(), type: "text", text: "" }] },
  { id: uid(), heading: "Masonic History & Education", layout: "single", blocks: [{ id: uid(), type: "text", text: "" }] },
];

function migrateContent(raw: any, fallback?: () => Section[]): NewsletterContent {
  if (raw && Array.isArray(raw.sections)) {
    return {
      sections: raw.sections.map((s: any) => ({
        id: s.id || uid(),
        heading: s.heading ?? "Untitled section",
        layout: s.layout === "masonry" ? "masonry" : "single",
        blocks: Array.isArray(s.blocks)
          ? s.blocks.map((b: any) => {
              if (b?.type === "image") return { id: b.id || uid(), type: "image", url: b.url || "", alt: b.alt || "", caption: b.caption || "" };
              return { id: b.id || uid(), type: "text", text: b.text || "" };
            })
          : [],
      })),
    };
  }
  if (raw && (raw.wmDesk || raw.meetingRecap || raw.charitySpotlight || raw.masonicHistory)) {
    return {
      sections: [
        { id: uid(), heading: "From the WM's Desk",          layout: "single", blocks: [{ id: uid(), type: "text", text: raw.wmDesk || "" }] },
        { id: uid(), heading: "Last Meeting Labours",        layout: "single", blocks: [{ id: uid(), type: "text", text: raw.meetingRecap || "" }] },
        { id: uid(), heading: "Charity Spotlight",           layout: "single", blocks: [{ id: uid(), type: "text", text: raw.charitySpotlight || "" }] },
        { id: uid(), heading: "Masonic History & Education", layout: "single", blocks: [{ id: uid(), type: "text", text: raw.masonicHistory || "" }] },
      ],
    };
  }
  return { sections: fallback ? fallback() : [] };
}

/** Reshape the visitor variant so its section list mirrors the members list
 *  (same ids/headings/layout). Block-level body text is preserved where the
 *  block ids match; sections present only on one side are kept on that side. */
function syncStructure(members: Section[], visitors: Section[]): Section[] {
  const visitorById = new Map(visitors.map((s) => [s.id, s]));
  return members.map((m) => {
    const v = visitorById.get(m.id);
    if (!v) {
      // New section — visitor starts with empty parallel blocks of same shape.
      return {
        ...m,
        blocks: m.blocks.map((b) =>
          b.type === "text"
            ? { id: b.id, type: "text", text: "" }
            : { id: b.id, type: "image", url: b.url, alt: b.alt, caption: b.caption },
        ),
      };
    }
    const vBlockById = new Map(v.blocks.map((b) => [b.id, b]));
    return {
      id: m.id,
      heading: m.heading,
      layout: m.layout,
      blocks: m.blocks.map((mb) => {
        const vb = vBlockById.get(mb.id);
        if (mb.type === "text") {
          return { id: mb.id, type: "text", text: vb && vb.type === "text" ? vb.text : "" };
        }
        // images share src across variants by default
        return { id: mb.id, type: "image", url: mb.url, alt: mb.alt, caption: mb.caption };
      }),
    };
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.7;color:#1f2937;font-size:15px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderSectionPreview(s: Section): JSX.Element {
  const blocks = s.blocks;
  if (s.layout === "masonry" && blocks.length > 1) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {blocks.map((b) => (
          <div key={b.id} className="break-inside-avoid">
            {b.type === "text" ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {b.text || <span className="text-slate-400 italic">[text…]</span>}
              </p>
            ) : (
              <figure>
                {b.url ? <img src={b.url} alt={b.alt || ""} className="w-full rounded" /> : <div className="aspect-[4/3] bg-slate-100 rounded grid place-items-center text-slate-400 text-xs">[image url…]</div>}
                {b.caption && <figcaption className="text-[11px] text-slate-500 mt-1">{b.caption}</figcaption>}
              </figure>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {blocks.map((b) => (
        <div key={b.id}>
          {b.type === "text" ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {b.text || <span className="text-slate-400 italic">[Pending text entry…]</span>}
            </p>
          ) : (
            <figure>
              {b.url ? <img src={b.url} alt={b.alt || ""} className="w-full rounded" /> : <div className="aspect-[16/9] bg-slate-100 rounded grid place-items-center text-slate-400 text-xs">[image url…]</div>}
              {b.caption && <figcaption className="text-[11px] text-slate-500 mt-1">{b.caption}</figcaption>}
            </figure>
          )}
        </div>
      ))}
    </div>
  );
}

function NewsletterHubInner() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>("members");
  const [unifiedContent, setUnifiedContent] = useState<boolean>(false);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [membersSections, setMembersSections] = useState<Section[]>(DEFAULT_SECTIONS());
  const [visitorsSections, setVisitorsSections] = useState<Section[]>(() =>
    DEFAULT_SECTIONS().map((s) => ({ ...s, blocks: s.blocks.map((b) => b.type === "text" ? { ...b, text: "" } : b) })),
  );
  const [status, setStatus] = useState<Status>("draft");
  const [previewOpen, setPreviewOpen] = useState(true);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSummary, setSentSummary] = useState<Array<{ audience: string; sent: number; error?: string | null }> | null>(null);
  const [error, setError] = useState<string | null>(null);


  // In unified mode, the visitor variant editor is hidden and the members
  // content acts as the canonical single version. Keep the variant in sync
  // so any later untick pre-fills visitors (rather than starting blank).
  const effectiveAudience: Audience = unifiedContent ? "members" : audience;
  const sections = effectiveAudience === "members" ? membersSections : visitorsSections;
  const setSections = (next: Section[] | ((prev: Section[]) => Section[])) => {
    if (effectiveAudience === "members") {
      setMembersSections((prev) => {
        const updated = typeof next === "function" ? next(prev) : next;
        setVisitorsSections((vPrev) => syncStructure(updated, vPrev));
        return updated;
      });
    } else {
      setVisitorsSections((prev) => (typeof next === "function" ? next(prev) : next));
    }
  };

  // When unified-content is toggled OFF, pre-fill the visitor variant with
  // a clone of the current members content rather than leaving it blank, so
  // the editor can diverge from a sensible starting point instead of losing
  // the just-written copy.
  const setUnifiedContentSafe = (next: boolean) => {
    setUnifiedContent((prev) => {
      if (prev && !next) {
        // ticked → unticked: clone members into visitors
        setVisitorsSections(membersSections.map((s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.type === "text"
              ? { id: b.id, type: "text", text: b.text }
              : { id: b.id, type: "image", url: b.url, alt: b.alt, caption: b.caption },
          ),
        })));
      }
      return next;
    });
  };


  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setAccessChecked(true); return; }
      const { data } = await supabase.rpc("can_edit_newsletter" as any, { _user: u.user.id } as any);
      setHasAccess(data === true);
      setAccessChecked(true);
      if (data === true) loadDrafts();
    })();
  }, []);

  const loadDrafts = async () => {
    const { data } = await supabase
      .from("newsletter_broadcasts" as any)
      .select("id,subject,target_list,content,content_visitors,status,audience,unified_content,created_at")
      .in("status", ["draft", "ready_to_send"])
      .is("audience", null) // exclude per-audience sent rows
      .order("created_at", { ascending: false });
    setDrafts((data as unknown as DraftRow[]) ?? []);
  };

  const resetEditor = () => {
    setBroadcastId(null);
    setSubject(DEFAULT_SUBJECT);
    const fresh = DEFAULT_SECTIONS();
    setMembersSections(fresh);
    setVisitorsSections(syncStructure(fresh, []));
    setStatus("draft");
    setAudience("members");
    setUnifiedContent(false);
    setError(null);
  };

  const loadDraft = (d: DraftRow) => {
    setBroadcastId(d.id);
    setSubject(d.subject);
    const m = migrateContent(d.content, DEFAULT_SECTIONS).sections;
    const v = migrateContent(d.content_visitors).sections;
    setMembersSections(m);
    setVisitorsSections(syncStructure(m, v));
    setStatus((d.status as Status) === "ready_to_send" ? "ready_to_send" : "draft");
    setUnifiedContent(!!d.unified_content);
    setSentSummary(null);
    setError(null);
  };

  const saveDraft = async () => {
    setError(null);
    setSaving(true);
    try {
      const v = syncStructure(membersSections, visitorsSections);
      setVisitorsSections(v);
      const payload = {
        subject: subject.trim() || DEFAULT_SUBJECT,
        target_list: "members_pipeline",
        content: { sections: membersSections } satisfies NewsletterContent,
        content_visitors: { sections: v } satisfies NewsletterContent,
        status,
        audience: null,
        unified_content: unifiedContent,
      };
      if (broadcastId) {
        const { error: err } = await supabase.from("newsletter_broadcasts" as any).update(payload).eq("id", broadcastId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.from("newsletter_broadcasts" as any).insert(payload).select("id").single();
        if (err) throw err;
        setBroadcastId((data as unknown as { id: string }).id);
      }
      toast.success(status === "ready_to_send" ? "Saved — marked Ready to send" : "Draft saved");
      loadDrafts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm("Delete this draft?")) return;
    const { error: err } = await supabase.from("newsletter_broadcasts" as any).delete().eq("id", id);
    if (err) { toast.error(err.message); return; }
    toast.success("Draft deleted");
    if (broadcastId === id) resetEditor();
    loadDrafts();
  };

  const sectionsHaveContent = (list: Section[]): boolean =>
    list.length > 0 && list.every((s) =>
      (s.blocks || []).some((b) => (b.type === "text" && b.text.trim()) || (b.type === "image" && b.url.trim())),
    );

  /**
   * audiences semantics (server-aligned):
   *   ["members"]           → send Members & Visitors edition
   *   ["visitors"]          → send Public edition
   *   ["members","visitors"]→ two separate sends (dual-variant mode)
   *   ["all"]               → single merged dedup send (unified-content mode only)
   */
  const send = async (audiences: Array<"members" | "visitors" | "all">) => {
    if (!broadcastId) { setError("Save the newsletter first."); return; }
    if (status !== "ready_to_send") { setError('Set status to "Ready to send" before broadcasting.'); return; }

    const labelFor = (a: string) =>
      a === "members" ? "Members & Visitors" : a === "visitors" ? "Public" : "Combined (all lists)";

    // Client-side content guard. In unified mode every requested audience
    // shares the members variant; otherwise check the matching variant.
    for (const a of audiences) {
      const list = unifiedContent || a !== "visitors" ? membersSections : visitorsSections;
      if (!sectionsHaveContent(list)) {
        setError(`The ${labelFor(a)} edition has empty sections. Fill or remove them before sending.`);
        return;
      }
    }

    if (audiences.length > 1 && !confirm(`Broadcast both editions now? Two separate sends will be logged and two PDFs archived.`)) {
      return;
    }
    if (audiences.includes("all") && !confirm(`Send one merged broadcast to Members & Visitors AND Public, deduplicated by email? One combined PDF will be archived.`)) {
      return;
    }

    setError(null);
    setSending(true);
    try {
      const v = syncStructure(membersSections, visitorsSections);
      await supabase
        .from("newsletter_broadcasts" as any)
        .update({
          subject: subject.trim(),
          content: { sections: membersSections },
          content_visitors: { sections: v },
          status: "ready_to_send",
          unified_content: unifiedContent,
        })
        .eq("id", broadcastId);

      const { data, error: invokeError } = await supabase.functions.invoke("broadcast-newsletter", {
        body: { broadcastId, audiences },
      });
      if (invokeError || (data && (data as { error?: string }).error)) {
        throw new Error((data as { error?: string })?.error || invokeError?.message || "Send failed");
      }
      setSentSummary((data as { results?: Array<{ audience: string; sent: number; error?: string | null }> }).results ?? []);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send");
    } finally {
      setSending(false);
    }
  };



  // ---- Section/block mutators (operate on the active audience) ----
  const updateSection = (id: string, patch: Partial<Section>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const moveSection = (id: string, dir: -1 | 1) =>
    setSections((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const removeSection = (id: string) =>
    setSections((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  const addSection = () =>
    setSections((prev) => [...prev, { id: uid(), heading: "New section", layout: "single", blocks: [{ id: uid(), type: "text", text: "" }] }]);

  const addBlock = (sectionId: string, type: "text" | "image") =>
    updateSection(sectionId, {
      blocks: [
        ...(sections.find((s) => s.id === sectionId)?.blocks || []),
        type === "text"
          ? { id: uid(), type: "text", text: "" }
          : { id: uid(), type: "image", url: "", alt: "", caption: "" },
      ],
    });
  const updateBlock = (sectionId: string, blockId: string, patch: Partial<Block>) => {
    const s = sections.find((x) => x.id === sectionId);
    if (!s) return;
    updateSection(sectionId, {
      blocks: s.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as Block) : b)),
    });
  };
  const removeBlock = (sectionId: string, blockId: string) => {
    const s = sections.find((x) => x.id === sectionId);
    if (!s) return;
    updateSection(sectionId, { blocks: s.blocks.filter((b) => b.id !== blockId) });
  };

  /** Copy the body of this section from the OTHER audience variant into the current one. */
  const copyFromOther = (sectionId: string) => {
    const sourceList = effectiveAudience === "members" ? visitorsSections : membersSections;
    const src = sourceList.find((s) => s.id === sectionId);
    if (!src) { toast.error("Nothing to copy — the other audience has no matching section."); return; }
    if (effectiveAudience === "members") {
      setMembersSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, blocks: cloneBlocks(src.blocks) } : s));
    } else {
      setVisitorsSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, blocks: cloneBlocks(src.blocks) } : s));
    }
    toast.success("Copied from the other audience.");
  };
  const cloneBlocks = (blocks: Block[]): Block[] =>
    blocks.map((b) =>
      b.type === "text"
        ? { id: b.id, type: "text", text: b.text }
        : { id: b.id, type: "image", url: b.url, alt: b.alt, caption: b.caption },
    );


  if (!accessChecked) {
    return <MembersLayout><div className="text-primary-foreground/60 text-sm">Checking access…</div></MembersLayout>;
  }
  if (!hasAccess) {
    return (
      <MembersLayout>
        <header className="mb-4"><h1 className="font-serif text-2xl text-gold">Newsletter Hub</h1></header>
        <p className="text-primary-foreground/70 text-sm">
          You don't have access to this section. It's restricted to Admins, the Worshipful Master, the Secretary, and
          members of the Communications &amp; Heritage Group.
        </p>
      </MembersLayout>
    );
  }

  if (sentSummary !== null) {
    const totalSent = sentSummary.reduce((s, r) => s + r.sent, 0);
    return (
      <MembersLayout>
        <div className="max-w-2xl mx-auto rounded-2xl border border-gold/30 bg-navy-light/40 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-gold mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-gold mb-2">Broadcast dispatched</h1>
          <p className="text-primary-foreground/80 text-sm mb-4">
            Your Monthly Chronicle has been queued to <strong className="text-gold">{totalSent}</strong>{" "}
            {totalSent === 1 ? "recipient" : "recipients"} across {sentSummary.length} edition{sentSummary.length === 1 ? "" : "s"}.
          </p>
          <ul className="text-sm text-primary-foreground/80 mb-6 space-y-1">
            {sentSummary.map((r) => (
              <li key={r.audience}>
                <strong className="text-gold">
                  {r.audience === "members" ? "Members & Visitors" : r.audience === "visitors" ? "Public" : "Combined (all lists)"}:
                </strong>{" "}
                {r.error ? <span className="text-red-300">failed — {r.error}</span> : `${r.sent} sent · PDF archived`}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-primary-foreground/50 mb-6">PDFs are filed under <strong className="text-gold">Documents → Newsletters</strong>, one per audience sent.</p>

          <Button onClick={() => { setSentSummary(null); resetEditor(); }} variant="outline" className="border-gold/40 text-gold hover:bg-gold/10">
            Compose next issue
          </Button>
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-gold/80">Communications Engine</p>
        <h1 className="font-serif text-2xl md:text-3xl text-gold mt-1">Newsletter Dispatch Hub</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">
          Compose one issue, then choose your audience. <strong className="text-gold">Lodge Members &amp; Visitors</strong> covers
          active members plus visiting Freemasons (deferred until the visitor contacts list ships); <strong className="text-gold">Public</strong> goes
          to website newsletter sign-ups. Tick <strong className="text-gold">Unified content</strong> when one shared write-up suits everyone
          (e.g. a social-event poster) — the merged "Send to Both" then dedups by email and files a single combined PDF.
        </p>
        <p className="text-[11px] text-primary-foreground/50 mt-2">
          <strong>Note:</strong> Mailchimp was considered for the Public list and dropped — its free tier caps at 250 contacts /
          500 sends per month and forces a "Sent with Mailchimp" footer below the paid Essentials plan. Both audiences go via
          the portal's existing Resend integration so branding, unsubscribe handling, and contact storage stay consistent.
        </p>

      </header>

      {drafts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gold/20 bg-navy-light/30 p-4">
          <div className="flex items-center gap-2 mb-3 text-gold">
            <FileClock className="h-4 w-4" />
            <h2 className="font-serif text-base">Saved drafts</h2>
          </div>
          <ul className="divide-y divide-gold/10">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <button onClick={() => loadDraft(d)} className="text-left flex-1 min-w-0">
                  <p className="text-sm text-primary-foreground truncate">{d.subject}</p>
                  <p className="text-[11px] text-primary-foreground/50">
                    {d.status === "ready_to_send" ? <span className="text-gold">Ready to send</span> : <span>Draft</span>}
                    {" "}· {new Date(d.created_at).toLocaleDateString("en-GB")}
                    {broadcastId === d.id && <span className="text-gold"> · loaded</span>}
                  </p>
                </button>
                <button onClick={() => deleteDraft(d.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-sm" aria-label="Delete draft">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unified content toggle */}
      <label className="flex items-start gap-2 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={unifiedContent}
          onChange={(e) => setUnifiedContentSafe(e.target.checked)}
          className="mt-0.5 accent-gold"
        />
        <span>
          <span className="text-sm font-semibold text-gold">Unified content</span>
          <span className="block text-[11px] text-primary-foreground/60 leading-relaxed">
            One shared write-up for everyone. Hides the Public variant editor; "Send to Both" becomes a single dedup'd merged
            send with one combined PDF archived.
          </span>
        </span>
      </label>

      {/* Audience editing toggle — hidden in unified mode */}
      {!unifiedContent && (
        <>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-primary-foreground/60">Editing audience variant</div>
          <div className="inline-flex bg-navy-light/40 border border-gold/20 rounded-lg p-1 mb-6">
            <button type="button" onClick={() => setAudience("members")}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                audience === "members" ? "bg-gold text-navy shadow" : "text-primary-foreground/70 hover:text-primary-foreground"}`}>
              <Users className="h-3.5 w-3.5" /> Lodge Members &amp; Visitors
            </button>
            <button type="button" onClick={() => setAudience("visitors")}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                audience === "visitors" ? "bg-gold text-navy shadow" : "text-primary-foreground/70 hover:text-primary-foreground"}`}>
              <Mail className="h-3.5 w-3.5" /> Public
            </button>
          </div>
        </>
      )}


      <div className="grid lg:grid-cols-2 gap-6">
        {/* Composer */}
        <div className="space-y-4 rounded-2xl border border-gold/20 bg-navy-light/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-gold flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              {broadcastId ? "Editing draft" : "New newsletter"}
              <span className="text-[10px] uppercase tracking-wider text-primary-foreground/60 ml-2">
                {audience === "members" ? "Members variant" : "Visitors variant"}
              </span>
            </h2>
            {broadcastId && (
              <button type="button" onClick={resetEditor} className="text-[11px] uppercase tracking-wider text-primary-foreground/60 hover:text-gold">
                New
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 mb-1.5">Subject line (shared)</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required
              className="w-full bg-navy-dark border border-gold/20 rounded-md px-3 py-2 text-sm text-primary-foreground focus:outline-none focus:border-gold/60" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full bg-navy-dark border border-gold/20 rounded-md px-3 py-2 text-sm text-primary-foreground focus:outline-none focus:border-gold/60">
              <option value="draft">Draft — work in progress</option>
              <option value="ready_to_send">Ready to send</option>
            </select>
            <p className="text-[11px] text-primary-foreground/50 mt-1">
              Broadcast buttons are enabled only when status is <em>Ready to send</em>.
            </p>
          </div>

          {/* Sections editor */}
          <div className="space-y-4">
            {sections.map((s, idx) => (
              <div key={s.id} className="rounded-md border border-gold/15 bg-navy-dark/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s.heading}
                    onChange={(e) => updateSection(s.id, { heading: e.target.value })}
                    placeholder="Section heading"
                    className="flex-1 bg-navy-dark border border-gold/20 rounded px-2 py-1.5 text-sm text-primary-foreground focus:outline-none focus:border-gold/60"
                  />
                  <select
                    value={s.layout}
                    onChange={(e) => updateSection(s.id, { layout: e.target.value as Layout })}
                    title="Block layout"
                    className="bg-navy-dark border border-gold/20 rounded px-2 py-1.5 text-xs text-primary-foreground"
                  >
                    <option value="single">Single column · rows</option>
                    <option value="masonry">Masonry grid</option>
                  </select>
                  <button type="button" onClick={() => moveSection(s.id, -1)} disabled={idx === 0}
                    className="p-1.5 text-primary-foreground/60 hover:text-gold disabled:opacity-30" aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSection(s.id, 1)} disabled={idx === sections.length - 1}
                    className="p-1.5 text-primary-foreground/60 hover:text-gold disabled:opacity-30" aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeSection(s.id)} disabled={sections.length <= 1}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded disabled:opacity-30" aria-label="Remove section">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => copyFromOther(s.id)}
                    className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gold/30 text-gold/80 hover:bg-gold/10"
                    title={`Copy this section's body from the ${audience === "members" ? "Visitors" : "Members"} variant`}>
                    <Copy className="h-3 w-3" /> Copy from {audience === "members" ? "Visitors" : "Members"}
                  </button>
                </div>

                <div className="space-y-2 pl-1">
                  {s.blocks.map((b) => (
                    <div key={b.id} className="rounded border border-gold/10 bg-navy-dark/60 p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-gold/70 flex items-center gap-1">
                          {b.type === "text" ? <Type className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                          {b.type}
                        </span>
                        <button type="button" onClick={() => removeBlock(s.id, b.id)}
                          className="text-red-400/80 hover:text-red-400" aria-label="Remove block">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {b.type === "text" ? (
                        <textarea
                          rows={3}
                          value={b.text}
                          onChange={(e) => updateBlock(s.id, b.id, { text: e.target.value })}
                          placeholder={`Write ${audience === "members" ? "Members" : "Visitors"} paragraph text…`}
                          className="w-full bg-navy-dark border border-gold/20 rounded px-2 py-1.5 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60 leading-relaxed resize-y"
                        />
                      ) : (
                        <div className="space-y-1.5">
                          <input type="url" value={b.url}
                            onChange={(e) => updateBlock(s.id, b.id, { url: e.target.value })}
                            placeholder="https://… (public image URL)"
                            className="w-full bg-navy-dark border border-gold/20 rounded px-2 py-1.5 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60" />
                          <input type="text" value={b.alt || ""}
                            onChange={(e) => updateBlock(s.id, b.id, { alt: e.target.value })}
                            placeholder="Alt text (accessibility)"
                            className="w-full bg-navy-dark border border-gold/20 rounded px-2 py-1.5 text-xs text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60" />
                          <input type="text" value={b.caption || ""}
                            onChange={(e) => updateBlock(s.id, b.id, { caption: e.target.value })}
                            placeholder="Caption (optional)"
                            className="w-full bg-navy-dark border border-gold/20 rounded px-2 py-1.5 text-xs text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={() => addBlock(s.id, "text")}
                      className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-gold/30 text-gold hover:bg-gold/10">
                      <Plus className="h-3 w-3" /> <Type className="h-3 w-3" /> Text
                    </button>
                    <button type="button" onClick={() => addBlock(s.id, "image")}
                      className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-gold/30 text-gold hover:bg-gold/10">
                      <Plus className="h-3 w-3" /> <ImageIcon className="h-3 w-3" /> Image
                    </button>
                    <span className="text-[10px] text-primary-foreground/40 self-center ml-1 flex items-center gap-1">
                      {s.layout === "masonry" ? <Columns className="h-3 w-3" /> : <Rows className="h-3 w-3" />}
                      {s.layout === "masonry" ? "Masonry grid" : "Single column"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addSection}
              className="w-full text-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-gold/40 text-gold hover:bg-gold/10">
              <Plus className="h-4 w-4" /> Add section
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-gold/15">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen((v) => !v)} className="border-gold/40 text-gold hover:bg-gold/10">
              <Eye className="h-4 w-4 mr-1.5" /> {previewOpen ? "Hide preview" : "Show preview"}
            </Button>
            <Button type="button" variant="outline" onClick={saveDraft} disabled={saving} className="border-gold/40 text-gold hover:bg-gold/10">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-2 pt-2">
            <Button type="button" onClick={() => send(["members"])} disabled={sending || status !== "ready_to_send" || !broadcastId}
              className="bg-gold hover:bg-gold/90 text-navy font-semibold disabled:opacity-40"
              title={!broadcastId ? "Save first" : status !== "ready_to_send" ? 'Mark "Ready to send"' : "Send Members edition"}>
              {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />} Send to Members
            </Button>
            <Button type="button" onClick={() => send(["visitors"])} disabled={sending || status !== "ready_to_send" || !broadcastId}
              className="bg-gold hover:bg-gold/90 text-navy font-semibold disabled:opacity-40"
              title={!broadcastId ? "Save first" : status !== "ready_to_send" ? 'Mark "Ready to send"' : "Send Visitors edition"}>
              {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />} Send to Visitors
            </Button>
            <Button type="button" onClick={() => send(["members", "visitors"])} disabled={sending || status !== "ready_to_send" || !broadcastId}
              className="bg-navy border border-gold text-gold hover:bg-gold/10 font-semibold disabled:opacity-40">
              {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />} Send to Both
            </Button>
          </div>
        </div>

        {/* Preview (active audience) */}
        <div className={`${previewOpen ? "block" : "hidden lg:block"}`}>
          <div className="rounded-2xl overflow-hidden border border-gold/20 shadow-inner bg-white text-black">
            <div className="px-5 py-3 border-b border-slate-200 text-[11px] text-slate-500 space-y-0.5">
              <p><strong>From:</strong> Weybridge Lodge No. 6787 &lt;chronicle@weybridgelodge.org.uk&gt;</p>
              <p><strong>To:</strong> {audience === "members" ? "Members & Candidates" : "Public Subscribers"}</p>
              <p><strong>Subject:</strong> {subject || "…"}</p>
            </div>

            <div className="bg-[#1B2A4A] px-5 py-4 border-b-4 border-[#C9A432] flex items-center gap-4">
              <img src={LOGO_URL} alt="Weybridge Lodge crest" className="h-14 w-14 object-contain shrink-0" />
              <div className="text-left">
                <div className="font-serif text-[#C9A432] text-xl leading-tight">Weybridge Lodge No. 6787</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 mt-1">Monthly Chronicle &amp; Labours</div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {sections.map((s) => (
                <section key={s.id}>
                  <h3 className="font-serif text-[#1B2A4A] text-base border-b border-[#e5dccd] pb-1 mb-2">
                    {s.heading || <span className="text-slate-400 italic">[heading]</span>}
                  </h3>
                  {renderSectionPreview(s)}
                </section>
              ))}
            </div>

            <div className="bg-[#1B2A4A] px-5 pt-4 pb-3 text-center">
              <div className="flex justify-center gap-3 mb-3">
                <a href="https://instagram.com/weybridgelodge/" className="inline-block">
                  <span className="inline-grid place-items-center h-7 w-7 rounded-full bg-[#C9A432] text-[#1B2A4A] text-xs font-bold">IG</span>
                </a>
                <a href="https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/" className="inline-block">
                  <span className="inline-grid place-items-center h-7 w-7 rounded-full bg-[#C9A432] text-[#1B2A4A] text-xs font-bold">f</span>
                </a>
                <a href="https://twitter.com/weybridgelodge" className="inline-block">
                  <span className="inline-grid place-items-center h-7 w-7 rounded-full bg-[#C9A432] text-[#1B2A4A] text-xs font-bold">𝕏</span>
                </a>
                <a href="https://weybridgelodge.org.uk/news" className="inline-block">
                  <span className="inline-grid place-items-center h-7 w-7 rounded-full bg-[#C9A432] text-[#1B2A4A] text-[10px] font-bold">Web</span>
                </a>
              </div>
              <div className="text-white/80 text-[10px] leading-relaxed">
                © {new Date().getFullYear()} Weybridge Lodge No. 6787 · Guildford Masonic Centre, GU2 4DR<br />
                Unsubscribe link is added automatically per recipient.
              </div>
            </div>
          </div>
        </div>
      </div>
    </MembersLayout>
  );
}

export default function NewsletterHub() {
  return (
    <ProtectedRoute>
      <NewsletterHubInner />
    </ProtectedRoute>
  );
}
