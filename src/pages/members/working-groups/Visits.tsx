import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, MapPin, Trash2, Send, ArrowLeft, FileText, ExternalLink } from "lucide-react";
import {
  listVisits,
  createVisit,
  markVisitNotified,
  deleteVisit,
  signedSummonsUrl,
  buildDirectory,
  type LodgeVisit,
} from "@/lib/lodgeVisits";
import { sendEventInvite, formatEventEmailHtml } from "@/lib/sendEventInvite";
import { listMyGroups } from "@/lib/workingGroups";
import { supabase } from "@/integrations/supabase/client";

const VISITS_SLUGS = ["visits", "lodge-visits", "visiting"];
const BUCKET = "lodge-visits";
const VISITS_GROUP_SLUG = "visits";

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
function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Inner() {
  const { user, isAdmin, isWorshipfulMaster, isSecretary } = useAuth();
  const [canManage, setCanManage] = useState(isAdmin || isWorshipfulMaster || isSecretary);
  const [visits, setVisits] = useState<LodgeVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"visits" | "directory">("visits");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [lodgeName, setLodgeName] = useState("");
  const [lodgeNumber, setLodgeNumber] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [venue, setVenue] = useState("");
  const [cost, setCost] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [secretaryEmail, setSecretaryEmail] = useState("");
  const [secretaryName, setSecretaryName] = useState("");
  const [notes, setNotes] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [notifyAll, setNotifyAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setVisits(await listVisits());
        if (user && !canManage) {
          const my = await listMyGroups(user.id);
          if (my.some((g) => g.group && VISITS_SLUGS.includes(g.group.slug))) setCanManage(true);
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
    () => visits.filter((v) => new Date(v.starts_at) >= new Date()),
    [visits],
  );
  const past = useMemo(
    () => visits.filter((v) => new Date(v.starts_at) < new Date()),
    [visits],
  );
  const directory = useMemo(() => buildDirectory(visits), [visits]);

  const resetForm = () => {
    setLodgeName("");
    setLodgeNumber("");
    setStartsAt("");
    setEndsAt("");
    setVenue("");
    setCost("");
    setPaymentDetails("");
    setSecretaryEmail("");
    setSecretaryName("");
    setNotes("");
    setPdf(null);
    setNotifyAll(false);
    setShowForm(false);
  };

  const onSave = async () => {
    if (!lodgeName.trim() || !startsAt || !venue.trim() || !cost.trim() || !paymentDetails.trim() || !secretaryEmail.trim() || !pdf) {
      toast.error("All fields including the summons PDF are required");
      return;
    }
    if (pdf.type !== "application/pdf") {
      toast.error("Summons must be a PDF");
      return;
    }
    if (pdf.size > 10 * 1024 * 1024) {
      toast.error("PDF must be under 10 MB");
      return;
    }

    setSaving(true);
    try {
      const startIso = new Date(startsAt).toISOString();
      const endIso = endsAt ? new Date(endsAt).toISOString() : null;

      // Upload PDF
      const stamp = Date.now();
      const safeName = pdf.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const path = `${user?.id ?? "unknown"}/${stamp}-${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, pdf, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);

      const created = await createVisit({
        host_lodge_name: lodgeName.trim(),
        host_lodge_number: lodgeNumber.trim() || null,
        starts_at: startIso,
        ends_at: endIso,
        venue: venue.trim(),
        cost: cost.trim(),
        payment_details: paymentDetails.trim(),
        host_secretary_email: secretaryEmail.trim(),
        host_secretary_name: secretaryName.trim() || null,
        summons_storage_path: path,
        summons_filename: pdf.name,
        notes: notes.trim() || null,
        notify_scope: notifyAll ? "all_members" : "group",
      });

      const displayName = lodgeName.trim() + (lodgeNumber.trim() ? ` No. ${lodgeNumber.trim()}` : "");
      const html = formatEventEmailHtml({
        heading: `Visit to ${displayName}`,
        intro: "Brethren, a visit to another lodge has been arranged. Details are below and the host lodge's summons is attached.",
        fields: [
          { label: "When", value: fmt(startIso) + (endIso ? ` – ${fmt(endIso)}` : "") },
          { label: "Where", value: venue.trim() },
          { label: "Cost", value: cost.trim() },
          { label: "Payment", value: paymentDetails.trim().replace(/\n/g, "<br/>") },
          { label: "Contact", value: `${secretaryName.trim() || "Host Secretary"} — ${secretaryEmail.trim()}` },
        ],
        bodyHtml: notes.trim()
          ? `<p style="margin:0 0 12px 0;">${notes.trim().replace(/\n/g, "<br/>")}</p>`
          : undefined,
        footer: "S&F, Weybridge Lodge Visits Working Group",
      });

      const result = await sendEventInvite({
        event: {
          title: `Visit to ${displayName}`,
          description: `Cost: ${cost.trim()}. Contact: ${secretaryEmail.trim()}${notes.trim() ? `\n\n${notes.trim()}` : ""}`,
          location: venue.trim(),
          startTime: startIso,
          endTime: endIso ?? undefined,
        },
        subject: `Lodge Visit: ${displayName} — ${fmtDate(startIso)}`,
        html,
        memberScope: notifyAll
          ? { kind: "all_active" }
          : { kind: "working_group", slug: VISITS_GROUP_SLUG },
        pdf: { bucket: BUCKET, path, filename: pdf.name },
        idempotencyPrefix: `visit-${created.id}`,
        requireRole: ["admin", "secretary", "worshipful_master", "member"],
      });

      await markVisitNotified(created.id, result.sent);
      toast.success(`Invited ${result.sent} recipient${result.sent === 1 ? "" : "s"}`);
      setVisits(await listVisits());
      resetForm();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this visit record? The uploaded summons will also be removed.")) return;
    try {
      const visit = visits.find((v) => v.id === id);
      if (visit?.summons_storage_path) {
        await supabase.storage.from(BUCKET).remove([visit.summons_storage_path]);
      }
      await deleteVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const openPdf = async (path: string) => {
    const url = await signedSummonsUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Could not open PDF");
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
          <h1 className="font-serif text-2xl text-primary-foreground">Lodge Visits</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            Organise visits to other lodges and keep a directory of host lodges we know.
          </p>
        </div>
        {canManage && !showForm && tab === "visits" && (
          <Button onClick={() => setShowForm(true)} className="bg-gold text-navy hover:bg-gold/90">
            <MapPin className="w-4 h-4 mr-2" /> New Visit
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gold/20">
        {(["visits", "directory"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px ${
              tab === t
                ? "border-gold text-gold"
                : "border-transparent text-primary-foreground/60 hover:text-primary-foreground"
            }`}
          >
            {t === "directory" ? "Lodge Directory" : "Visits"}
          </button>
        ))}
      </div>

      {tab === "visits" && showForm && (
        <div className="rounded-sm border border-gold/30 bg-navy-dark/60 p-5 space-y-4">
          <h2 className="font-serif text-gold text-lg">New Lodge Visit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-primary-foreground/80">Host lodge name *</Label>
              <Input value={lodgeName} onChange={(e) => setLodgeName(e.target.value)} placeholder="Cobham Lodge" />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Lodge number</Label>
              <Input value={lodgeNumber} onChange={(e) => setLodgeNumber(e.target.value)} placeholder="4230" />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Starts *</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Ends</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-primary-foreground/80">Venue *</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Cobham Masonic Centre" />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Cost *</Label>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="£45 including dinner" />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Host Secretary email *</Label>
              <Input type="email" value={secretaryEmail} onChange={(e) => setSecretaryEmail(e.target.value)} placeholder="secretary@cobhamlodge.org.uk" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-primary-foreground/80">Host Secretary name</Label>
              <Input value={secretaryName} onChange={(e) => setSecretaryName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-primary-foreground/80">Payment details *</Label>
              <Textarea
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                rows={3}
                placeholder="Bank transfer — Sort code 12-34-56, Account 00000000, Ref: Weybridge visit"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-primary-foreground/80">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-primary-foreground/80">Summons PDF *</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-primary-foreground/50 mt-1">Max 10 MB — will be attached to the invite email.</p>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Checkbox
                id="notify-all"
                checked={notifyAll}
                onCheckedChange={(v) => setNotifyAll(Boolean(v))}
              />
              <Label htmlFor="notify-all" className="text-primary-foreground/80 cursor-pointer">
                Send to all active members (otherwise: Visits working group only)
              </Label>
            </div>
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
      ) : tab === "visits" ? (
        <>
          <VisitsList heading="Upcoming" items={upcoming} canManage={canManage} onDelete={onDelete} onOpenPdf={openPdf} />
          <VisitsList heading="Past" items={past} canManage={canManage} onDelete={onDelete} onOpenPdf={openPdf} dim />
        </>
      ) : (
        <DirectoryTable rows={directory} onOpenPdf={openPdf} />
      )}
    </div>
  );
}

