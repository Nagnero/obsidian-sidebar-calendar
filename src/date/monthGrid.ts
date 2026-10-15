import { addDays, dayOfWeek, DayKey, diffDays, makeDayKey, Weekday } from './dayKey';

/**
 * The weeks to show for a month: every week that contains at least one day of it,
 * each as 7 consecutive days starting on `weekStart`. Returns 4 to 6 weeks.
 */
export function buildMonthGrid(year: number, month: number, weekStart: Weekday): DayKey[][] {
	const first = makeDayKey(year, month, 1);
	const last = makeDayKey(year, month + 1, 0);

	const lead = (dayOfWeek(first) - weekStart + 7) % 7;
	const gridStart = addDays(first, -lead);
	const weekCount = Math.ceil((diffDays(gridStart, last) + 1) / 7);

	const weeks: DayKey[][] = [];
	for (let w = 0; w < weekCount; w++) {
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
