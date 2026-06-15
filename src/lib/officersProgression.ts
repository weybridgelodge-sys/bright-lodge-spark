// Progressive Officers projection logic for Weybridge Lodge No. 6787.
// Six offices, ordered junior → senior:
//   Inner Guard → Junior Deacon → Senior Deacon → Junior Warden → Senior Warden → Worshipful Master
// Each year, everyone advances one rung. The WM rolls off. The Inner Guard
// slot is filled from the readiness queue (members tagged `ready`, sorted by
// effective initiation date, oldest first, with optional tiebreaker).
// Manual overrides for a specific (year, position) lock that cell.

export const POSITION_ORDER = [
  "steward_5",
  "steward_4",
  "steward_3",
  "steward_2",
  "steward_1",
  "senior_steward",
  "inner_guard",
  "junior_deacon",
  "senior_deacon",
  "junior_warden",
  "senior_warden",
  "worshipful_master",
] as const;

export type PositionKey = (typeof POSITION_ORDER)[number];

export const POSITION_LABELS: Record<PositionKey, string> = {
  steward_5: "Steward 5",
  steward_4: "Steward 4",
  steward_3: "Steward 3",
  steward_2: "Steward 2",
  steward_1: "Steward 1",
  senior_steward: "Senior Steward",
  inner_guard: "Inner Guard",
  junior_deacon: "Junior Deacon",
  senior_deacon: "Senior Deacon",
  junior_warden: "Junior Warden",
  senior_warden: "Senior Warden",
  worshipful_master: "Worshipful Master",
};

// Non-progressive offices — appointed annually, no automatic progression.
export const NON_PROGRESSIVE_ORDER = [
  "immediate_past_master",
  "chaplain",
  "treasurer",
  "secretary",
  "assistant_secretary",
  "director_of_ceremonies",
  "assistant_director_of_ceremonies",
  "almoner",
  "charity_steward",
  "tyler",
  "assistant_tyler",
] as const;

export type NonProgressiveKey = (typeof NON_PROGRESSIVE_ORDER)[number];

export const NON_PROGRESSIVE_LABELS: Record<NonProgressiveKey, string> = {
  immediate_past_master: "Immediate Past Master",
  chaplain: "Chaplain",
  treasurer: "Treasurer",
  secretary: "Secretary",
  assistant_secretary: "Assistant Secretary",
  director_of_ceremonies: "Director of Ceremonies",
  assistant_director_of_ceremonies: "Assistant Director of Ceremonies",
  almoner: "Almoner",
  charity_steward: "Charity Steward",
  tyler: "Tyler",
  assistant_tyler: "Assistant Tyler",
};

