import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Megaphone, CalendarDays, Hexagon } from "lucide-react";
import { listMyGroups } from "@/lib/workingGroups";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


type Notice = { id: string; title: string; body: string; event_date: string | null; created_at: string };
type Doc = { id: string; title: string; category: string; created_at: string };
type MyGroup = { role: "lead" | "member"; group: { id: string; slug: string; name: string; remit: string } | null };

export default function MembersDashboard() {
  const { profile, user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);


  useEffect(() => {
    supabase
      .from("member_notices")
      .select("id,title,body,event_date,created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setNotices((data as Notice[]) ?? []));
    supabase
      .from("lodge_documents")
      .select("id,title,category,created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setDocs((data as Doc[]) ?? []));
    if (user?.id) listMyGroups(user.id).then((g) => setMyGroups(g as MyGroup[]));
  }, [user?.id]);

  return (
    <MembersLayout>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-gold mb-2">
          Welcome, {(profile as { preferred_name?: string | null } | null)?.preferred_name?.trim() || profile?.first_name?.trim() || "Brother"}
        </h1>
        <p className="text-primary-foreground/60 text-sm">
          The private area for brethren of Weybridge Lodge No. 6787.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-navy-dark/60 border border-gold/15 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg text-gold">Latest notices</h2>
          </div>
          {notices.length === 0 ? (
            <p className="text-xs text-primary-foreground/50">No notices yet.</p>
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setActiveNotice(n)}
                    className="w-full text-left border-l-2 border-gold/40 pl-3 py-1 hover:border-gold hover:bg-gold/5 rounded-sm transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.event_date && (
                      <p className="text-[11px] text-gold flex items-center gap-1 mt-0.5">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(n.event_date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    )}
                    <p className="text-xs text-primary-foreground/60 mt-1 line-clamp-3 whitespace-pre-wrap">{n.body}</p>
                    <p className="text-[10px] text-gold/70 mt-1 uppercase tracking-wider">Click to read more</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>


        <section className="bg-navy-dark/60 border border-gold/15 rounded-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold" />
              <h2 className="font-serif text-lg text-gold">Recent documents</h2>
            </div>
            <Link to="/members/documents" className="text-xs text-gold hover:underline">
              View all →
            </Link>
          </div>
          {docs.length === 0 ? (
            <p className="text-xs text-primary-foreground/50">No documents have been uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{d.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-gold/70 shrink-0">{d.category}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 bg-navy-dark/60 border border-gold/15 rounded-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg text-gold">My Working Groups</h2>
          </div>
          <Link to="/members/working-groups" className="text-xs text-gold hover:underline">All groups →</Link>
        </div>
        {myGroups.length === 0 ? (
          <p className="text-xs text-primary-foreground/50">You are not yet assigned to a working group. Every brother has a role — speak with the Secretary.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myGroups.filter((g) => g.group).map((g) => (
              <Link key={g.group!.id} to={`/members/working-groups/${g.group!.slug}`}
                className={`text-xs px-3 py-1.5 rounded-sm border hover:bg-gold/10 ${g.role === "lead" ? "border-gold text-gold" : "border-gold/30 text-primary-foreground/85"}`}>
                {g.group!.name}{g.role === "lead" ? " · Lead" : ""}
              </Link>
            ))}
          </div>
        )}
      </section>
    </MembersLayout>
  );
}
