// Admin-only: one-shot bulk import of the 2026 Lodge Members List.
// Creates auth users for new members and fills in missing fields on existing
// profiles. Safe to re-run: existing profiles are matched by user_id (preferred)
// or by email; only NULL/empty fields are overwritten — never clobbers data.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Row = {
  match_id?: string;            // existing profiles.id if known (preferred)
  email: string;                // used to create the auth user OR match by email
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  initiation_date?: string | null;
  joined_lodge_date?: string | null;
  phone?: string | null;
  ugle_reg_number?: string | null;
  is_royal_arch?: boolean;
  is_honorary_member?: boolean;
  address_line1?: string | null;
  address_line2?: string | null;
  address_line3?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
};

// Roster from "Lodge Members List 2026". match_id pre-filled for the 5
// existing records so we update rather than create duplicates.
const ROSTER: Row[] = [
  { email: "chris.georgeburgess@btinternet.com", first_name: "Christopher George", last_name: "Burgess", date_of_birth: "1946-05-01", joined_lodge_date: "2023-05-10", phone: "07774 410410", ugle_reg_number: "9372628", is_honorary_member: true, is_royal_arch: false, address_line1: "Southern Palms", address_line2: "Kings Parade", town: "Bognor Regis", county: "West Sussex", postcode: "PO21 2QR" },
  { email: "john.t.coleman@btinternet.com", first_name: "John Thomas", last_name: "Coleman", date_of_birth: "1949-12-13", initiation_date: "1991-04-03", phone: "07879 408187", ugle_reg_number: "7023464", is_royal_arch: true, address_line1: "Silverwood", address_line2: "Glaziers Lane", address_line3: "Normandy", town: "Guildford", county: "Surrey", postcode: "GU3 2DE" },
  { email: "jvcfmmm@gmail.com", first_name: "John Vaughan Christopher", last_name: "French", date_of_birth: "1956-11-19", initiation_date: "1991-12-11", phone: "07780 590988", ugle_reg_number: "7084528", is_royal_arch: true, address_line1: "Plough Farm", address_line2: "Chalky Lane", address_line3: "Dogmersfield", town: "Hook", county: "Hampshire", postcode: "RG27 8TD" },
  { email: "kevinbrennan33@gmail.com", first_name: "Kevin Patrick", last_name: "Brennan", date_of_birth: "1956-09-07", initiation_date: "1996-02-21", phone: "07789 005336", ugle_reg_number: "769072A", is_royal_arch: true, address_line1: "26 The Street", address_line2: "Tongham", town: "Farnham", county: "Surrey", postcode: "GU10 1DH" },
  { email: "david.gleneyre@talktalk.net", first_name: "David John", last_name: "Poole", date_of_birth: "1943-11-13", joined_lodge_date: "2001-02-21", phone: "01483 810202", ugle_reg_number: "5691400", is_royal_arch: true, address_line1: "Glen Eyre", address_line2: "Seale Lane", address_line3: "Puttenham", town: "Guildford", county: "Surrey", postcode: "GU3 1AX" },

  // Existing: Richard Smith
  { match_id: "f547a26c-2c35-446a-8a8c-a095eacf60c3", email: "rsmith24381@yahoo.co.uk", first_name: "Richard Darren", last_name: "Smith", date_of_birth: "1981-03-24", initiation_date: "2007-02-21", phone: "07827 912362", ugle_reg_number: "9698302", is_royal_arch: true, address_line1: "4 Elm Place", town: "Aldershot", county: "Hampshire", postcode: "GU11 3SU" },

  { email: "youcanemailmurray@yahoo.co.uk", first_name: "Murray", last_name: "Grubb", date_of_birth: "1981-01-22", initiation_date: "2007-05-09", phone: "07561 143714", ugle_reg_number: "9747478", is_royal_arch: true, address_line1: "13 The Croft", address_line2: "Ash Green", town: "Aldershot", county: "Hampshire", postcode: "GU12 6FA" },
  { email: "amallard@btinternet.com", first_name: "Anthony John", last_name: "Mallard", date_of_birth: "1948-02-29", joined_lodge_date: "2008-10-15", phone: "01483 532891", ugle_reg_number: "2710730", is_royal_arch: false, address_line1: "St Thomas Wateryng", address_line2: "26 Great Oaks Park", town: "Guildford", county: "Surrey", postcode: "GU4 7JG" },
  { email: "jongowerscott@gmail.com", first_name: "Jonathon Gower Shenton", last_name: "Scott", date_of_birth: "1980-05-30", initiation_date: "2010-05-12", phone: "07941 429733", ugle_reg_number: "10045353", is_royal_arch: false, address_line1: "Westwood House", address_line2: "School Lane", address_line3: "Ockham", town: "Woking", county: "Surrey", postcode: "GU23 6PA" },

  // Existing: Ben Connolly (keep existing email ben_charles_connolly@hotmail.com)
  { match_id: "ba2520a7-a1d6-4c5a-8712-9df54381942c", email: "ben_charles_connolly@hotmail.com", first_name: "Benjamin Charles", last_name: "Connolly", date_of_birth: "1977-10-03", initiation_date: "2011-12-14", phone: "07799 260652", ugle_reg_number: "10201371", is_royal_arch: true, address_line1: "19 The Gardens", address_line2: "Tongham", town: "Farnham", county: "Surrey", postcode: "GU10 1DZ" },

  // Existing: Ken Holdsworth
  { match_id: "4c3fbcac-baa5-45a5-8eb1-5d8d012de07d", email: "kennethholdsworth@yahoo.co.uk", first_name: "Kenneth Neill", last_name: "Holdsworth", date_of_birth: "1956-03-30", joined_lodge_date: "2017-12-13", phone: "07513 150663", ugle_reg_number: "10279265", is_royal_arch: true, address_line1: "17 Old Rectory Close", address_line2: "Bramley", town: "Guildford", county: "Surrey", postcode: "GU5 0JR" },

  { email: "bob.cooper@outlook.com", first_name: "Robert James", last_name: "Cooper", date_of_birth: "1951-05-02", initiation_date: "2018-12-12", phone: "07932 469286", ugle_reg_number: "10840595", is_royal_arch: false, address_line1: "39 The Croft", address_line2: "Ash Green", town: "Aldershot", county: "Hampshire", postcode: "GU12 6FA" },

  // Existing: Julien Tidmarsh
  { match_id: "de693c92-6f3d-49b6-afc3-406fc4c0acd9", email: "julientidmarsh@pm.me", first_name: "Julien Philip", last_name: "Tidmarsh", date_of_birth: "1968-07-01", initiation_date: "2019-05-08", phone: "07921 589039", ugle_reg_number: "10920793", is_royal_arch: true, address_line1: "Da Kine, Upper Pinewood Road", address_line2: "Ash", town: "Aldershot", county: "Hampshire", postcode: "GU12 6DL" },

  { email: "w.burrell@hotmail.co.uk", first_name: "William", last_name: "Burrell", date_of_birth: "1991-04-21", initiation_date: "2022-02-16", phone: "07810 308681", ugle_reg_number: "11036218", is_royal_arch: false, address_line1: "137 Ash Street", address_line2: "Ash", town: "Aldershot", county: "Hampshire", postcode: "GU12 6LJ" },
  { email: "will.smyth@gmail.com", first_name: "William James", last_name: "Aldington-Smyth", date_of_birth: "1975-07-06", initiation_date: "2022-03-30", phone: "07525 952219", ugle_reg_number: "11341355", is_royal_arch: false, address_line1: "The Cottage", address_line2: "Maybury Hill", town: "Woking", county: "Surrey", postcode: "GU22 8AF" },
  { email: "calvin.gower@gmail.com", first_name: "Calvin Peter", last_name: "Gower", date_of_birth: "1977-02-22", initiation_date: "2022-05-11", phone: "07500 939166", ugle_reg_number: "11341371", is_royal_arch: false, address_line1: "Cottage 1, Plough Farm", address_line2: "Chalky Lane", address_line3: "Dogmersfield", town: "Hook", county: "Hampshire", postcode: "RG27 8TD" },
  { email: "pavelvrtak@icloud.com", first_name: "Pavel", last_name: "Vrtak", date_of_birth: "1970-03-26", initiation_date: "2023-12-13", phone: "07919 127508", ugle_reg_number: "11341401", is_royal_arch: false, address_line1: "27 The Croft", address_line2: "Ash Green", town: "Aldershot", county: "Hampshire", postcode: "GU12 6FA" },
  { email: "David.Blackburn01@yahoo.com", first_name: "David John", last_name: "Blackburn", date_of_birth: "1971-06-12", initiation_date: "2024-12-11", phone: "07590 188877", ugle_reg_number: "11416762", is_royal_arch: false, address_line1: "Little Copse", address_line2: "Chaucer Way", town: "Addlestone", county: "Surrey", postcode: "KT15 1LG" },
  { email: "s.stamper@mac.com", first_name: "Simon William", last_name: "Stamper", date_of_birth: "1962-02-26", joined_lodge_date: "2025-10-15", phone: "07951 153691", ugle_reg_number: "4964616", is_royal_arch: true, address_line1: "70 Broadoaks Park Road", town: "West Byfleet", county: "Surrey", postcode: "KT14 6FE" },
  { email: "jejbishop@gmail.com", first_name: "Jesse Edward James", last_name: "Bishop", date_of_birth: "1994-10-11", initiation_date: "2025-12-10", phone: "07395 710371", is_royal_arch: false, address_line1: "141 Morland Road", town: "Aldershot", county: "Hampshire", postcode: "GU11 3SG" },
  { email: "bishopjosh01@gmail.com", first_name: "Joshua David", last_name: "Bishop", date_of_birth: "1991-06-13", initiation_date: "2025-12-10", phone: "07847 198862", is_royal_arch: false, address_line1: "Flat 3, 13 Headley Way", address_line2: "Ash", town: "Aldershot", county: "Hampshire", postcode: "GU12 6GQ" },
  { email: "tonytherob@aol.com", first_name: "Anthony James", last_name: "Robertson", date_of_birth: "1969-05-19", initiation_date: "2026-02-18", phone: "07903 642682", is_royal_arch: false, address_line1: "1a High View Road", town: "Guildford", county: "Surrey", postcode: "GU2 7RS" },
  { email: "sdbradley_86@yahoo.co.uk", first_name: "Steven Daniel", last_name: "Bradley", date_of_birth: "1986-04-26", initiation_date: "2026-02-18", phone: "07794 989612", is_royal_arch: false, address_line1: "4 Pike Close", town: "Aldershot", county: "Hampshire", postcode: "GU11 2QS" },

  // Existing: Peter Law (keep existing email peterlaw@x.com)
  { match_id: "40192a1a-1990-48a5-b360-f67ce5c965d8", email: "peterlaw@x.com", first_name: "Peter James", last_name: "Law", date_of_birth: "1977-05-13", initiation_date: "2026-05-13", phone: "07817 933297", is_royal_arch: false, address_line1: "1 Foreman Park", address_line2: "Ash", town: "Aldershot", county: "Hampshire", postcode: "GU12 6JN" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userRes.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden — admins only" }, 403);

    const results: any[] = [];

    for (const r of ROSTER) {
      try {
        let userId = r.match_id ?? null;

        // 1) Resolve user id: match_id wins, else look up by email in profiles.
        if (!userId) {
          const { data: existing } = await admin
            .from("profiles")
            .select("id")
            .eq("email", r.email)
            .maybeSingle();
          if (existing) userId = existing.id;
        }

        // 2) Create the auth user if still not found.
        let created = false;
        if (!userId) {
          const full_name = `${r.first_name} ${r.last_name}`.trim();
          const { data: c, error: cerr } = await admin.auth.admin.createUser({
            email: r.email,
            email_confirm: true,
            user_metadata: { full_name },
          });
          if (cerr || !c.user) {
            results.push({ email: r.email, status: "error", error: cerr?.message ?? "createUser failed" });
            continue;
          }
          userId = c.user.id;
          created = true;
        }

        // 3) Fetch current profile so we only fill blanks (never clobber).
        const { data: prof } = await admin
          .from("profiles")
          .select("first_name,last_name,full_name,date_of_birth,initiation_date,joined_lodge_date,phone,ugle_reg_number,is_royal_arch,is_honorary_member,status,address_line1,address_line2,address_line3,town,county,postcode")
          .eq("id", userId!)
          .maybeSingle();

        const empty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

        const updates: Record<string, unknown> = {};
        if (empty(prof?.first_name)) updates.first_name = r.first_name;
        if (empty(prof?.last_name)) updates.last_name = r.last_name;
        if (empty(prof?.date_of_birth) && r.date_of_birth) updates.date_of_birth = r.date_of_birth;
        if (empty(prof?.initiation_date) && r.initiation_date) updates.initiation_date = r.initiation_date;
        if (empty(prof?.joined_lodge_date) && r.joined_lodge_date) updates.joined_lodge_date = r.joined_lodge_date;
        if (empty(prof?.phone) && r.phone) updates.phone = r.phone;
        if (empty(prof?.ugle_reg_number) && r.ugle_reg_number) updates.ugle_reg_number = r.ugle_reg_number;
        if (r.is_royal_arch && !prof?.is_royal_arch) updates.is_royal_arch = true;
        if (r.is_honorary_member && !prof?.is_honorary_member) updates.is_honorary_member = true;

        // Address fields — only fill blanks (use revised 2026 list values).
        if (empty(prof?.address_line1) && r.address_line1) updates.address_line1 = r.address_line1;
        if (empty(prof?.address_line2) && r.address_line2) updates.address_line2 = r.address_line2;
        if (empty(prof?.address_line3) && r.address_line3) updates.address_line3 = r.address_line3;
        if (empty(prof?.town) && r.town) updates.town = r.town;
        if (empty(prof?.county) && r.county) updates.county = r.county;
        if (empty(prof?.postcode) && r.postcode) updates.postcode = r.postcode;

        // full_name: only set if blank
        if (empty(prof?.full_name)) {
          updates.full_name = `${r.first_name} ${r.last_name}`.trim();
        }

        // Default status for new users → active (so they show in directory).
        if (created) updates.status = "active";

        if (Object.keys(updates).length > 0) {
          const { error: uperr } = await admin.from("profiles").update(updates).eq("id", userId!);
          if (uperr) {
            results.push({ email: r.email, status: "error", error: uperr.message });
            continue;
          }
        }

        results.push({
          email: r.email,
          user_id: userId,
          action: created ? "created" : Object.keys(updates).length ? "updated" : "no-change",
          fields_set: Object.keys(updates),
        });
      } catch (e) {
        results.push({ email: r.email, status: "error", error: (e as Error).message });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter((x) => x.action === "created").length,
      updated: results.filter((x) => x.action === "updated").length,
      no_change: results.filter((x) => x.action === "no-change").length,
      errors: results.filter((x) => x.status === "error").length,
    };
    return json({ ok: true, summary, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
