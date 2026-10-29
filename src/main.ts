import { EditorView } from '@codemirror/view';
import { debounce, Editor, MarkdownView, Menu, Notice, Plugin, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from './constants';
import { sanitizeSettings, SidebarCalendarSettings, SidebarCalendarSettingTab } from './settings';
import { activeKinds, Kind, reconcileKinds } from './settingsData';
import { DayKey, todayKey } from './date/dayKey';
import { DailyNotes, TemplateHeadings } from './data/DailyNotes';
import { EventStore } from './data/EventStore';
import { parseSchedule, ScheduleRules, setEntryEnd } from './data/parseSchedule';
import type { CalendarEvent } from './types';
import { appLocale, CalendarView } from './ui/CalendarView';
import { DurationModal } from './ui/DurationModal';

/** An entry as the duration dialog and its write need it. */
type EntryRef = Pick<CalendarEvent, 'path' | 'line' | 'title' | 'start' | 'end'>;

export default class SidebarCalendarPlugin extends Plugin {
	settings!: SidebarCalendarSettings;
	eventStore!: EventStore;
	dailyNotes!: DailyNotes;
	/** The template as last read by `syncKinds`. */
	template: TemplateHeadings = { status: 'off', h1s: [] };

	async onload() {
		await this.loadSettings();
		this.dailyNotes = new DailyNotes(this.app);
		this.eventStore = new EventStore(this.app, this.dailyNotes, () => this.scheduleRules());

		this.registerView(VIEW_TYPE_SIDEBAR_CALENDAR, (leaf) => new CalendarView(leaf, this));

		this.addRibbonIcon('calendar-range', 'Open sidebar calendar', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-view',
			name: 'Open calendar',
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: 'reload-events',
			name: 'Reload events',
			callback: async () => {
				await this.refresh();
				this.eventStore.logToConsole();
				new Notice(`Sidebar Calendar: ${this.eventStore.summary()}`);
			},
		});

		this.addSettingTab(new SidebarCalendarSettingTab(this.app, this));

		// A right-click outside the selection moves the cursor only after `editor-menu` has run, so
		// the menu would describe the line the cursor was on before. Move it first.
		this.registerEditorExtension(EditorView.domEventHandlers({
			contextmenu: (evt, view) => {
				const pos = view.posAtCoords({ x: evt.clientX, y: evt.clientY });
				if (pos !== null && !view.state.selection.ranges.some((r) => r.from <= pos && pos <= r.to)) {
					view.dispatch({ selection: { anchor: pos } });
				}
				return false;
			},
		}));
		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, { file }) => {
			const day = file ? this.dailyNotes.dayOf(file) : null;
			if (!file || day === null) return;
			const line = editor.getCursor().line;
			const entry = parseSchedule(editor.getValue(), day, this.scheduleRules()).find((e) => e.line === line);
			if (entry) this.addDurationItem(menu, { ...entry, path: file.path, start: day });
		}));
		this.registerAutoRefresh();

		// Open the view on first load; afterwards the workspace layout restores it.
		this.app.workspace.onLayoutReady(() => {
			void this.refresh();
			if (this.app.workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR_CALENDAR).length === 0) {
				void this.activateView(false);
			}
		});
	}

	/**
	 * Keeps the calendar in sync with the vault. Bursts of changes (a sync, a bulk rename) are
	 * collapsed into one reload. A daily note is re-read when its content changes, and the kinds
	 * when the template's does; any markdown file appearing, disappearing or moving can add or
	 * remove a daily note or the template, so those always refresh. A daily note edited in the
	 * editor is re-read from the editor at once, since its file changes only when Obsidian saves it
	 * about two seconds later.
	 */
	private registerAutoRefresh(): void {
		const refresh = debounce(() => void this.refresh(), 300, true);
		const isMarkdown = (file: TAbstractFile) => file instanceof TFile && file.extension === 'md';

		// Not reset by each keystroke, so the calendar keeps up with continuous typing.
		const renderEdit = debounce(() => this.refreshViews(), 50);
		this.registerEvent(this.app.workspace.on('editor-change', (editor, { file }) => {
			const day = file ? this.dailyNotes.dayOf(file) : null;
			if (file && day !== null && this.eventStore.updateNote(file.path, day, editor.getValue())) renderEdit();
		}));

		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			if (this.dailyNotes.dayOf(file) !== null || file.path === this.dailyNotes.templatePath()) refresh();
		}));
		this.registerEvent(this.app.vault.on('create', (file) => {
			if (isMarkdown(file)) refresh();
		}));
		this.registerEvent(this.app.vault.on('delete', (file) => {
			if (isMarkdown(file)) refresh();
		}));
		this.registerEvent(this.app.vault.on('rename', (file) => {
			// A renamed folder moves its notes without a per-file event.
			if (isMarkdown(file) || file instanceof TFolder) refresh();
		}));

		// Move "today" forward when the date changes while Obsidian stays open.
		let today = todayKey();
		this.registerInterval(window.setInterval(() => {
			const now = todayKey();
			if (now === today) return;
			const previous = today;
			today = now;
			for (const view of this.calendarViews()) view.onDayChanged(previous, now);
		}, 60_000));
	}

	async activateView(reveal = true): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null =
			workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR_CALENDAR)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE_SIDEBAR_CALENDAR, active: true });
		}
		if (reveal) await workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = sanitizeSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.reloadEvents();
	}

	/** Adds "Change duration…" for `entry` to a context menu. */
	addDurationItem(menu: Menu, entry: EntryRef): void {
		menu.addItem((item) =>
			item.setTitle('Change duration…').setIcon('calendar-range').onClick(() => {
				new DurationModal(this.app, entry, appLocale(), (end) => void this.setEntryEnd(entry, end)).open();
			}),
		);
	}

	/**
	 * Makes `entry` end on `end`. An open note is edited in its editor, so the change can be undone
	 * there, is never overwritten by the editor's pending save, and reaches the calendar through
	 * `editor-change` at once. A closed note is edited on disk.
	 */
	private async setEntryEnd(entry: EntryRef, end: DayKey): Promise<void> {
		const rewrite = (text: string) => setEntryEnd(text, entry.start, this.scheduleRules(), entry.line, end);
		const editor = this.openEditor(entry.path);
		if (editor) {
			const next = rewrite(editor.getValue());
			if (next !== null) editor.setLine(entry.line, next.split(/\r?\n/)[entry.line] ?? '');
			return;
		}
		const file = this.app.vault.getFileByPath(entry.path);
		if (file) await this.app.vault.process(file, (text) => rewrite(text) ?? text);
	}

	/** The editor of a view that has the note at `path` open, if any. */
	private openEditor(path: string): Editor | null {
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			// A leaf not shown since startup holds a placeholder view without an editor.
			const { file, editor } = leaf.view as Partial<MarkdownView>;
			if (file?.path === path && editor) return editor;
		}
		return null;
	}

	private scheduleRules(): ScheduleRules {
		return { kinds: this.activeKinds().map((k) => k.name), hiddenSubheading: this.settings.hiddenSubheading };
	}

	/** The enabled kinds the template has, in template order. */
	activeKinds(): Kind[] {
		return activeKinds(this.settings.kinds, this.template.h1s);
	}

	/**
	 * Re-reads the template's H1s and matches the stored kinds to them, saving only on a change.
	 * Returns whether the kinds or the template changed.
	 */
	async syncKinds(): Promise<boolean> {
		const before = this.template;
		this.template = await this.dailyNotes.templateHeadings();
		const kinds = reconcileKinds(this.settings.kinds, this.template.h1s);
		const kindsChanged = kinds.length !== this.settings.kinds.length || kinds.some((k, i) => k !== this.settings.kinds[i]);
		if (kindsChanged) {
			this.settings.kinds = kinds;
			await this.saveData(this.settings);
		}
		return kindsChanged || before.status !== this.template.status || before.h1s.join('\n') !== this.template.h1s.join('\n');
	}

	/** Syncs the kinds with the template, then re-reads the daily notes. */
	async refresh(): Promise<void> {
		await this.syncKinds();
		await this.reloadEvents();
	}

	async reloadEvents(): Promise<void> {
		await this.eventStore.reload();
		this.refreshViews();
	}

	refreshViews(): void {
		for (const view of this.calendarViews()) view.render();
	}

	private calendarViews(): CalendarView[] {
		return this.app.workspace
			.getLeavesOfType(VIEW_TYPE_SIDEBAR_CALENDAR)
			.map((leaf) => leaf.view)
			.filter((view): view is CalendarView => view instanceof CalendarView);
	}
}
