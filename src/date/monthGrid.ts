import type { Weekday } from './dayKey';

/** The 7 weekdays in display order. */
export function weekdayOrder(weekStart: Weekday): Weekday[] {
	return Array.from({ length: 7 }, (_, i) => ((weekStart + i) % 7) as Weekday);
}
