import { ItemView, Keymap, moment, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from '../constants';
import { DayKey, todayKey, yearMonth } from '../date/dayKey';
import { resolveCategoryColor } from '../categoryColor';
import { eventsOnDay } from '../layout/weekLayout';
import type SidebarCalendarPlugin from '../main';
import type { CalendarEvent } from '../types';
import { renderDayList } from './renderDayList';
import { renderMonth } from './renderMonth';

export class CalendarView extends ItemView {
	private plugin: SidebarCalendarPlugin;
	private year: number;
	/** 1-based. */
	private month: number;
	private selectedDay: DayKey;

	constructor(leaf: WorkspaceLeaf, plugin: SidebarCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.selectedDay = todayKey();
		({ year: this.year, month: this.month } = yearMonth(this.selectedDay));
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

		const { categories, defaultColor } = this.plugin.settings;
		const colorFor = (event: CalendarEvent) => resolveCategoryColor(event.category, categories, defaultColor);
		const locale = appLocale();
		const events = this.plugin.eventStore.getEvents();
		const dailyNotes = this.plugin.settings.dailyNotes && this.plugin.dailyNotes.isAvailable()
			? this.plugin.dailyNotes
			: null;
		const openEvent = (event: CalendarEvent, evt: MouseEvent) => void this.openEvent(event, evt);

		renderMonth(
			root,
			{
				year: this.year,
				month: this.month,
				today: todayKey(),
				weekStart: this.plugin.settings.weekStart,
				locale,
				events,
				maxLanes: this.plugin.settings.maxLanes,
				colorFor,
				selectedDay: this.selectedDay,
				hasDailyNote: dailyNotes ? (day) => dailyNotes.find(day) !== null : null,
			},
			{
				onPrev: () => this.shiftMonth(-1),
				onNext: () => this.shiftMonth(1),
				onToday: () => {
					this.selectedDay = todayKey();
					({ year: this.year, month: this.month } = yearMonth(this.selectedDay));
					this.render();
				},
				onSelectDay: (day) => {
					this.selectedDay = day;
					this.render();
				},
				onOpenEvent: openEvent,
			},
		);

		renderDayList(
			root,
			{
				day: this.selectedDay,
				events: eventsOnDay(events, this.selectedDay),
				locale,
				colorFor,
				dailyNoteExists: dailyNotes ? dailyNotes.find(this.selectedDay) !== null : null,
			},
			{
				onOpenEvent: openEvent,
				onOpenDailyNote: (evt) => {
					if (!dailyNotes) return;
					void dailyNotes.open(this.selectedDay, Keymap.isModEvent(evt) !== false).then(() => this.render());
				},
			},
		);
	}

	private async openEvent(event: CalendarEvent, evt: MouseEvent): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(event.id);
		if (!(file instanceof TFile)) return;
		await this.app.workspace.getLeaf(Keymap.isModEvent(evt)).openFile(file);
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
