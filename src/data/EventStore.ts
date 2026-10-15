import { App, TFile } from 'obsidian';
import type { CalendarEvent } from '../types';
import { compareEvents, isInFolder, parseEvent } from './parseEvent';

const LOG_PREFIX = '[Sidebar Calendar]';

/** Reads event notes from the events folder. Only ever reads notes inside that folder. */
export class EventStore {
	private events: CalendarEvent[] = [];
	private skipped = 0;

	constructor(
		private app: App,
		private getFolder: () => string,
	) {}

	getEvents(): readonly CalendarEvent[] {
		return this.events;
	}

	/** Rebuilds the event list from the metadata cache (no file reads). */
	reload(): void {
		const folder = this.getFolder();
		const events: CalendarEvent[] = [];
		this.skipped = 0;

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!isInFolder(file.path, folder)) continue;
			const result = this.parseFile(file);
			if (result) events.push(result);
		}

		events.sort(compareEvents);
		this.events = events;
	}

	private parseFile(file: TFile): CalendarEvent | null {
		const frontmatter: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const result = parseEvent(frontmatter, file.path, file.basename);
		if (!result.ok) {
			this.skipped++;
			console.warn(`${LOG_PREFIX} Skipped "${file.path}": ${result.reason}`);
			return null;
		}
		return result.event;
	}

	/** One-line summary, e.g. for a notice. */
	summary(): string {
		const skipped = this.skipped > 0 ? `, ${this.skipped} skipped (see console)` : '';
		return `${this.events.length} event(s) in "${this.getFolder()}"${skipped}`;
	}

	/** Prints every event at debug level (shown when the console's "Verbose" level is on). */
	logToConsole(): void {
		console.debug(`${LOG_PREFIX} ${this.summary()}`);
		for (const e of this.events) {
			const range = e.start === e.end ? e.start : `${e.start} ~ ${e.end}`;
			console.debug(`${LOG_PREFIX} ${range} | ${e.title} | ${e.category ?? '-'} | ${e.id}`);
		}
	}
}
