// Single definition of which meetings count towards the Almoner "missed
// meetings" checks (check-in nudge, Auto-Log, daily check, KPI Disengagement
// Risk). Every meeting type counts, including any added in future; only a
// cancelled meeting (it never took place) is excluded. A future unit setting
// can narrow this here.
export function countsForAlmoner(m: { meeting_type: string; cancelled_at?: string | null }): boolean {
  return !m.cancelled_at
}
