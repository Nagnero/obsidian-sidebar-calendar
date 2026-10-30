import { ItemView, Keymap, Menu, moment, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from '../constants';
import { addDays, DayKey, todayKey, yearMonth } from '../date/dayKey';
import { monthWindow, startOfWeek, WeekWindow, windowMonth, windowWeeks } from '../date/weekWindow';
import { eventsOnDay } from '../layout/weekLayout';
import type { TemplateHeadings } from '../data/DailyNotes';
import { DAY_LIST_STRINGS } from '../i18n';
import { kindColorCss } from '../kindColor';
import { compareByStart, sortEntries } from '../data/sortEntries';
import { visibleEvents } from '../data/visibleEvents';
import type SidebarCalendarPlugin from '../main';
import type { CalendarEvent } from '../types';
import { AddEntryModal } from './AddEntryModal';
import { createDayDrag, DayDrag } from './dayDrag';
import { renderDayList } from './renderDayList';
import { formatRange, NoteMark, renderMonth } from './renderMonth';

/** Below this much room for the day list, the calendar shows one week and the list scrolls on its own. */
const MIN_LIST_HEIGHT = 200;
/** Wheel distance in pixels that slides the calendar one week. A mouse wheel notch is about 100. */
const WHEEL_STEP_PX = 50;
/** A pause this long between wheel events drops distance left over from the last scroll. */
const WHEEL_IDLE_MS = 300;

export class CalendarView extends ItemView {
	private plugin: SidebarCalendarPlugin;
	/**
	 * The weeks in view. It starts as a month's own rows; the wheel slides it a week at a time, and
	 * its top row names the month in the header.
	 */
	private window: WeekWindow;
	private selectedDay: DayKey;
	/** The pane is too short for the window: only its top row shows, and the list scrolls on its own. */
	private compact = false;
	private weeksEl: HTMLElement | null = null;
	private wheelDistance = 0;
	private lastWheel = -Infinity;
	/** The window when the current drag began, shown again if the drag ends without doing anything. */
	private windowAtDragStart: WeekWindow | null = null;
	private resizeObserver: ResizeObserver | null = null;
	/** Lives across renders, so an entry being dragged can be carried into another month. */
	private drag: DayDrag;

	constructor(leaf: WorkspaceLeaf, plugin: SidebarCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.drag = createDayDrag({
			onSelect: (start, end) => void this.promptEntry(start, end),
			onResize: (event, end) => void this.plugin.setEntryEnd(event, end),
			onMove: (event, start) => void this.plugin.moveEntry(event, start),
			describe: (start, end) => formatRange(start, end, appLocale()),
			onBegin: () => {
				this.windowAtDragStart = this.window;
			},
			onEnd: (acted) => {
				const before = this.windowAtDragStart;
				this.windowAtDragStart = null;
				if (acted || !before || before.top === this.window.top) return;
				this.window = before;
				this.render();
			},
		});
		this.selectedDay = todayKey();
		this.window = this.monthOf(this.selectedDay);
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

		// A changed week start would leave the window starting mid-week.
		this.window = { ...this.window, top: startOfWeek(this.window.top, settings.weekStart) };
		const { year, month } = windowMonth(this.window);
		const weeks = windowWeeks(this.compact ? { ...this.window, rows: 1 } : this.window);
		const monthEl = root.createDiv({ cls: 'sidebar-calendar__month' });
		this.weeksEl = renderMonth(
			monthEl,
			{
				year,
				month,
				weeks,
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
					this.window = this.monthOf(this.selectedDay);
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
			},
			this.drag,
		);

		renderDayList(
			root,
			{
				day: this.selectedDay,
				events: sortEntries(eventsOnDay(visible.list, this.selectedDay), settings.listSort, kinds.map((k) => k.name)),
				sort: settings.listSort,
				showDone: settings.showDone,
				offCalendarLabel: settings.hiddenSubheading,
				overdue: settings.showOverdue && this.selectedDay === today
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
				onStartMove: this.drag.startMove,
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

	/**
	 * Shows only the window's top row when all of its rows would leave the day list too little room.
	 * The decision uses the window's full height, so showing one row never flips it back.
	 */
	private fitToPane(): void {
		const weeks = this.weeksEl;
		const month = weeks?.parentElement;
		const row = weeks?.querySelector<HTMLElement>('.sidebar-calendar__week');
		if (!weeks || !month || !row) return;
		const fullHeight = month.offsetHeight - weeks.offsetHeight + row.offsetHeight * this.window.rows;
		const compact = this.contentEl.clientHeight < fullHeight + MIN_LIST_HEIGHT;
		this.contentEl.toggleClass('is-compact', compact);
		if (compact === this.compact) return;
		this.compact = compact;
		const { weekStart } = this.plugin.settings;
		const selectedRow = startOfWeek(this.selectedDay, weekStart);
		if (compact) {
			// The single row shown is the selected day's week when that week is in the window.
			if (windowWeeks(this.window).some((w) => w[0] === selectedRow)) this.window = { ...this.window, top: selectedRow };
		} else {
			// Back to all rows: the whole month the one row was in.
			const { year, month } = windowMonth(this.window);
			this.window = monthWindow(year, month, weekStart);
		}
		this.render();
	}

	/**
	 * Wheeling over the calendar slides the window a week per `WHEEL_STEP_PX`, also while an entry
	 * is being dragged, so the next month's first weeks come in under the current month's last. A
	 * mouse wheel notch is one week; a trackpad moves a week each time its scroll adds up to a step.
	 */
	private onWeeksWheel(evt: WheelEvent): void {
		if (evt.deltaY === 0) return;
		evt.preventDefault();
		const px = evt.deltaY * (evt.deltaMode === WheelEvent.DOM_DELTA_LINE ? 33 : evt.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 300 : 1);
		if (evt.timeStamp - this.lastWheel > WHEEL_IDLE_MS || Math.sign(px) !== Math.sign(this.wheelDistance)) {
			this.wheelDistance = 0;
		}
		this.lastWheel = evt.timeStamp;
		this.wheelDistance += px;
		if (Math.abs(this.wheelDistance) < WHEEL_STEP_PX) return;
		const weeks = Math.sign(this.wheelDistance);
		this.wheelDistance = 0;
		this.window = { ...this.window, top: addDays(this.window.top, 7 * weeks) };
		this.render();
	}

	/** The window of `day`'s month; in the one-row view, the row of `day` itself. */
	private monthOf(day: DayKey): WeekWindow {
		const { year, month } = yearMonth(day);
		const { weekStart } = this.plugin.settings;
		const window = monthWindow(year, month, weekStart);
		return this.compact ? { ...window, top: startOfWeek(day, weekStart) } : window;
	}

	/** Called when the date rolls over. Follows today if the user was looking at it. */
	onDayChanged(previous: DayKey, today: DayKey): void {
		if (this.selectedDay === previous) {
			this.selectedDay = today;
			const shown = windowWeeks(this.window).flat();
			if (shown.includes(previous) && !shown.includes(today)) this.window = this.monthOf(today);
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

	private shiftMonth(delta: number): void {
		const { year, month } = windowMonth(this.window);
		const index = year * 12 + (month - 1) + delta;
		const { weekStart } = this.plugin.settings;
		this.window = monthWindow(Math.floor(index / 12), (index % 12) + 1, weekStart);
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
export function appLocale(): string {
	const locale = moment.locale();
	try {
		return Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0 ? locale : 'en';
	} catch {
		return 'en';
	}
}
