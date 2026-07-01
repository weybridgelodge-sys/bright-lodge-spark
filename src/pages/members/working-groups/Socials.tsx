import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Calendar, Trash2, Send, ArrowLeft } from "lucide-react";
import {
  listSocials,
  createSocial,
  markSocialNotified,
  deleteSocial,
  type LodgeSocial,
} from "@/lib/lodgeSocials";
import { sendEventInvite, formatEventEmailHtml } from "@/lib/sendEventInvite";
import { listMyGroups } from "@/lib/workingGroups";
import { supabase } from "@/integrations/supabase/client";

const SOCIAL_SLUGS = ["socials", "social-committee", "social"];

function parseGuests(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n;]+/)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  );
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Inner() {
  const { user, isAdmin, isWorshipfulMaster, isSecretary } = useAuth();
  const [canManage, setCanManage] = useState(isAdmin || isWorshipfulMaster || isSecretary);
  const [socials, setSocials] = useState<LodgeSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [guestsRaw, setGuestsRaw] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setSocials(await listSocials());
        if (user && !canManage) {
          const my = await listMyGroups(user.id);
          if (my.some((g) => g.group && SOCIAL_SLUGS.includes(g.group.slug))) setCanManage(true);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const upcoming = useMemo(
    () => socials.filter((s) => new Date(s.starts_at) >= new Date()),
    [socials],
  );
  const past = useMemo(
    () => socials.filter((s) => new Date(s.starts_at) < new Date()),
    [socials],
  );

  const resetForm = () => {
    setTitle("");
    setStartsAt("");
    setEndsAt("");
    setVenue("");
    setDescription("");
    setGuestsRaw("");
    setShowForm(false);
  };

  const onSave = async () => {
    if (!title.trim() || !startsAt || !venue.trim()) {
      toast.error("Title, date/time and venue are required");
      return;
    }
    setSaving(true);
    try {
      const guests = parseGuests(guestsRaw);
      const startIso = new Date(startsAt).toISOString();
      const endIso = endsAt ? new Date(endsAt).toISOString() : null;
      const created = await createSocial({
        title: title.trim(),
        starts_at: startIso,
        ends_at: endIso,
        venue: venue.trim(),
        description: description.trim() || null,
        guest_emails: guests,
      });

      const html = formatEventEmailHtml({
        heading: title.trim(),
        intro: "Brethren, you are warmly invited to the following social event:",
        fields: [
          { label: "When", value: fmt(startIso) + (endIso ? ` – ${fmt(endIso)}` : "") },
          { label: "Where", value: venue.trim() },
        ],
        bodyHtml: description.trim()
          ? `<p style="margin:0 0 12px 0;">${description.trim().replace(/\n/g, "<br/>")}</p>`
          : undefined,
        footer: "S&F, Weybridge Lodge Social Committee",
      });

      const result = await sendEventInvite({
        event: {
          title: `Weybridge Lodge Social — ${title.trim()}`,
          description: description.trim() || undefined,
          location: venue.trim(),
          startTime: startIso,
          endTime: endIso ?? undefined,
        },
        subject: `Lodge Social: ${title.trim()} — ${fmt(startIso)}`,
        html,
        memberScope: { kind: "all_active" },
        guestEmails: guests,
        idempotencyPrefix: `social-${created.id}`,
        requireRole: ["admin", "secretary", "worshipful_master", "member"],
      });

      await markSocialNotified(created.id, result.sent);
      toast.success(`Invited ${result.sent} recipient${result.sent === 1 ? "" : "s"}`);
      setSocials(await listSocials());
      resetForm();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create social");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this social event?")) return;
    try {
      await deleteSocial(id);
      setSocials((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/members/working-groups"
          className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Working Groups
        </Link>
      </div>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-primary-foreground">Ad-hoc Socials</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            Casual events outside the summons — Sunday lunches, quiz nights, family days.
          </p>
        </div>
        {canManage && !showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-gold text-navy hover:bg-gold/90">
            <Calendar className="w-4 h-4 mr-2" /> New Social
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-sm border border-gold/30 bg-navy-dark/60 p-5 space-y-4">
          <h2 className="font-serif text-gold text-lg">New Social Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-primary-foreground/80">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer Family BBQ" />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Venue *</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Masonic Centre" />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Starts *</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Ends (optional)</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-primary-foreground/80">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Details, dress code, RSVP instructions…"
            />
          </div>
          <div>
            <Label className="text-primary-foreground/80">
              Additional guest emails (comma-separated)
            </Label>
            <Textarea
              value={guestsRaw}
              onChange={(e) => setGuestsRaw(e.target.value)}
              rows={2}
              placeholder="candidate@example.com, friend@example.com"
            />
            <p className="text-xs text-primary-foreground/50 mt-1">
              These addresses will receive the same invite alongside all active members.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving} className="bg-gold text-navy hover:bg-gold/90">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Save &amp; Send Invite
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <SocialsList
            heading="Upcoming"
            items={upcoming}
            canManage={canManage}
            onDelete={onDelete}
          />
          <SocialsList
            heading="Past"
            items={past}
            canManage={canManage}
            onDelete={onDelete}
            dim
          />
        </div>
      )}
    </div>
  );
}

function SocialsList({
  heading,
  items,
  canManage,
  onDelete,
  dim,
}: {
  heading: string;
  items: LodgeSocial[];
  canManage: boolean;
  onDelete: (id: string) => void;
  dim?: boolean;
}) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-primary-foreground/50 mb-2">{heading}</h2>
      {items.length === 0 ? (
        <div className="text-sm text-primary-foreground/40 italic py-4">Nothing to show.</div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div
              key={s.id}
              className={`rounded-sm border border-gold/20 bg-navy-dark/40 p-4 ${dim ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-gold">{s.title}</h3>
                  <p className="text-xs text-primary-foreground/70 mt-1">
                    {fmt(s.starts_at)} • {s.venue}
                  </p>
                  {s.description && (
                    <p className="text-sm text-primary-foreground/80 mt-2 whitespace-pre-wrap">
                      {s.description}
                    </p>
                  )}
                  {s.guest_emails.length > 0 && (
                    <p className="text-xs text-primary-foreground/50 mt-2">
                      + {s.guest_emails.length} guest{s.guest_emails.length === 1 ? "" : "s"} invited
                    </p>
                  )}
                  {s.notified_at && (
                    <p className="text-xs text-primary-foreground/40 mt-1">
                      Invited {s.notified_member_count} recipients on {fmt(s.notified_at)}
                    </p>
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => onDelete(s.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdHocSocialsPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
