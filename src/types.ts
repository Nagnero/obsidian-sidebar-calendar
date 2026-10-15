import type { DayKey } from './date/dayKey';

export interface CalendarEvent {
	/** Vault path of the event note. */
	id: string;
	/** frontmatter `title`, or the file name without extension. */
	title: string;
	start: DayKey;
	/** Inclusive. Equal to `start` for a one-day event. */
	end: DayKey;
	category?: string;
}
