import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Vote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Poll = {
  id: string;
  question: string;
  options: string[];
  results_visibility: "live" | "on_close";
  status: "open" | "closed";
  closes_at: string | null;
};

type VoteRow = { poll_id: string; option_index: number; member_id: string };

export default function ActivePoll() {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPoll = async () => {
    const { data } = await supabase
      .from("polls" as any)
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const p = (data as any) as Poll | null;
    if (p && p.closes_at && new Date(p.closes_at) <= new Date()) {
      setPoll(null);
      return;
    }
    setPoll(p);
  };

  const loadVotes = async (pollId: string) => {
    const { data } = await supabase
      .from("poll_votes" as any)
      .select("poll_id,option_index,member_id")
      .eq("poll_id", pollId);
    const rows = ((data as any) ?? []) as VoteRow[];
    setVotes(rows);
    const mine = rows.find((r) => r.member_id === user?.id);
    setMyVote(mine ? mine.option_index : null);
  };

  useEffect(() => {
    loadPoll();
  }, []);

  useEffect(() => {
    if (!poll) return;
    loadVotes(poll.id);
    const ch = supabase
      .channel(`poll-${poll.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${poll.id}` },
        () => loadVotes(poll.id)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "polls", filter: `id=eq.${poll.id}` },
        (payload) => {
          const next = payload.new as any;
          if (next.status !== "open") setPoll(null);
          else setPoll(next);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [poll?.id, user?.id]);

  const cast = async (index: number) => {
    if (!user || !poll) return;
    setSubmitting(true);
    const { error } = await supabase.from("poll_votes" as any).insert({
      poll_id: poll.id,
      member_id: user.id,
      option_index: index,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "You've already voted." : error.message);
      return;
    }
    setMyVote(index);
    toast.success("Vote recorded");
  };

  if (!poll) return null;

  const showResults = poll.results_visibility === "live" && myVote !== null;
  const counts = new Array(poll.options.length).fill(0);
  votes.forEach((v) => {
    if (v.option_index >= 0 && v.option_index < counts.length) counts[v.option_index]++;
  });
  const total = counts.reduce((a: number, b: number) => a + b, 0);

  return (
    <section className="mb-6 bg-navy-dark/60 border border-gold/30 rounded-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Vote className="w-4 h-4 text-gold" />
        <h2 className="font-serif text-lg text-gold">Lodge Poll</h2>
        {poll.results_visibility === "live" && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-gold/70">Live results</span>
        )}
      </div>
      <p className="font-serif text-primary-foreground text-xl mb-4">{poll.question}</p>

      {myVote === null ? (
        <div className="space-y-2">
          {poll.options.map((opt, i) => (
            <button
              key={i}
              disabled={submitting}
              onClick={() => cast(i)}
              className="w-full text-left px-4 py-3 border border-gold/30 rounded-sm hover:border-gold hover:bg-gold/10 transition-colors text-primary-foreground disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : showResults ? (
        <div className="space-y-3">
          {poll.options.map((opt, i) => {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            const mine = myVote === i;
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`${mine ? "text-gold" : "text-primary-foreground/90"} flex items-center gap-1`}>
                    {mine && <CheckCircle2 className="w-3 h-3" />} {opt}
                  </span>
                  <span className="text-gold/80">{counts[i]} · {pct}%</span>
                </div>
                <div className="h-2 bg-navy border border-gold/15 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${mine ? "bg-gold" : "bg-gold/50"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-primary-foreground/60 pt-2">
            {total} vote{total === 1 ? "" : "s"} · updating live
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-primary-foreground/80 bg-gold/5 border border-gold/20 rounded-sm px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-gold" />
          Your vote is recorded. Results will be published when the poll closes.
        </div>
      )}
    </section>
  );
}
