import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { supabase } from "@/integrations/supabase/client";
import { Search, Mail, Phone, MapPin } from "lucide-react";

type Member = {
  id: string;
  full_name: string | null;
  rank: string | null;
  office: string | null;
  joined_year: number | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
};

// Lodge year rolls over in October (installation season)
function currentLodgeYear(d = new Date()) {
  return d.getMonth() + 1 >= 10 ? d.getFullYear() : d.getFullYear() - 1;
}

export default function MembersDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [offices, setOffices] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase
        .from("profiles")
        .select("id,full_name,rank,office,joined_year,email,phone,avatar_url,address_line1,address_line2,address_line3,town,county,postcode")
        .eq("status", "active")
        .order("full_name");
      setMembers((m as Member[]) ?? []);

      const { data: a } = await supabase
        .from("officer_appointments")
        .select("member_id, position:officer_positions(label, order_index, is_progressive)")
        .eq("lodge_year", currentLodgeYear());

      const map: Record<string, { label: string; order: number; isProgressive: boolean }[]> = {};
      ((a as { member_id: string; position: { label: string; order_index: number; is_progressive: boolean } | null }[]) ?? []).forEach(
        (row) => {
          if (!row.position) return;
          (map[row.member_id] ??= []).push({
            label: row.position.label,
            order: row.position.order_index,
            isProgressive: row.position.is_progressive,
          });
        }
      );
      const flat: Record<string, string> = {};
      Object.entries(map).forEach(([k, list]) => {
        // Progressive offices first, then by seniority (order_index desc)
        list.sort((a, b) => {
          if (a.isProgressive !== b.isProgressive) {
            return a.isProgressive ? -1 : 1;
          }
          return b.order - a.order;
        });
        flat[k] = list.map((x) => x.label).join(", ");
      });
      setOffices(flat);
    })();
  }, []);

  const officeFor = (m: Member) => offices[m.id] ?? m.office ?? null;

  const filtered = members.filter((m) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return (
      (m.full_name ?? "").toLowerCase().includes(s) ||
      (officeFor(m) ?? "").toLowerCase().includes(s) ||
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
          {filtered.map((m) => {
            const office = officeFor(m);
            return (
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
                {office && <p className="text-xs text-primary-foreground/70 mb-1">Office: {office}</p>}
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
            );
          })}
        </div>
      )}
    </MembersLayout>
  );
}
