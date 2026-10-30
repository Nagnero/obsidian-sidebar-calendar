import { addDays, dayOfWeek, DayKey, diffDays, makeDayKey, Weekday, yearMonth } from './dayKey';

/** The rows the calendar shows: `rows` consecutive weeks, the first starting on `top`. */
export interface WeekWindow {
	top: DayKey;
	rows: number;
}

/** The first day of the week holding `day`, for weeks starting on `weekStart`. */
export function startOfWeek(day: DayKey, weekStart: Weekday): DayKey {
	return addDays(day, -((dayOfWeek(day) - weekStart + 7) % 7));
}

/** A month's own rows: from the week holding the 1st to the week holding its last day. */
export function monthWindow(year: number, month: number, weekStart: Weekday): WeekWindow {
	const next = month === 12 ? makeDayKey(year + 1, 1, 1) : makeDayKey(year, month + 1, 1);
	const top = startOfWeek(makeDayKey(year, month, 1), weekStart);
	const lastRow = startOfWeek(addDays(next, -1), weekStart);
	return { top, rows: diffDays(top, lastRow) / 7 + 1 };
}

/** The window's weeks, 7 days each. */
export function windowWeeks({ top, rows }: WeekWindow): DayKey[][] {
	return Array.from({ length: rows }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(top, w * 7 + d)));
}

/**
 * The month the window is named after: the month of its top row's last day, so the top row
 * decides it and a row that starts a month belongs to that month.
 */
export function windowMonth({ top }: WeekWindow): { year: number; month: number } {
	return yearMonth(addDays(top, 6));
}
