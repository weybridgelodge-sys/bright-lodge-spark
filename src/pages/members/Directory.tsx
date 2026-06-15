import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { supabase } from "@/integrations/supabase/client";
import { Search, Mail, Phone } from "lucide-react";

type Member = {
  id: string;
  full_name: string | null;
  rank: string | null;
  office: string | null;
  joined_year: number | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export default function MembersDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id,full_name,rank,office,joined_year,email,phone,avatar_url")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setMembers((data as Member[]) ?? []));
  }, []);

  const filtered = members.filter((m) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return (
      (m.full_name ?? "").toLowerCase().includes(s) ||
      (m.office ?? "").toLowerCase().includes(s) ||
      (m.rank ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-2">Brethren Directory</h1>
        <p className="text-sm text-primary-foreground/60">Approved members of Weybridge Lodge.</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, rank, or office"
          className="w-full bg-navy-dark border border-gold/20 rounded-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gold"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-primary-foreground/50">No members to show.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-serif text-lg">
                  {(m.full_name ?? "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-base truncate">{m.full_name || "(No name)"}</p>
                  {m.rank && <p className="text-[11px] text-gold uppercase tracking-wider">{m.rank}</p>}
                </div>
              </div>
              {m.office && <p className="text-xs text-primary-foreground/70 mb-1">Office: {m.office}</p>}
              {m.joined_year && (
                <p className="text-xs text-primary-foreground/50 mb-2">Joined {m.joined_year}</p>
              )}
              <div className="space-y-1 text-xs">
                {m.email && (
                  <a href={`mailto:${m.email}`} className="flex items-center gap-2 text-primary-foreground/70 hover:text-gold">
                    <Mail className="w-3 h-3" /> {m.email}
                  </a>
                )}
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="flex items-center gap-2 text-primary-foreground/70 hover:text-gold">
                    <Phone className="w-3 h-3" /> {m.phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </MembersLayout>
  );
}
