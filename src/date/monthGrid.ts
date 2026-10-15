import { addDays, dayOfWeek, DayKey, makeDayKey, Weekday } from './dayKey';

/** Weeks shown for every month, so the calendar's height never changes between months. */
export const WEEKS_PER_MONTH = 6;

/**
 * The weeks to show for a month: always 6 weeks of 7 consecutive days starting on `weekStart`.
 * The first week is the one containing the 1st; the remaining cells run on into the next month.
 */
export function buildMonthGrid(year: number, month: number, weekStart: Weekday): DayKey[][] {
	const first = makeDayKey(year, month, 1);
	const lead = (dayOfWeek(first) - weekStart + 7) % 7;
	const gridStart = addDays(first, -lead);

	const weeks: DayKey[][] = [];
	for (let w = 0; w < WEEKS_PER_MONTH; w++) {
		const week: DayKey[] = [];
		for (let d = 0; d < 7; d++) week.push(addDays(gridStart, w * 7 + d));
		weeks.push(week);
	}
	return weeks;
}

/** The 7 weekdays in display order. */
export function weekdayOrder(weekStart: Weekday): Weekday[] {
	return Array.from({ length: 7 }, (_, i) => ((weekStart + i) % 7) as Weekday);
}
