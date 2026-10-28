import type { App, MarkdownView } from 'obsidian';
import type { DayKey } from '../date/dayKey';
import type { CalendarEvent } from '../types';
import type { DailyNotes } from './DailyNotes';
import { parseSchedule } from './parseSchedule';
import { compareByStart } from './sortEntries';

const LOG_PREFIX = '[Sidebar Calendar]';
const TASK_MARK = { open: '[ ]', done: '[x]', plain: '-' } as const;

/** Reads schedule entries from the kind sections of every daily note. */
export class EventStore {
	/** Each daily note's entries, by vault path. */
	private byNote = new Map<string, CalendarEvent[]>();
	/** Every note's entries sorted by start; null after a note changed, until `getEvents` rebuilds it. */
	private events: CalendarEvent[] | null = [];
	/** Bumped by every reload, so a slower earlier reload never overwrites a later one. */
	private generation = 0;

	constructor(
		private app: App,
		private dailyNotes: DailyNotes,
		/** Names of the enabled kinds, in template order. */
		private getKinds: () => readonly string[],
	) {}

	getEvents(): readonly CalendarEvent[] {
		this.events ??= [...this.byNote.values()].flat().sort(compareByStart);
		return this.events;
	}

	/** Rebuilds the event list. A reload that a later one overtook leaves the list alone. */
	async reload(): Promise<void> {
		const generation = ++this.generation;
		const kinds = this.getKinds();
		const { vault, metadataCache } = this.app;

		const notes = vault.getMarkdownFiles().flatMap((file) => {
			const day = this.dailyNotes.dayOf(file);
			return day === null ? [] : [{ file, day }];
		});
		const saved = await Promise.all(notes.map(async ({ file }) => {
			const headings = metadataCache.getFileCache(file)?.headings ?? [];
			return headings.some((h) => h.level === 1 && kinds.includes(h.heading.trim())) ? vault.cachedRead(file) : null;
		}));
		if (generation !== this.generation) return;

		// An open editor is never behind the disk, and reading it after the awaits keeps an
		// `updateNote` made while the files were read from being undone by their older text.
		const editing = this.editorTexts();
		const byNote = new Map<string, CalendarEvent[]>();
		notes.forEach(({ file, day }, i) => {
			const text = editing.get(file.path) ?? saved[i];
			if (text != null) byNote.set(file.path, toEvents(file.path, day, text, kinds));
		});
		this.byNote = byNote;
		this.events = null;
	}

	/**
	 * Replaces the entries of the daily note at `path` with those in `text`, its current content.
	 * Returns whether they changed.
	 */
	updateNote(path: string, day: DayKey, text: string): boolean {
		const next = toEvents(path, day, text, this.getKinds());
		if (JSON.stringify(next) === JSON.stringify(this.byNote.get(path) ?? [])) return false;
		this.byNote.set(path, next);
		this.events = null;
		return true;
	}

	/** The text of every note open in an editor, by path. */
	private editorTexts(): Map<string, string> {
		const texts = new Map<string, string>();
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			// A leaf not shown since startup holds a placeholder view without an editor.
			const { file, editor } = leaf.view as Partial<MarkdownView>;
			if (file && editor) texts.set(file.path, editor.getValue());
		}
		return texts;
	}

	/** One-line summary, e.g. for a notice. */
	summary(): string {
		if (!this.dailyNotes.isAvailable()) return 'turn on the core Daily notes plugin to read schedules';
		const kinds = this.getKinds();
		if (kinds.length === 0) return 'no kinds: add an H1 heading to the daily note template';
		return `${this.getEvents().length} event(s) in ${this.byNote.size} daily note(s) under ${kinds.map((k) => `"# ${k}"`).join(', ')}`;
	}

	/** Prints every event at debug level (shown when the console's "Verbose" level is on). */
	logToConsole(): void {
		console.debug(`${LOG_PREFIX} ${this.summary()}`);
		for (const e of this.getEvents()) {
			const range = e.start === e.end ? e.start : `${e.start} ~ ${e.end}`;
			console.debug(`${LOG_PREFIX} ${range} | ${TASK_MARK[e.task ?? 'plain']} | ${e.title} | ${e.kind} | ${e.id}`);
		}
	}
}

function toEvents(path: string, day: DayKey, text: string, kinds: readonly string[]): CalendarEvent[] {
	return parseSchedule(text, day, kinds).map(
		(entry): CalendarEvent => ({ ...entry, id: `${path}:${entry.line}`, path, start: day }),
	);
}
