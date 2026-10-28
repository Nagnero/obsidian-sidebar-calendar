import type { DayKey } from './date/dayKey';

/** One schedule entry: a top-level list item under the schedule heading of a daily note. */
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
	/** The category name as written in settings. */
	category?: string;
	done: boolean;
}