export function tenureSince(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const start = new Date(isoDate);
  if (isNaN(start.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "less than a month";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${months} month${months === 1 ? "" : "s"}`;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${rem}m`;
}

// Masonic year runs October → September. Returns the starting calendar year.
// e.g. 15 Jun 2026 → 2025 (the 2025/26 year); 5 Oct 2026 → 2026 (2026/27).
export function masonicYear(d: Date = new Date()): number {
  return d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
}

// Format a Masonic year as "2026/27".
export function formatMasonicYear(y: number): string {
  const next = (y + 1) % 100;
  return `${y}/${next.toString().padStart(2, "0")}`;
}

export type MemberLite = {
  id: string;
  full_name: string | null;
  effective_initiation_date: string | null; // ISO date
  tiebreaker?: number | null;
};

export type Appointment = {
  position_key: PositionKey;
  member_id: string | null;
  lodge_year: number;
  is_projection: boolean;
  override_reason?: string | null;
  override_by_name?: string | null;
};

export type ProjectionCell = {
  position: PositionKey;
  year: number;
  member: MemberLite | null;
  isOverride: boolean;
  overrideReason?: string | null;
  overrideBy?: string | null;
  source: "current" | "advanced" | "filled" | "vacant";
};

export type Warning =
  | { kind: "vacant_feeder"; position: PositionKey; year: number }
  | { kind: "duplicate_initiation"; memberIds: string[]; date: string }
  | { kind: "gap"; position: PositionKey; year: number };

export function sortBySeniority(members: MemberLite[]): MemberLite[] {
  return [...members].sort((a, b) => {
    const ad = a.effective_initiation_date ?? "9999-12-31";
    const bd = b.effective_initiation_date ?? "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    const at = a.tiebreaker ?? 999999;
    const bt = b.tiebreaker ?? 999999;
    return at - bt;
  });
}

export function detectDuplicateInitiations(members: MemberLite[]): Warning[] {
  const byDate = new Map<string, MemberLite[]>();
  for (const m of members) {
    if (!m.effective_initiation_date) continue;
    if (m.tiebreaker != null) continue; // already disambiguated
    const arr = byDate.get(m.effective_initiation_date) ?? [];
    arr.push(m);
    byDate.set(m.effective_initiation_date, arr);
  }
  const out: Warning[] = [];
  for (const [date, arr] of byDate) {
    if (arr.length > 1) {
      out.push({ kind: "duplicate_initiation", date, memberIds: arr.map((m) => m.id) });
    }
  }
  return out;
}

export type ProjectionInput = {
  currentYear: number;
  yearsAhead: number; // e.g. 6 → produces currentYear..currentYear+6
  appointments: Appointment[]; // includes current + any future overrides
  readyQueue: MemberLite[]; // members tagged Ready, NOT currently on ladder
  membersById: Record<string, MemberLite>;
};

export type ProjectionResult = {
  years: number[];
  grid: Record<number, Record<PositionKey, ProjectionCell>>;
  warnings: Warning[];
  consumedReady: string[]; // member ids pulled into the ladder during projection
};

export function computeProjection(input: ProjectionInput): ProjectionResult {
  const { currentYear, yearsAhead, appointments, readyQueue, membersById } = input;
  const years = Array.from({ length: yearsAhead + 1 }, (_, i) => currentYear + i);

  // Index overrides
  const overrideMap = new Map<string, Appointment>();
  for (const a of appointments) {
    overrideMap.set(`${a.lodge_year}:${a.position_key}`, a);
  }

  const grid: Record<number, Record<PositionKey, ProjectionCell>> = {};
  const warnings: Warning[] = [];
  const consumedReady: string[] = [];
  const readySorted = sortBySeniority(readyQueue);
  let readyIdx = 0;

  // Seed current year from appointments (current year is authoritative)
  const emptyBoard = (): Record<PositionKey, string | null> =>
    Object.fromEntries(POSITION_ORDER.map((p) => [p, null])) as Record<PositionKey, string | null>;

  const currentBoard: Record<PositionKey, string | null> = emptyBoard();
  for (const a of appointments.filter((x) => x.lodge_year === currentYear)) {
    if ((POSITION_ORDER as readonly string[]).includes(a.position_key)) {
      currentBoard[a.position_key] = a.member_id;
    }
  }

  // Build current year cells
  grid[currentYear] = {} as Record<PositionKey, ProjectionCell>;
  for (const pos of POSITION_ORDER) {
    const memberId = currentBoard[pos];
    const ovr = overrideMap.get(`${currentYear}:${pos}`);
    grid[currentYear][pos] = {
      position: pos,
      year: currentYear,
      member: memberId ? membersById[memberId] ?? null : null,
      isOverride: !!ovr?.override_reason,
      overrideReason: ovr?.override_reason ?? null,
      overrideBy: ovr?.override_by_name ?? null,
      source: memberId ? "current" : "vacant",
    };
    if (!memberId) warnings.push({ kind: "vacant_feeder", position: pos, year: currentYear });
  }

  // Project each subsequent year
  let prevYearBoard = { ...currentBoard };
  for (let y = currentYear + 1; y <= currentYear + yearsAhead; y++) {
    const yearBoard: Record<PositionKey, string | null> = emptyBoard();

    // Advance everyone one rung up (idx 0 → 1 → 2 ... → 5 off the top)
    for (let i = 0; i < POSITION_ORDER.length - 1; i++) {
      const from = POSITION_ORDER[i];
      const to = POSITION_ORDER[i + 1];
      yearBoard[to] = prevYearBoard[from];
    }
    // Inner Guard slot from ready queue
    while (readyIdx < readySorted.length && consumedReady.includes(readySorted[readyIdx].id)) readyIdx++;
    const next = readySorted[readyIdx];
    if (next) {
      yearBoard.inner_guard = next.id;
      consumedReady.push(next.id);
      readyIdx++;
    }

    // Apply overrides (lock cells)
    for (const pos of POSITION_ORDER) {
      const ovr = overrideMap.get(`${y}:${pos}`);
      if (ovr) yearBoard[pos] = ovr.member_id;
    }

    grid[y] = {} as Record<PositionKey, ProjectionCell>;
    for (const pos of POSITION_ORDER) {
      const memberId = yearBoard[pos];
      const ovr = overrideMap.get(`${y}:${pos}`);
      const sourceCarried = !!prevYearBoard[POSITION_ORDER[Math.max(0, POSITION_ORDER.indexOf(pos) - 1)]];
      grid[y][pos] = {
        position: pos,
        year: y,
        member: memberId ? membersById[memberId] ?? null : null,
        isOverride: !!ovr,
        overrideReason: ovr?.override_reason ?? null,
        overrideBy: ovr?.override_by_name ?? null,
        source: memberId
          ? ovr
            ? "current"
            : pos === "inner_guard"
              ? "filled"
              : "advanced"
          : "vacant",
      };
      if (!memberId) {
        warnings.push({ kind: pos === "inner_guard" ? "vacant_feeder" : "gap", position: pos, year: y });
      }
    }

    prevYearBoard = yearBoard;
  }

  return { years, grid, warnings, consumedReady };
}
