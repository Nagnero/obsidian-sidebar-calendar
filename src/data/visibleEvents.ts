import type { CalendarEvent } from '../types';

export interface Visibility {
	/** Draw entries whose `start` equals `end` on the grid. The day list shows them either way. */
	showOneDay: boolean;
	/** Show done tasks on the grid and in the day list. */
	showDone: boolean;
}

/** The entries the day list and the month grid show. */
export function visibleEvents(
	events: readonly CalendarEvent[],
	{ showOneDay, showDone }: Visibility,
): { list: readonly CalendarEvent[]; grid: readonly CalendarEvent[] } {
	const list = showDone ? events : events.filter((e) => e.task !== 'done');
	return { list, grid: showOneDay ? list : list.filter((e) => e.start !== e.end) };
}
