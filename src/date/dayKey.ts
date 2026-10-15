/** A calendar date with no time or time zone, formatted as `YYYY-MM-DD`. */
export type DayKey = string;

/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function pad(n: number, width = 2): string {
	return String(n).padStart(width, '0');
}

// All arithmetic goes through UTC so local time zones and DST never shift a day.
function toUtcMs(key: DayKey): number {
	const [y, m, d] = key.split('-').map(Number) as [number, number, number];
	return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): DayKey {
	const date = new Date(ms);
	return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Builds a key from a year and a 1-based month and day, normalizing overflow (e.g. day 0). */
export function makeDayKey(year: number, month: number, day: number): DayKey {
	return fromUtcMs(Date.UTC(year, month - 1, day));
}

/** Returns the key if `value` is a real `YYYY-MM-DD` date, otherwise null. Rejects e.g. 2026-02-30. */
export function parseDayKey(value: string): DayKey | null {
	const match = DAY_KEY_RE.exec(value.trim());
	if (!match) return null;
	const [, y, m, d] = match.map(Number) as [number, number, number, number];
	const key = makeDayKey(y, m, d);
	return key === `${match[1]}-${match[2]}-${match[3]}` ? key : null;
}

export function addDays(key: DayKey, days: number): DayKey {
	return fromUtcMs(toUtcMs(key) + days * MS_PER_DAY);
}

/** Number of days from `a` to `b` (negative if `b` is earlier). */
export function diffDays(a: DayKey, b: DayKey): number {
	return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

export function dayOfWeek(key: DayKey): Weekday {
	return new Date(toUtcMs(key)).getUTCDay() as Weekday;
}

/** Year and 1-based month of a key. */
export function yearMonth(key: DayKey): { year: number; month: number } {
	const [y, m] = key.split('-').map(Number) as [number, number];
	return { year: y, month: m };
}

/** Today's date in the user's local time zone. */
export function todayKey(now: Date = new Date()): DayKey {
	return makeDayKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
