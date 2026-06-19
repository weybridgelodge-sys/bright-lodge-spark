import { useEffect, useState } from "react";
import { Mail, Send, Eye, Users, FileEdit, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type TargetList = "members_pipeline" | "public_visitors";

interface Content {
  wmDesk: string;
  meetingRecap: string;
  charitySpotlight: string;
  masonicHistory: string;
}

const EMPTY_CONTENT: Content = { wmDesk: "", meetingRecap: "", charitySpotlight: "", masonicHistory: "" };

function NewsletterHubInner() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [targetList, setTargetList] = useState<TargetList>("members_pipeline");
  const [subject, setSubject] = useState("Weybridge Lodge No. 6787 — Monthly News & Labours");
  const [content, setContent] = useState<Content>(EMPTY_CONTENT);
  const [previewOpen, setPreviewOpen] = useState(true);

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
      const { data } = await supabase.rpc("can_edit_newsletter" as never, { _user: u.user.id });
      setHasAccess(data === true);
      setAccessChecked(true);
    })();
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("broadcast-newsletter", {
        body: { subject, targetList, content },
      });
      if (invokeError || (data && (data as { error?: string }).error)) {
        throw new Error((data as { error?: string })?.error || invokeError?.message || "Send failed");
      }
      setSentCount((data as { recipientCount?: number }).recipientCount ?? 0);
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
            {sentCount === 1 ? "recipient" : "recipients"}.
          </p>
          <Button
            onClick={() => {
              setSentCount(null);
              setContent(EMPTY_CONTENT);
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
          Compose, preview and broadcast the Monthly Chronicle.
        </p>
      </header>

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
        <form onSubmit={send} className="space-y-4 rounded-2xl border border-gold/20 bg-navy-light/30 p-6">
          <h2 className="font-serif text-lg text-gold flex items-center gap-2">
            <FileEdit className="h-4 w-4" /> Composer
          </h2>

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
                required
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold/15">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen((v) => !v)}
              className="border-gold/40 text-gold hover:bg-gold/10"
            >
              <Eye className="h-4 w-4 mr-1.5" /> {previewOpen ? "Hide preview" : "Show preview"}
            </Button>
            <Button type="submit" disabled={sending} className="bg-gold hover:bg-gold/90 text-navy font-semibold">
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
        </form>

        {/* Preview */}
        <div className={`${previewOpen ? "block" : "hidden lg:block"}`}>
          <div className="rounded-2xl overflow-hidden border border-gold/20 shadow-inner bg-white text-black">
            <div className="px-5 py-3 border-b border-slate-200 text-[11px] text-slate-500 space-y-0.5">
              <p><strong>From:</strong> Weybridge Lodge No. 6787 &lt;chronicle@weybridgelodge.org.uk&gt;</p>
              <p><strong>To:</strong> {targetList === "members_pipeline" ? "Members &amp; Candidates" : "Public Subscribers"}</p>
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
