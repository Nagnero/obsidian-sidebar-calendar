import type { App } from 'obsidian';
import type { CalendarEvent } from '../types';
import type { DailyNotes } from './DailyNotes';
import { parseSchedule } from './parseSchedule';

const LOG_PREFIX = '[Sidebar Calendar]';

/** Reads schedule entries from the kind sections of every daily note. */
export class EventStore {
	private events: CalendarEvent[] = [];
	private noteCount = 0;
	/** Bumped by every reload, so a slower earlier reload never overwrites a later one. */
	private generation = 0;

	constructor(
		private app: App,
		private dailyNotes: DailyNotes,
		/** Names of the enabled kinds, in template order. */
		private getKinds: () => readonly string[],
	) {}

	getEvents(): readonly CalendarEvent[] {
		return this.events;
	}

	/** Rebuilds the event list. A reload that a later one overtook leaves the list alone. */
	async reload(): Promise<void> {
		const generation = ++this.generation;
		const kinds = this.getKinds();
		const { vault, metadataCache } = this.app;

		const notes = vault.getMarkdownFiles().flatMap((file) => {
			const day = this.dailyNotes.dayOf(file);
			if (day === null) return [];
			const headings = metadataCache.getFileCache(file)?.headings ?? [];
			return headings.some((h) => h.level === 1 && kinds.includes(h.heading.trim())) ? [{ file, day }] : [];
		});
		const perNote = await Promise.all(
			notes.map(async ({ file, day }) =>
				parseSchedule(await vault.cachedRead(file), day, kinds).map(
					(entry): CalendarEvent => ({ ...entry, id: `${file.path}:${entry.line}`, path: file.path, start: day }),
				),
			),
		);
		if (generation !== this.generation) return;

		this.events = perNote.flat().sort(compareEvents);
		this.noteCount = notes.length;
	}

	/** One-line summary, e.g. for a notice. */
	summary(): string {
		if (!this.dailyNotes.isAvailable()) return 'turn on the core Daily notes plugin to read schedules';
		const kinds = this.getKinds();
		if (kinds.length === 0) return 'no kinds: add an H1 heading to the daily note template';
		return `${this.events.length} event(s) in ${this.noteCount} daily note(s) under ${kinds.map((k) => `"# ${k}"`).join(', ')}`;
	}

	/** Prints every event at debug level (shown when the console's "Verbose" level is on). */
	logToConsole(): void {
		console.debug(`${LOG_PREFIX} ${this.summary()}`);
		for (const e of this.events) {
			const range = e.start === e.end ? e.start : `${e.start} ~ ${e.end}`;
			console.debug(`${LOG_PREFIX} ${range} | ${e.done ? 'x' : ' '} | ${e.title} | ${e.kind} | ${e.id}`);
		}
	}
}

/** Sorts by start date, then longer events first, then title. */
function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
	if (a.start !== b.start) return a.start < b.start ? -1 : 1;
	if (a.end !== b.end) return a.end > b.end ? -1 : 1;
	return a.title.localeCompare(b.title);
}
