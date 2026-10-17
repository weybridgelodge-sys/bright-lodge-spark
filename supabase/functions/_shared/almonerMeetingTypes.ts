// Single definition of which meetings count towards the Almoner "missed
// meetings" checks (check-in nudge, Auto-Log, KPI Disengagement Risk).
// Emergency meetings and cancelled meetings never count.
export const ALMONER_COUNTED_TYPES: readonly string[] = ['regular', 'installation', 'dispensation']

export function countsForAlmoner(m: { meeting_type: string; cancelled_at?: string | null }): boolean {
  return ALMONER_COUNTED_TYPES.includes(m.meeting_type) && !m.cancelled_at
}