function VisitsList({
  heading,
  items,
  canManage,
  onDelete,
  onOpenPdf,
  dim,
}: {
  heading: string;
  items: LodgeVisit[];
  canManage: boolean;
  onDelete: (id: string) => void;
  onOpenPdf: (path: string) => void;
  dim?: boolean;
}) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-primary-foreground/50 mb-2 mt-6">
        {heading}
      </h2>
      {items.length === 0 ? (
        <div className="text-sm text-primary-foreground/40 italic py-4">Nothing to show.</div>
      ) : (
        <div className="space-y-2">
          {items.map((v) => (
            <div
              key={v.id}
              className={`rounded-sm border border-gold/20 bg-navy-dark/40 p-4 ${dim ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-gold">
                    {v.host_lodge_name}
                    {v.host_lodge_number ? ` No. ${v.host_lodge_number}` : ""}
                  </h3>
                  <p className="text-xs text-primary-foreground/70 mt-1">
                    {fmt(v.starts_at)} • {v.venue}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-primary-foreground/80">
                    <div><span className="text-primary-foreground/50">Cost:</span> {v.cost}</div>
                    <div><span className="text-primary-foreground/50">Contact:</span> {v.host_secretary_email}</div>
                    <div className="sm:col-span-2"><span className="text-primary-foreground/50">Payment:</span> {v.payment_details}</div>
                  </div>
                  {v.notes && (
                    <p className="text-sm text-primary-foreground/70 mt-2 whitespace-pre-wrap">{v.notes}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => onOpenPdf(v.summons_storage_path)}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {v.summons_filename ?? "Summons PDF"}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    {v.notified_at && (
                      <span className="text-xs text-primary-foreground/40">
                        Invited {v.notified_member_count} on {fmtDate(v.notified_at)} ({v.notify_scope === "all_members" ? "all members" : "group only"})
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => onDelete(v.id)}
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

function DirectoryTable({
  rows,
  onOpenPdf,
}: {
  rows: ReturnType<typeof buildDirectory>;
  onOpenPdf: (path: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.lodge_name.toLowerCase().includes(s) ||
      r.venue.toLowerCase().includes(s) ||
      r.secretary_email.toLowerCase().includes(s)
    );
  });
  return (
    <div className="space-y-3 mt-4">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search lodge, venue or secretary email…"
        className="max-w-md"
      />
      {filtered.length === 0 ? (
        <div className="text-sm text-primary-foreground/40 italic py-4">
          No lodges yet — the directory populates automatically from visit entries.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-gold/20">
          <table className="w-full text-sm">
            <thead className="bg-navy-dark text-gold text-left">
              <tr>
                <th className="px-3 py-2 font-serif">Lodge</th>
                <th className="px-3 py-2 font-serif">Venue</th>
                <th className="px-3 py-2 font-serif">Secretary</th>
                <th className="px-3 py-2 font-serif">Last visited</th>
                <th className="px-3 py-2 font-serif">Summons on file</th>
              </tr>
            </thead>
            <tbody className="text-primary-foreground/85">
              {filtered.map((r) => (
                <tr key={r.lodge_name} className="border-t border-gold/10">
                  <td className="px-3 py-2">
                    {r.lodge_name}
                    {r.lodge_number ? ` No. ${r.lodge_number}` : ""}
                  </td>
                  <td className="px-3 py-2">{r.venue}</td>
                  <td className="px-3 py-2">
                    <a href={`mailto:${r.secretary_email}`} className="text-gold hover:underline">
                      {r.secretary_email}
                    </a>
                  </td>
                  <td className="px-3 py-2">{fmtDate(r.last_visited)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {r.summons_paths.map((s) => (
                        <button
                          key={s.path}
                          onClick={() => onOpenPdf(s.path)}
                          className="inline-flex items-center gap-1 text-xs text-gold hover:underline text-left"
                        >
                          <FileText className="w-3 h-3" />
                          {s.filename ?? "Summons"} ({fmtDate(s.visit_date)})
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LodgeVisitsPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
