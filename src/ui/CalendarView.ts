import { ItemView, Keymap, Menu, moment, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from '../constants';
import { addDays, DayKey, todayKey, yearMonth } from '../date/dayKey';
import { eventsOnDay } from '../layout/weekLayout';
import type { TemplateHeadings } from '../data/DailyNotes';
import { DAY_LIST_STRINGS } from '../i18n';
import { kindColorCss } from '../kindColor';
import { compareByStart, sortEntries } from '../data/sortEntries';
import { visibleEvents } from '../data/visibleEvents';
import type SidebarCalendarPlugin from '../main';
import type { CalendarEvent } from '../types';
import { AddEntryModal } from './AddEntryModal';
import { renderDayList } from './renderDayList';
import { formatRange, NoteMark, renderMonth } from './renderMonth';

/** Below this much room for the day list, the calendar shows one week and the list scrolls on its own. */
const MIN_LIST_HEIGHT = 200;
/** One wheel gesture moves one week; events closer together than this belong to the same gesture. */
const WHEEL_STEP_MS = 300;

export class CalendarView extends ItemView {
	private plugin: SidebarCalendarPlugin;
	private year: number;
	/** 1-based. */
	private month: number;
	private selectedDay: DayKey;
	/** The pane is too short for the whole month: one week row shows at a time. */
	private compact = false;
	/** First day of the week row shown while compact; null shows the selected day's week. */
	private shownWeek: DayKey | null = null;
	private weeksEl: HTMLElement | null = null;
	private lastWheelStep = -Infinity;
	private resizeObserver: ResizeObserver | null = null;

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
		this.resizeObserver = new ResizeObserver(() => this.fitToPane());
		this.resizeObserver.observe(this.contentEl);
	}

	async onClose(): Promise<void> {
		this.resizeObserver?.disconnect();
		this.contentEl.empty();
	}

	render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass('sidebar-calendar');

		const kinds = this.plugin.activeKinds();
		const colors = new Map(kinds.map((k) => [k.name, kindColorCss(k.color)]));
		const colorFor = (event: CalendarEvent) => colors.get(event.kind) ?? null;
		const locale = appLocale();
		const { settings } = this.plugin;
		const events = this.plugin.eventStore.getEvents();
		const visible = visibleEvents(events, settings);
		const dailyNotes = settings.dailyNotes && this.plugin.dailyNotes.isAvailable()
			? this.plugin.dailyNotes
			: null;
		const openEvent = (event: CalendarEvent, evt: MouseEvent) => void this.openEvent(event, evt);
		const eventMenu = (event: CalendarEvent, evt: MouseEvent) => {
			evt.preventDefault();
			const menu = new Menu();
			this.plugin.addEntryItems(menu, event);
			menu.showAtMouseEvent(evt);
		};
		const today = todayKey();
		const openTaskDays = new Set(events.filter((e) => e.task === 'open').map((e) => e.start));
		const noteMark = (day: DayKey): NoteMark => {
			if (!dailyNotes?.find(day)) return 'none';
			return openTaskDays.has(day) ? 'open-tasks' : 'note';
		};

		const monthEl = root.createDiv({ cls: 'sidebar-calendar__month' });
		const month = renderMonth(
			monthEl,
			{
				year: this.year,
				month: this.month,
				today,
				weekStart: settings.weekStart,
				locale,
				events: visible.grid,
				maxLanes: settings.maxLanes,
				barStyle: settings.barStyle,
				colorFor,
				selectedDay: this.selectedDay,
				noteMark,
			},
			{
				onPrev: () => this.shiftMonth(-1),
				onNext: () => this.shiftMonth(1),
				onToday: () => {
					this.selectedDay = todayKey();
					this.shownWeek = null;
					({ year: this.year, month: this.month } = yearMonth(this.selectedDay));
					this.render();
				},
				onSelectDay: (day, evt) => {
					this.selectedDay = day;
					this.render();
					// Like the Calendar plugin, a click opens that day's note, but only one that
					// already exists; a note is created by adding an entry to its day.
					const note = dailyNotes?.find(day);
					if (note) void this.app.workspace.getLeaf(Keymap.isModEvent(evt) !== false).openFile(note);
				},
				onOpenEvent: openEvent,
				onEventMenu: eventMenu,
				onAddEntry: (start, end) => void this.promptEntry(start, end),
				onResizeEvent: (event, end) => void this.plugin.setEntryEnd(event, end),
				onMoveEvent: (event, start) => void this.plugin.moveEntry(event, start),
			},
		);

		this.weeksEl = month.weeksEl;

		renderDayList(
			root,
			{
				day: this.selectedDay,
				events: sortEntries(eventsOnDay(visible.list, this.selectedDay), settings.listSort, kinds.map((k) => k.name)),
				sort: settings.listSort,
				showDone: settings.showDone,
				offCalendarLabel: settings.hiddenSubheading,
				overdue: this.selectedDay === today
					? events.filter((e) => !e.onCalendar && e.task === 'open' && e.start < today).sort(compareByStart)
					: [],
				strings: DAY_LIST_STRINGS[settings.settingsLanguage],
				locale,
				colorFor,
			},
			{
				onOpenEvent: openEvent,
				onEventMenu: eventMenu,
				onToggleTask: (event, done) => void this.plugin.setEntryTask(event, done),
				onStartMove: month.drag.startMove,
				onMoveToToday: (event) => void this.plugin.moveEntry(event, today),
				onSort: (sort) => {
					settings.listSort = sort;
					void this.plugin.saveData(settings);
					this.plugin.refreshViews();
				},
				onShowDone: (showDone) => {
					settings.showDone = showDone;
					void this.plugin.saveData(settings);
					this.plugin.refreshViews();
				},
			},
		);

		this.weeksEl.addEventListener('wheel', (evt) => this.onWeeksWheel(evt), { passive: false });
		this.fitToPane();
	}

	/** Shows one week row at a time when the whole month would leave the day list too little room. */
	private fitToPane(): void {
		const weeks = this.weeksEl;
		const month = weeks?.parentElement;
		if (!weeks || !month) return;
		const fullMonthHeight = month.offsetHeight - weeks.clientHeight + weeks.scrollHeight;
		this.compact = this.contentEl.clientHeight < fullMonthHeight + MIN_LIST_HEIGHT;
		this.contentEl.toggleClass('is-compact', this.compact);
		if (!this.compact) {
			weeks.scrollTop = 0;
			return;
		}
		const rows = Array.from(weeks.querySelectorAll<HTMLElement>('.sidebar-calendar__week'));
		const row =
			rows.find((r) => firstDay(r) === this.shownWeek) ??
			rows.find((r) => r.querySelector(`[data-date="${this.selectedDay}"]`)) ??
			rows[0];
		if (!row) return;
		this.shownWeek = firstDay(row);
		weeks.setCssProps({ '--sidebar-calendar-week-height': `${row.offsetHeight}px` });
		weeks.scrollTop = row.offsetTop;
	}

	private onWeeksWheel(evt: WheelEvent): void {
		if (!this.compact || evt.deltaY === 0 || this.shownWeek === null) return;
		evt.preventDefault();
		const quiet = evt.timeStamp - this.lastWheelStep >= WHEEL_STEP_MS;
		this.lastWheelStep = evt.timeStamp;
		if (!quiet) return;
		const direction = evt.deltaY > 0 ? 1 : -1;
		const target = addDays(this.shownWeek, 7 * direction);
		this.shownWeek = target;
		// A row holding none of this month's days belongs to the next or previous month.
		const inMonth = [0, 6].some((offset) => {
			const { year, month } = yearMonth(addDays(target, offset));
			return year === this.year && month === this.month;
		});
		if (inMonth) this.fitToPane();
		else this.shiftMonth(direction, true);
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
		const range = formatRange(start, end, appLocale());
		new AddEntryModal(this.app, range, kinds, settings.lastKind, start !== end, (title, kind, onCalendar) => {
			settings.lastKind = kind;
			void plugin.saveData(settings);
			void plugin.dailyNotes.addEntry({ title, start, end }, kind, settings.hiddenSubheading, onCalendar);
		}).open();
	}

	private shiftMonth(delta: number, keepWeek = false): void {
		if (!keepWeek) this.shownWeek = null;
		const index = this.year * 12 + (this.month - 1) + delta;
		this.year = Math.floor(index / 12);
		this.month = (index % 12) + 1;
		this.render();
	}
}

function firstDay(row: HTMLElement): DayKey | null {
	return row.querySelector<HTMLElement>('.sidebar-calendar__day')?.dataset.date ?? null;
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
export function appLocale(): string {
	const locale = moment.locale();
	try {
		return Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0 ? locale : 'en';
	} catch {
		return 'en';
	}
}
