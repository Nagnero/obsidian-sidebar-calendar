import type { CalendarEvent } from '../types';

/** Orders for the selected day's list. The calendar's bars always use `compareByStart`. */
export const LIST_SORTS = ['start', 'note', 'unchecked', 'kind'] as const;
export type ListSort = (typeof LIST_SORTS)[number];

type Compare = (a: CalendarEvent, b: CalendarEvent) => number;

export function isListSort(value: unknown): value is ListSort {
	return LIST_SORTS.some((sort) => sort === value);
}

/** By start date, then longer events first, then title. */
export const compareByStart: Compare = (a, b) => {
	if (a.start !== b.start) return a.start < b.start ? -1 : 1;
	if (a.end !== b.end) return a.end > b.end ? -1 : 1;
	return a.title.localeCompare(b.title);
};

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
