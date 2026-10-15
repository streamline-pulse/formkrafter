/**
 * Appointment slots: either generated from opening rules (weekdays, hours,
 * duration, horizon, closed dates) or served by a URL as a list. A slot is
 * `{ id, start, end, remaining? }` with ISO local datetimes (no timezone:
 * the organisation's clock), `remaining` undefined meaning unlimited.
 */

export interface Slot {
  id: string;
  /** ISO 8601 without offset, e.g. 2026-10-20T09:00. */
  start: string;
  end: string;
  remaining?: number;
}

export interface SlotRules {
  /** Weekdays open, 1 = Monday … 7 = Sunday. Default Monday to Friday. */
  days?: number[];
  /** Opening hour, "08:00". */
  from?: string;
  /** Closing hour, "17:00". */
  to?: string;
  /** Slot length in minutes. */
  duration?: number;
  /** How many days ahead can be booked. */
  horizonDays?: number;
  /** Days that must be booked at least this many hours ahead. */
  noticeHours?: number;
  /** Closed dates, "2026-12-25". */
  exclude?: string[];
}

const pad = (n: number) => String(n).padStart(2, "0");

const localIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const slotDate = (iso: string) => iso.slice(0, 10);

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Monday = 1 … Sunday = 7, as the rules expect. */
const weekday = (date: Date) => ((date.getDay() + 6) % 7) + 1;

export function generateSlots(rules: SlotRules, now: Date = new Date()): Slot[] {
  const days = rules.days?.length ? rules.days : [1, 2, 3, 4, 5];
  const open = minutes(rules.from ?? "08:00");
  const close = minutes(rules.to ?? "17:00");
  const duration = Math.max(5, rules.duration ?? 30);
  const horizon = Math.max(1, rules.horizonDays ?? 14);
  const notice = (rules.noticeHours ?? 0) * 60;
  const exclude = new Set(rules.exclude ?? []);
  const earliest = new Date(now.getTime() + notice * 60_000);
  const out: Slot[] = [];
  for (let offset = 0; offset < horizon; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!days.includes(weekday(day)) || exclude.has(localIso(day).slice(0, 10))) continue;
    for (let m = open; m + duration <= close; m += duration) {
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
      if (start < earliest) continue;
      const end = new Date(start.getTime() + duration * 60_000);
      const startIso = localIso(start);
      out.push({ id: startIso, start: startIso, end: localIso(end) });
    }
  }
  return out;
}

/** Reads a provider answer: an array, or `{ slots: [...] }` / `{ data: [...] }`. */
export function readSlots(payload: unknown): Slot[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as { slots?: unknown; data?: unknown }).slots ?? (payload as { data?: unknown }).data)
      : undefined;
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? item.start ?? ""),
      start: String(item.start ?? ""),
      end: String(item.end ?? ""),
      ...(typeof item.remaining === "number" ? { remaining: item.remaining } : {}),
    }))
    .filter((slot) => slot.id && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(slot.start));
}

/** Slots grouped by day, in order, bookable ones only. */
export function groupSlotsByDay(slots: Slot[]): { day: string; slots: Slot[] }[] {
  const byDay = new Map<string, Slot[]>();
  for (const slot of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    if (slot.remaining !== undefined && slot.remaining <= 0) continue;
    const day = slotDate(slot.start);
    byDay.set(day, [...(byDay.get(day) ?? []), slot]);
  }
  return [...byDay.entries()].map(([day, list]) => ({ day, slots: list }));
}
