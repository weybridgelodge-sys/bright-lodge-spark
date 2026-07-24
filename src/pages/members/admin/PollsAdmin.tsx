import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, X, Lock, BarChart3 } from "lucide-react";

type Poll = {
  id: string;
  question: string;
  options: string[];
  results_visibility: "live" | "on_close";
  status: "open" | "closed";
  closes_at: string | null;
  created_at: string;
};

type Vote = { poll_id: string; option_index: number };

function Inner() {
  const { isAdmin, isSecretary, isWorshipfulMaster } = useAuth();
  const canManage = isAdmin || isSecretary || isWorshipfulMaster;

  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [closesAt, setClosesAt] = useState("");
  const [liveResults, setLiveResults] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("polls" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setPolls((data as any) ?? []);
    const { data: v } = await supabase.from("poll_votes" as any).select("poll_id,option_index");
    setVotes((v as any) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("polls-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const createPoll = async () => {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      toast.error("Add a question and at least 2 options.");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase
      .from("polls" as any)
      .insert({
        question: q,
        options: opts,
        results_visibility: liveResults ? "live" : "on_close",
        status: "open",
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        created_by: u.user?.id,
      } as any)
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    // Fire-and-await email notification to all active members.
    try {
      const { data: notifyRes, error: notifyErr } = await supabase.functions.invoke(
        "notify-poll-opened",
        { body: { poll_id: (inserted as any).id } },
      );
      if (notifyErr) throw notifyErr;
      const sent = (notifyRes as any)?.sent ?? 0;
      toast.success(`Poll created — notified ${sent} member${sent === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.success("Poll created");
      toast.error(`Notification email failed: ${e?.message ?? "unknown error"}`);
    }
    setSaving(false);
    setQuestion("");
    setOptions(["", ""]);
    setClosesAt("");
    setLiveResults(true);
    load();
  };

  const closePoll = async (id: string) => {
    if (!confirm("Close this poll now?")) return;
    const { error } = await supabase.from("polls" as any).update({ status: "closed" } as any).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Poll closed");
      load();
    }
  };

  const deletePoll = async (id: string) => {
    if (!confirm("Delete this poll and all its votes?")) return;
    const { error } = await supabase.from("polls" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const tally = (p: Poll) => {
    const counts = new Array(p.options.length).fill(0);
    votes.filter((v) => v.poll_id === p.id).forEach((v) => {
      if (v.option_index >= 0 && v.option_index < counts.length) counts[v.option_index]++;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    return { counts, total };
  };

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Polls & Voting</h1>
        <p className="text-primary-foreground/60 text-sm">Ask the brethren a question. Results appear on the Dashboard.</p>
      </header>

      {canManage && (
        <section className="mb-8 bg-navy-dark/60 border border-gold/20 rounded-sm p-6">
          <h2 className="font-serif text-lg text-gold mb-4">Create a poll</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-primary-foreground/80">Question</Label>
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Which charity should we support next?" />
            </div>
            <div>
              <Label className="text-primary-foreground/80">Options</Label>
              <div className="space-y-2 mt-1">
                {options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={o}
                      onChange={(e) => setOptions(options.map((x, j) => (i === j ? e.target.value : x)))}
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <Button type="button" variant="outline" size="icon" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
                  <Plus className="w-4 h-4 mr-1" /> Add option
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-primary-foreground/80">Closes at (optional)</Label>
                <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-primary-foreground/85 cursor-pointer">
                  <input type="checkbox" checked={liveResults} onChange={(e) => setLiveResults(e.target.checked)} className="accent-gold" />
                  Show live results to members
                </label>
              </div>
            </div>
            <Button onClick={createPoll} disabled={saving} className="bg-gold text-navy hover:bg-gold/90">
              {saving ? "Saving…" : "Create poll"}
            </Button>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-serif text-lg text-gold mb-4">All polls</h2>
        {polls.length === 0 ? (
          <p className="text-sm text-primary-foreground/60">No polls yet.</p>
        ) : (
          <div className="space-y-4">
            {polls.map((p) => {
              const { counts, total } = tally(p);
              const isOpen = p.status === "open" && (!p.closes_at || new Date(p.closes_at) > new Date());
              return (
                <div key={p.id} className="bg-navy-dark/60 border border-gold/20 rounded-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-serif text-primary-foreground text-lg">{p.question}</p>
                      <p className="text-xs text-primary-foreground/60 mt-1">
                        {isOpen ? <span className="text-gold">Open</span> : <span>Closed</span>}
                        {" · "}
                        {p.results_visibility === "live" ? "Live results" : "Results on close"}
                        {p.closes_at && ` · closes ${new Date(p.closes_at).toLocaleString("en-GB")}`}
                        {" · "}{total} vote{total === 1 ? "" : "s"}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        {isOpen && (
                          <Button size="sm" variant="outline" onClick={() => closePoll(p.id)}>
                            <Lock className="w-3 h-3 mr-1" /> Close
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => deletePoll(p.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {p.options.map((opt, i) => {
                      const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-primary-foreground/90">{opt}</span>
                            <span className="text-gold/80">{counts[i]} · {pct}%</span>
                          </div>
                          <div className="h-2 bg-navy border border-gold/15 rounded-sm overflow-hidden">
                            <div className="h-full bg-gold/70" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </MembersLayout>
  );
}

export default function PollsAdmin() {
  return (
    <ProtectedRoute>
      <Inner />
    </ProtectedRoute>
  );
}
