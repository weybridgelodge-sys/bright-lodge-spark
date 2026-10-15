// Pure public-event constants/formatting (no backend client), safe for build scripts.
export const DEFAULT_VENUE = "Guildford Masonic Centre, Hitherbury Close, Guildford GU2 4DR";
export const CHILD_MAX_AGE = 12;

export function formatEventDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
