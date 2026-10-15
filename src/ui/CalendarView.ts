import { ItemView, moment, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from '../constants';
import { todayKey, yearMonth } from '../date/dayKey';
import type SidebarCalendarPlugin from '../main';
import { renderMonth } from './renderMonth';

export class CalendarView extends ItemView {
	private plugin: SidebarCalendarPlugin;
	private year: number;
	/** 1-based. */
	private month: number;

	constructor(leaf: WorkspaceLeaf, plugin: SidebarCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		({ year: this.year, month: this.month } = yearMonth(todayKey()));
	}

	getViewType(): string {
		return VIEW_TYPE_SIDEBAR_CALENDAR;
	}

	getDisplayText(): string {
		return 'Sidebar calendar';
	}

	getIcon(): string {
		return 'calendar-range';
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass('sidebar-calendar');

		renderMonth(
			root,
			{
				year: this.year,
				month: this.month,
				today: todayKey(),
				weekStart: this.plugin.settings.weekStart,
				locale: appLocale(),
				events: this.plugin.eventStore.getEvents(),
				maxLanes: this.plugin.settings.maxLanes,
			},
			{
				onPrev: () => this.shiftMonth(-1),
				onNext: () => this.shiftMonth(1),
				onToday: () => {
					({ year: this.year, month: this.month } = yearMonth(todayKey()));
					this.render();
				},
			},
		);
	}

	private shiftMonth(delta: number): void {
		const index = this.year * 12 + (this.month - 1) + delta;
		this.year = Math.floor(index / 12);
		this.month = (index % 12) + 1;
		this.render();
	}
}

/** Obsidian sets moment's locale to the app language. */
function appLocale(): string {
	const locale = moment.locale();
	try {
		return Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0 ? locale : 'en';
	} catch {
		return 'en';
	}
}
