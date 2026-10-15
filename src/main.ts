import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from './constants';
import {
	DEFAULT_SETTINGS,
	SidebarCalendarSettings,
	SidebarCalendarSettingTab,
} from './settings';
import { EventStore } from './data/EventStore';
import { CalendarView } from './ui/CalendarView';

export default class SidebarCalendarPlugin extends Plugin {
	settings!: SidebarCalendarSettings;
	eventStore!: EventStore;

	async onload() {
		await this.loadSettings();
		this.eventStore = new EventStore(this.app, () => this.settings.eventsFolder);

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
			id: 'log-events',
			name: 'Log events to console',
			callback: () => {
				this.eventStore.reload();
				this.refreshViews();
				this.eventStore.logToConsole();
				new Notice(`Sidebar Calendar: ${this.eventStore.summary()}`);
			},
		});

		this.addSettingTab(new SidebarCalendarSettingTab(this.app, this));

		// Open the view on first load; afterwards the workspace layout restores it.
		this.app.workspace.onLayoutReady(() => {
			this.eventStore.reload();
			this.refreshViews();
			if (this.app.workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR_CALENDAR).length === 0) {
				void this.activateView(false);
			}
		});
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
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SidebarCalendarSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.eventStore.reload();
		this.refreshViews();
	}

	refreshViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR_CALENDAR)) {
			if (leaf.view instanceof CalendarView) leaf.view.render();
		}
	}
}
