import { useEffect, useState } from "react";
import { Mail, Send, Eye, Users, FileEdit, CheckCircle2, Loader2, AlertCircle, Save, Trash2, FileClock } from "lucide-react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TargetList = "members_pipeline" | "public_visitors";
type Status = "draft" | "ready_to_send";

interface Content {
  wmDesk: string;
  meetingRecap: string;
  charitySpotlight: string;
  masonicHistory: string;
}

interface DraftRow {
  id: string;
  subject: string;
  target_list: TargetList;
  content: Content;
  status: string;
  created_at: string;
}

const EMPTY_CONTENT: Content = { wmDesk: "", meetingRecap: "", charitySpotlight: "", masonicHistory: "" };
const DEFAULT_SUBJECT = "Weybridge Lodge No. 6787 — Monthly News & Labours";

function NewsletterHubInner() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [targetList, setTargetList] = useState<TargetList>("members_pipeline");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [content, setContent] = useState<Content>(EMPTY_CONTENT);
  const [status, setStatus] = useState<Status>("draft");
  const [previewOpen, setPreviewOpen] = useState(true);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setAccessChecked(true);
        return;
      }
      const { data } = await supabase.rpc("can_edit_newsletter" as any, { _user: u.user.id } as any);
      setHasAccess(data === true);
      setAccessChecked(true);
      if (data === true) loadDrafts();
    })();
  }, []);

  const loadDrafts = async () => {
    const { data } = await supabase
      .from("newsletter_broadcasts" as any)
      .select("id,subject,target_list,content,status,created_at")
      .in("status", ["draft", "ready_to_send"])
      .order("created_at", { ascending: false });
    setDrafts((data as unknown as DraftRow[]) ?? []);
  };

  const resetEditor = () => {
    setBroadcastId(null);
    setSubject(DEFAULT_SUBJECT);
    setContent(EMPTY_CONTENT);
    setStatus("draft");
    setTargetList("members_pipeline");
    setError(null);
  };

  const loadDraft = (d: DraftRow) => {
    setBroadcastId(d.id);
    setSubject(d.subject);
    setTargetList(d.target_list);
    setContent({ ...EMPTY_CONTENT, ...(d.content || {}) });
    setStatus((d.status as Status) === "ready_to_send" ? "ready_to_send" : "draft");
    setSentCount(null);
    setError(null);
  };

  const saveDraft = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        subject: subject.trim() || DEFAULT_SUBJECT,
        target_list: targetList,
        content,
        status,
      };
      if (broadcastId) {
        const { error: err } = await supabase
          .from("newsletter_broadcasts" as any)
          .update(payload)
          .eq("id", broadcastId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from("newsletter_broadcasts" as any)
          .insert(payload)
          .select("id")
          .single();
        if (err) throw err;
        setBroadcastId((data as { id: string }).id);
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
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Draft deleted");
    if (broadcastId === id) resetEditor();
    loadDrafts();
  };

  const send = async () => {
    if (!broadcastId) {
      setError("Save the newsletter first.");
      return;
    }
    if (status !== "ready_to_send") {
      setError('Set status to "Ready to send" before broadcasting.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      // Ensure latest content is persisted before send
      await supabase
        .from("newsletter_broadcasts" as any)
        .update({ subject: subject.trim(), target_list: targetList, content, status: "ready_to_send" })
        .eq("id", broadcastId);

      const { data, error: invokeError } = await supabase.functions.invoke("broadcast-newsletter", {
        body: { broadcastId },
      });
      if (invokeError || (data && (data as { error?: string }).error)) {
        throw new Error((data as { error?: string })?.error || invokeError?.message || "Send failed");
      }
      setSentCount((data as { recipientCount?: number }).recipientCount ?? 0);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send");
    } finally {
      setSending(false);
    }
  };

  if (!accessChecked) {
    return (
      <MembersLayout>
        <div className="text-primary-foreground/60 text-sm">Checking access…</div>
      </MembersLayout>
    );
  }
  if (!hasAccess) {
    return (
      <MembersLayout>
        <header className="mb-4">
          <h1 className="font-serif text-2xl text-gold">Newsletter Hub</h1>
        </header>
        <p className="text-primary-foreground/70 text-sm">
          You don't have access to this section. It's restricted to Admins, the Worshipful Master, the Secretary, and
          members of the Communications &amp; Heritage Group.
        </p>
      </MembersLayout>
    );
  }

  if (sentCount !== null) {
    return (
      <MembersLayout>
        <div className="max-w-2xl mx-auto rounded-2xl border border-gold/30 bg-navy-light/40 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-gold mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-gold mb-2">Broadcast dispatched</h1>
          <p className="text-primary-foreground/80 text-sm mb-6">
            Your Monthly Chronicle has been queued to <strong className="text-gold">{sentCount}</strong>{" "}
            {sentCount === 1 ? "recipient" : "recipients"}. A copy has been archived in <strong className="text-gold">Documents → Newsletters</strong>.
          </p>
          <Button
            onClick={() => {
              setSentCount(null);
              resetEditor();
            }}
            variant="outline"
            className="border-gold/40 text-gold hover:bg-gold/10"
          >
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
          Compose, save drafts, and broadcast the Monthly Chronicle. Sent issues are archived under Documents → Newsletters.
        </p>
      </header>

      {/* Drafts list */}
      {drafts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gold/20 bg-navy-light/30 p-4">
          <div className="flex items-center gap-2 mb-3 text-gold">
            <FileClock className="h-4 w-4" />
            <h2 className="font-serif text-base">Saved drafts</h2>
          </div>
          <ul className="divide-y divide-gold/10">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <button
                  onClick={() => loadDraft(d)}
                  className="text-left flex-1 min-w-0"
                >
                  <p className="text-sm text-primary-foreground truncate">{d.subject}</p>
                  <p className="text-[11px] text-primary-foreground/50">
                    {d.status === "ready_to_send" ? (
                      <span className="text-gold">Ready to send</span>
                    ) : (
                      <span>Draft</span>
                    )}{" "}
                    · {new Date(d.created_at).toLocaleDateString("en-GB")} ·{" "}
                    {d.target_list === "members_pipeline" ? "Members & Candidates" : "Public Subscribers"}
                    {broadcastId === d.id && <span className="text-gold"> · loaded</span>}
                  </p>
                </button>
                <button
                  onClick={() => deleteDraft(d.id)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-sm"
                  aria-label="Delete draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target list tabs */}
      <div className="inline-flex bg-navy-light/40 border border-gold/20 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setTargetList("members_pipeline")}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            targetList === "members_pipeline"
              ? "bg-gold text-navy shadow"
              : "text-primary-foreground/70 hover:text-primary-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Portal &amp; Candidates
        </button>
        <button
          type="button"
          onClick={() => setTargetList("public_visitors")}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            targetList === "public_visitors"
              ? "bg-gold text-navy shadow"
              : "text-primary-foreground/70 hover:text-primary-foreground"
          }`}
        >
          <Mail className="h-3.5 w-3.5" /> Public Subscribers
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Composer */}
        <div className="space-y-4 rounded-2xl border border-gold/20 bg-navy-light/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-gold flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              {broadcastId ? "Editing draft" : "New newsletter"}
            </h2>
            {broadcastId && (
              <button
                type="button"
                onClick={resetEditor}
                className="text-[11px] uppercase tracking-wider text-primary-foreground/60 hover:text-gold"
              >
                New
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 mb-1.5">
              Subject line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full bg-navy-dark border border-gold/20 rounded-md px-3 py-2 text-sm text-primary-foreground focus:outline-none focus:border-gold/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full bg-navy-dark border border-gold/20 rounded-md px-3 py-2 text-sm text-primary-foreground focus:outline-none focus:border-gold/60"
            >
              <option value="draft">Draft — work in progress</option>
              <option value="ready_to_send">Ready to send</option>
            </select>
            <p className="text-[11px] text-primary-foreground/50 mt-1">
              The Broadcast button is enabled only when status is <em>Ready to send</em>.
            </p>
          </div>

          {(
            [
              ["wmDesk", "From the WM's Desk", "100–150 words from the Worshipful Master…", 4],
              ["meetingRecap", "Last Meeting Recap", "Ceremony, Festive Board highlights, toasts…", 3],
              ["charitySpotlight", "Charity Spotlight", "Focus on a cause or cheque handover…", 3],
              ["masonicHistory", "Masonic History & Education", "Short historical vignette…", 3],
            ] as const
          ).map(([key, label, placeholder, rows]) => (
            <div key={key}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 mb-1.5">
                {label}
              </label>
              <textarea
                rows={rows}
                placeholder={placeholder}
                value={content[key]}
                onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                className="w-full bg-navy-dark border border-gold/20 rounded-md px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60 leading-relaxed resize-y"
              />
            </div>
          ))}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-gold/15">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen((v) => !v)}
              className="border-gold/40 text-gold hover:bg-gold/10"
            >
              <Eye className="h-4 w-4 mr-1.5" /> {previewOpen ? "Hide preview" : "Show preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={saving}
              className="border-gold/40 text-gold hover:bg-gold/10"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save
            </Button>
            <Button
              type="button"
              onClick={send}
              disabled={sending || status !== "ready_to_send" || !broadcastId}
              className="bg-gold hover:bg-gold/90 text-navy font-semibold disabled:opacity-40"
              title={
                !broadcastId
                  ? "Save the newsletter first"
                  : status !== "ready_to_send"
                  ? 'Set status to "Ready to send"'
                  : "Broadcast now"
              }
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" /> Broadcast Newsletter
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className={`${previewOpen ? "block" : "hidden lg:block"}`}>
          <div className="rounded-2xl overflow-hidden border border-gold/20 shadow-inner bg-white text-black">
            <div className="px-5 py-3 border-b border-slate-200 text-[11px] text-slate-500 space-y-0.5">
              <p><strong>From:</strong> Weybridge Lodge No. 6787 &lt;chronicle@weybridgelodge.org.uk&gt;</p>
              <p><strong>To:</strong> {targetList === "members_pipeline" ? "Members & Candidates" : "Public Subscribers"}</p>
              <p><strong>Subject:</strong> {subject || "…"}</p>
            </div>

            <div className="bg-[#1B2A4A] text-center py-6 px-4 border-b-4 border-[#C9A432]">
              <div className="font-serif text-[#C9A432] text-xl">Weybridge Lodge No. 6787</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 mt-1">Monthly Chronicle &amp; Labours</div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {([
                ["wmDesk", "From the WM's Desk"],
                ["meetingRecap", "Last Meeting Labours"],
                ["charitySpotlight", "Charity Spotlight"],
                ["masonicHistory", "Masonic History Vignette"],
              ] as const).map(([key, heading]) => (
                <section key={key}>
                  <h3 className="font-serif text-[#1B2A4A] text-base border-b border-[#e5dccd] pb-1 mb-2">{heading}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {content[key] || <span className="text-slate-400 italic">[Pending text entry…]</span>}
                  </p>
                </section>
              ))}
            </div>

            <div className="bg-[#1B2A4A] text-white/80 text-[10px] text-center px-5 py-3 leading-relaxed">
              © {new Date().getFullYear()} Weybridge Lodge No. 6787 · Guildford Masonic Centre, GU2 4DR<br />
              Unsubscribe link is added automatically per recipient.
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
