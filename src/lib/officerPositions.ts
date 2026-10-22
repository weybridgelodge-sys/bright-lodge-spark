// One rule for which officer positions each consumer sees.
// Offices: everywhere they are used today. Representatives: only where the
// position's include_in[consumer] is true. Inactive positions are never listed.
export type PositionConsumer =
  | "summons" | "provincial_return" | "ugle_return" | "roll_ranking"
  | "progression" | "letters" | "kpis" | "directory" | "development";

export type PositionRow = {
  key: string;
  label: string;
  order_index: number;
  is_progressive?: boolean;
  category?: string | null;
  unit_id?: string | null;
  print_label?: string | null;
  active?: boolean | null;
  include_in?: Record<string, boolean> | null;
};

export function isRepresentative(p: Pick<PositionRow, "category"> | null | undefined): boolean {
  return p?.category === "representative";
}

/** Positions visible to `consumer` for `unitId` (shared defaults + the unit's own). */
export function positionsFor<T extends PositionRow>(rows: T[], consumer: PositionConsumer, unitId?: string | null): T[] {
  return rows
    .filter((p) => p.active !== false)
    .filter((p) => !p.unit_id || !unitId || p.unit_id === unitId)
    .filter((p) => !isRepresentative(p) || p.include_in?.[consumer] === true)
    .sort((a, b) => a.order_index - b.order_index);
}

/** For joined rows (appointment -> position): keep offices, and representatives only if opted in. */
export function includePosition(p: PositionRow | null | undefined, consumer: PositionConsumer): boolean {
  if (!p) return false;
  if (p.active === false) return false;
  return !isRepresentative(p) || p.include_in?.[consumer] === true;
}

export const POSITION_SELECT = "key,label,order_index,is_progressive,category,unit_id,print_label,active,include_in";
