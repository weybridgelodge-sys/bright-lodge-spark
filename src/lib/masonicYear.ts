/**
 * Masonic year runs from the 3rd Wednesday in October to the day before
 * the 3rd Wednesday in October the following year (the Installation meeting).
 */

export function thirdWednesdayInOctober(year: number): Date {
  const d = new Date(year, 9, 15); // Oct 15 (month 0-indexed)
  while (d.getDay() !== 3) {
    d.setDate(d.getDate() + 1);
  }
  return new Date(Date.UTC(year, 9, d.getDate()));
}

export function currentMasonicYear(now = new Date()): number {
  const start = thirdWednesdayInOctober(now.getFullYear());
  return now >= start ? now.getFullYear() : now.getFullYear() - 1;
}

export function masonicYearBounds(year: number): { start: string; end: string; label: string } {
  const start = thirdWednesdayInOctober(year);
  const end = thirdWednesdayInOctober(year + 1);
  end.setDate(end.getDate() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${year}/${year + 1}`,
  };
}

export function masonicYearStartYear(d: Date = new Date()): number {
  return currentMasonicYear(d);
}
