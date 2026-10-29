import type { DayKey } from './date/dayKey';

/** The entry's task box: `[ ]` is open, any other mark is done, null is a plain list item. */
export type TaskState = 'open' | 'done' | null;

/** One schedule entry: a top-level list item under a kind H1 of a daily note. */
export interface CalendarEvent {
	/** `${path}:${line}`, unique and stable while the file is unchanged. */
	id: string;
	/** Vault path of the daily note. */
	path: string;
	/** 0-based line of the list item in the note. */
	line: number;
	title: string;
	/** The daily note's date. */
	start: DayKey;
	/** Inclusive. Equal to `start` for a one-day entry. */
	end: DayKey;
	/** Text of the H1 the entry sits under. */
	kind: string;
	task: TaskState;
	/** False for an item under the kind's hidden sub-heading: listed for its day, but not drawn on the grid. */
	onCalendar: boolean;
}
