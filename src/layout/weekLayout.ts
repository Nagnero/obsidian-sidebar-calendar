import { DayKey, diffDays } from '../date/dayKey';
import type { CalendarEvent } from '../types';

/** One event's bar within one week row. Columns are 0-based and inclusive. */
export interface BarSegment {
	event: CalendarEvent;
	startCol: number;
	endCol: number;
	/** 0-based row among the week's bars. */
	lane: number;
	/** The event started before this week. */
	continuesBefore: boolean;
	/** The event ends after this week. */
	continuesAfter: boolean;
}

export interface WeekLayout {
	/** Visible bars only (lane < maxLanes). */
	bars: BarSegment[];
	/** Number of bar rows actually used (0 to maxLanes). */
	laneCount: number;
	/** Per column: events on that day whose bar did not fit in `maxLanes` rows. */
	hiddenCounts: number[];
}

type Segment = Omit<BarSegment, 'lane'>;

/** The part of each event that falls inside the week, in input order. */
export function splitIntoWeek(week: readonly DayKey[], events: readonly CalendarEvent[]): Segment[] {
	const first = week[0];
	const last = week[week.length - 1];
	if (first === undefined || last === undefined) return [];

	const segments: Segment[] = [];
	for (const event of events) {
		if (event.end < first || event.start > last) continue;
		segments.push({
			event,
			startCol: Math.max(0, diffDays(first, event.start)),
			endCol: Math.min(week.length - 1, diffDays(first, event.end)),
			continuesBefore: event.start < first,
			continuesAfter: event.end > last,
		});
	}
	return segments;
}

/**
 * Places events into bar rows for one week (7 consecutive days).
 *
 * Segments are ordered by start column, then longer first, then input order, and each takes
 * the lowest row that is free on every day it covers. A segment whose row is `maxLanes` or
 * more is hidden as a whole and counted in `hiddenCounts` for each day it covers.
 */
export function layoutWeek(week: readonly DayKey[], events: readonly CalendarEvent[], maxLanes: number): WeekLayout {
	const ordered = splitIntoWeek(week, events)
		.map((segment, index) => ({ segment, index }))
		.sort(
			(a, b) =>
				a.segment.startCol - b.segment.startCol ||
				b.segment.endCol - b.segment.startCol - (a.segment.endCol - a.segment.startCol) ||
				a.index - b.index,
		)
		.map(({ segment }) => segment);

	// occupied[lane][col]
	const occupied: boolean[][] = [];
	const bars: BarSegment[] = [];
	const hiddenCounts = week.map(() => 0);
	let laneCount = 0;

	for (const segment of ordered) {
		let lane = 0;
		while (!isFree(occupied[lane], segment.startCol, segment.endCol)) lane++;
		const row = (occupied[lane] ??= week.map(() => false));
		for (let col = segment.startCol; col <= segment.endCol; col++) row[col] = true;

		if (lane < maxLanes) {
			bars.push({ ...segment, lane });
			laneCount = Math.max(laneCount, lane + 1);
		} else {
			for (let col = segment.startCol; col <= segment.endCol; col++) {
				hiddenCounts[col] = (hiddenCounts[col] ?? 0) + 1;
			}
		}
	}

	return { bars, laneCount, hiddenCounts };
}

function isFree(row: boolean[] | undefined, startCol: number, endCol: number): boolean {
	if (!row) return true;
	for (let col = startCol; col <= endCol; col++) if (row[col]) return false;
	return true;
}

/** Events that include `day`, in input order. */
export function eventsOnDay(events: readonly CalendarEvent[], day: DayKey): CalendarEvent[] {
	return events.filter((event) => event.start <= day && day <= event.end);
}
