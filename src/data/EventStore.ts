import { App, TFile } from 'obsidian';
import type { CalendarEvent } from '../types';
import { compareEvents, isInFolder, parseEvent } from './parseEvent';

const LOG_PREFIX = '[Sidebar Calendar]';

/** Reads event notes from the events folder. Only ever reads notes inside that folder. */
export class EventStore {
	private events: CalendarEvent[] = [];
	private skipped = 0;
	/** Last warning printed per path, so a refresh does not repeat the same warning. */
	private warned = new Map<string, string>();

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
		const warned = new Map<string, string>();
		this.skipped = 0;

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!isInFolder(file.path, folder)) continue;
			const result = this.parseFile(file, warned);
			if (result) events.push(result);
		}
		this.warned = warned;

		events.sort(compareEvents);
		this.events = events;
	}

	private parseFile(file: TFile, warned: Map<string, string>): CalendarEvent | null {
		const frontmatter: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const result = parseEvent(frontmatter, file.path, file.basename);
		if (!result.ok) {
			this.skipped++;
			if (this.warned.get(file.path) !== result.reason) {
				console.warn(`${LOG_PREFIX} Skipped "${file.path}": ${result.reason}`);
			}
			warned.set(file.path, result.reason);
			return null;
		}
		return result.event;
	}

	/** One-line summary, e.g. for a notice. */
	summary(): string {
		const skipped = this.skipped > 0 ? `, ${this.skipped} skipped (see console)` : '';
		return `${this.events.length} event(s) in "${this.getFolder()}"${skipped}`;
	}

	/** Prints every event and every skipped note at debug level (shown when the console's "Verbose" level is on). */
	logToConsole(): void {
		console.debug(`${LOG_PREFIX} ${this.summary()}`);
		for (const [path, reason] of this.warned) {
			console.debug(`${LOG_PREFIX} skipped | ${reason} | ${path}`);
		}
		for (const e of this.events) {
			const range = e.start === e.end ? e.start : `${e.start} ~ ${e.end}`;
			console.debug(`${LOG_PREFIX} ${range} | ${e.title} | ${e.category ?? '-'} | ${e.id}`);
		}
	}
}
