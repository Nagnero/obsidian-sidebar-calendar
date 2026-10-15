import type { DayKey } from '../date/dayKey';
import type { CalendarEvent } from '../types';

/** One event's bar within one week row. Columns are 0-based and inclusive. */
export interface BarSegment {
	event: CalendarEvent;
	startCol: number;
	endCol: number;
	/** 0-based row among the week's bars. */
	lane: number;
}

export interface WeekLayout {
	bars: BarSegment[];
	/** Number of bar rows actually used (0 to maxLanes). */
	laneCount: number;
	/** Per column: events on that day that did not fit in `maxLanes` rows. */
	hiddenCounts: number[];
}

/**
 * Places events into bar rows for one week (7 consecutive days).
 * For now only one-day events are placed: each day stacks its events top to bottom
 * in the given order, and those past `maxLanes` are counted as hidden.
 */
export function layoutWeek(week: readonly DayKey[], events: readonly CalendarEvent[], maxLanes: number): WeekLayout {
	const bars: BarSegment[] = [];
	const hiddenCounts = week.map(() => 0);
	let laneCount = 0;

	week.forEach((day, col) => {
		let lane = 0;
		for (const event of events) {
			if (event.start !== day || event.end !== day) continue;
			if (lane < maxLanes) {
				bars.push({ event, startCol: col, endCol: col, lane });
				laneCount = Math.max(laneCount, lane + 1);
			} else {
				hiddenCounts[col] = (hiddenCounts[col] ?? 0) + 1;
			}
			lane++;
		}
	});

	return { bars, laneCount, hiddenCounts };
}
