import { ItemView, Keymap, moment, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from '../constants';
import { DayKey, todayKey, yearMonth } from '../date/dayKey';
import { eventsOnDay } from '../layout/weekLayout';
import type { TemplateHeadings } from '../data/DailyNotes';
import type SidebarCalendarPlugin from '../main';
import type { CalendarEvent } from '../types';
import { AddEntryModal } from './AddEntryModal';
import { renderDayList } from './renderDayList';
import { formatRange, renderMonth } from './renderMonth';

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

		const colors = new Map(this.plugin.activeKinds().map((k) => [k.name, k.color]));
		const colorFor = (event: CalendarEvent) => colors.get(event.kind) || null;
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
				onSelectDay: (day, evt) => {
					this.selectedDay = day;
					this.render();
					// Like the Calendar plugin, a click opens that day's note, but only one that
					// already exists; creating a note is left to the button in the day list.
					if (dailyNotes?.find(day)) void dailyNotes.open(day, Keymap.isModEvent(evt) !== false);
				},
				onOpenEvent: openEvent,
				onAddEntry: (start, end) => void this.promptEntry(start, end),
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

	/** Called when the date rolls over. Follows today if the user was looking at it. */
	onDayChanged(previous: DayKey, today: DayKey): void {
		if (this.selectedDay === previous) {
			const shown = yearMonth(previous);
			this.selectedDay = today;
			if (shown.year === this.year && shown.month === this.month) {
				({ year: this.year, month: this.month } = yearMonth(today));
			}
		}
		this.render();
	}

	private async openEvent(event: CalendarEvent, evt: MouseEvent): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(event.path);
		if (!(file instanceof TFile)) return;
		await this.app.workspace.getLeaf(Keymap.isModEvent(evt)).openFile(file, { eState: { line: event.line } });
	}

	/** Asks for an entry's title and kind, and writes it under that H1 of the start day's daily note. */
	private async promptEntry(start: DayKey, end: DayKey): Promise<void> {
		const { plugin } = this;
		if (await plugin.syncKinds()) void plugin.reloadEvents();
		const kinds = plugin.activeKinds();
		if (kinds.length === 0) {
			new Notice(noKindsMessage(plugin.template));
			return;
		}
		const { settings } = plugin;
		new AddEntryModal(this.app, formatRange(start, end, appLocale()), kinds, settings.lastKind, (title, kind) => {
			settings.lastKind = kind;
			void plugin.saveData(settings);
			void plugin.dailyNotes.addEntry({ title, start, end }, kind);
		}).open();
	}

	private shiftMonth(delta: number): void {
		const index = this.year * 12 + (this.month - 1) + delta;
		this.year = Math.floor(index / 12);
		this.month = (index % 12) + 1;
		this.render();
	}
}

/** Why there is no kind to add an entry to, and what to do about it. */
function noKindsMessage(template: TemplateHeadings): string {
	switch (template.status) {
		case 'off':
			return 'Turn on the core daily notes plugin to add schedule entries.';
		case 'no-template':
			return 'Set a template in the core daily notes settings. Its top-level headings (# …) are the kinds you add entries to.';
		case 'missing':
			return `Daily notes template not found: ${template.path}`;
		case 'ok':
			return 'Add a top-level heading (# …) to the daily note template, or turn one on in the Sidebar Calendar settings.';
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
