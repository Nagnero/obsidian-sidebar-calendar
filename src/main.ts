import { debounce, Notice, Plugin, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from './constants';
import { sanitizeSettings, SidebarCalendarSettings, SidebarCalendarSettingTab } from './settings';
import { todayKey } from './date/dayKey';
import { DailyNotes } from './data/DailyNotes';
import { EventStore } from './data/EventStore';
import { CalendarView } from './ui/CalendarView';

export default class SidebarCalendarPlugin extends Plugin {
	settings!: SidebarCalendarSettings;
	eventStore!: EventStore;
	dailyNotes!: DailyNotes;

	async onload() {
		await this.loadSettings();
		this.dailyNotes = new DailyNotes(this.app);
		this.eventStore = new EventStore(this.app, this.dailyNotes, () => this.settings.categories.map((c) => c.name));

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
				await this.reloadEvents();
				this.eventStore.logToConsole();
				new Notice(`Sidebar Calendar: ${this.eventStore.summary()}`);
			},
		});

		this.addSettingTab(new SidebarCalendarSettingTab(this.app, this));
		this.registerAutoRefresh();

		// Open the view on first load; afterwards the workspace layout restores it.
		this.app.workspace.onLayoutReady(() => {
			void this.reloadEvents();
			if (this.app.workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR_CALENDAR).length === 0) {
				void this.activateView(false);
			}
		});
	}

	/**
	 * Keeps the calendar in sync with the vault. Bursts of changes (a sync, a bulk rename) are
	 * collapsed into one reload. A daily note is re-read when its content changes; any markdown
	 * file appearing, disappearing or moving can add or remove a daily note, so those always refresh.
	 */
	private registerAutoRefresh(): void {
		const refresh = debounce(() => void this.reloadEvents(), 300, true);
		const isMarkdown = (file: TAbstractFile) => file instanceof TFile && file.extension === 'md';

		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			if (this.dailyNotes.dayOf(file) !== null) refresh();
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
