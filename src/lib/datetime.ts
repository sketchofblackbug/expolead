const IST = "Asia/Calcutta";

export function formatLeadDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: IST,
  }).format(new Date(value));
}

/** Calendar date key in IST, e.g. 2026-11-18 */
export function istDateKey(value: Date | string = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isLeadFromToday(createdAt: string): boolean {
  return istDateKey(createdAt) === istDateKey();
}
