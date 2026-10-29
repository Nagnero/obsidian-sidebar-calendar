import type { CalendarEvent } from '../types';

/** Orders for the selected day's list. The calendar's bars always use `compareByStart`. */
export const LIST_SORTS = ['start', 'note', 'unchecked', 'kind'] as const;
export type ListSort = (typeof LIST_SORTS)[number];

type Compare = (a: CalendarEvent, b: CalendarEvent) => number;

export function isListSort(value: unknown): value is ListSort {
	return LIST_SORTS.some((sort) => sort === value);
}

const TIME_RE = /^(오전|오후|am|pm)?\s*(\d{1,2})(?::(\d{2})|\s*시(?!간)(?:\s*(\d{1,2})\s*분|\s*반)?)?\s*(am|pm)?/i;

/**
 * Minutes after midnight of a time at the start of a title, such as `9:30`, `14:00`, `18시`,
 * `9시 30분`, `오후 3시` or `3pm`; null when the title does not start with one.
 */
export function timeOfDay(title: string): number | null {
	const match = TIME_RE.exec(title.trim());
	if (!match) return null;
	const [whole, before, h, colonMinutes, koreanMinutes, after] = match;
	// A bare number such as `3 apples` is not a time.
	if (colonMinutes === undefined && !whole.includes('시') && before === undefined && after === undefined) return null;
	let hours = Number(h);
	const minutes = Number(colonMinutes ?? koreanMinutes ?? (whole.includes('반') ? 30 : 0));
	const half = (before ?? after)?.toLowerCase();
	if ((half === '오후' || half === 'pm') && hours < 12) hours += 12;
	if ((half === '오전' || half === 'am') && hours === 12) hours = 0;
	return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** By start date, then longer events first, then entries without a time before timed ones in time order, then title. */
export const compareByStart: Compare = (a, b) => {
	if (a.start !== b.start) return a.start < b.start ? -1 : 1;
	if (a.end !== b.end) return a.end > b.end ? -1 : 1;
	const ta = timeOfDay(a.title) ?? -1;
	const tb = timeOfDay(b.title) ?? -1;
	if (ta !== tb) return ta - tb;
	return a.title.localeCompare(b.title);
};

/** The grid's order: done tasks after the rest, so they are the ones a full week hides behind "+N". */
export const compareForGrid: Compare = (a, b) => Number(a.task === 'done') - Number(b.task === 'done') || compareByStart(a, b);

/** As written: by note path, then line. */
const compareByNote: Compare = (a, b) => {
	if (a.path !== b.path) return a.path < b.path ? -1 : 1;
	return a.line - b.line;
};

const TASK_RANK = { open: 0, plain: 1, done: 2 } as const;
const taskRank = (event: CalendarEvent) => TASK_RANK[event.task ?? 'plain'];

const COMPARATORS: Record<ListSort, (kinds: readonly string[]) => Compare> = {
	start: () => compareByStart,
	note: () => compareByNote,
	unchecked: () => (a, b) => taskRank(a) - taskRank(b) || compareByNote(a, b),
	kind: (kinds) => {
		const index = (event: CalendarEvent) => {
			const i = kinds.indexOf(event.kind);
			return i === -1 ? kinds.length : i;
		};
		return (a, b) => index(a) - index(b) || compareByNote(a, b);
	},
};

/** A sorted copy of `events`. `kinds` are the enabled kinds in template order, used by the `kind` sort. */
export function sortEntries(events: readonly CalendarEvent[], sort: ListSort, kinds: readonly string[]): CalendarEvent[] {
	return [...events].sort(COMPARATORS[sort](kinds));
}
