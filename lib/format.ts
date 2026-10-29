const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Dates arrive as YYYY-MM-DD and are calendar dates, not instants: format them without a time zone.
export function day(d: string | null | undefined): string {
  if (!d) return "";
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  return `${dd} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ""}`;
}

export function month(d: string | null | undefined): string {
  if (!d) return "";
  const [y, m] = d.slice(0, 7).split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function count(n: number | null | undefined, word: string, plural = `${word}s`): string {
  const v = n ?? 0;
  return `${v.toLocaleString("en-US")} ${v === 1 ? word : plural}`;
}

// How far a date is from the run's as-of day, in calendar days
export function daysFrom(d: string | null | undefined, asOf: string): number | null {
  if (!d) return null;
  return Math.round((Date.parse(d.slice(0, 10)) - Date.parse(asOf.slice(0, 10))) / 86_400_000);
}
