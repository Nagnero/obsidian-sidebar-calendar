import { Menu, setIcon } from 'obsidian';
import type { DayKey } from '../date/dayKey';
import type { DayListStrings } from '../i18n';
import { LIST_SORTS, ListSort } from '../data/sortEntries';
import type { CalendarEvent } from '../types';
import { formatLongDay, formatRange } from './renderMonth';

const SORT_LABELS: Record<ListSort, string> = {
	start: 'Start date',
	note: 'Note order',
	unchecked: 'Unchecked first',
	kind: 'Kind',
};

const DOUBLE_CLICK_MS = 250;

export interface DayListModel {
	day: DayKey;
	/** Already in `sort` order. */
	events: readonly CalendarEvent[];
	sort: ListSort;
	showDone: boolean;
	/** Heading of the group of entries that are not on the grid: the hidden sub-heading's name. */
	offCalendarLabel: string;
	/** Open to-dos of earlier days, listed when the day is today; empty otherwise. */
	overdue: readonly CalendarEvent[];
	strings: DayListStrings;
	locale: string;
	colorFor: (event: CalendarEvent) => string | null;
}

export interface DayListHandlers {
	onOpenEvent: (event: CalendarEvent, evt: MouseEvent) => void;
	onEventMenu: (event: CalendarEvent, evt: MouseEvent) => void;
	onToggleTask: (event: CalendarEvent, done: boolean) => void;
	/** A press on a row, which may become a drag onto a day of the calendar. */
	onStartMove: (event: CalendarEvent, evt: PointerEvent) => void;
	onMoveToToday: (event: CalendarEvent) => void;
	onSort: (sort: ListSort) => void;
	onShowDone: (showDone: boolean) => void;
}

/** The selected day's events, shown under the calendar. */
export function renderDayList(parent: HTMLElement, model: DayListModel, handlers: DayListHandlers): void {
	const list = parent.createDiv({ cls: 'sidebar-calendar__day-list' });

	const header = list.createDiv({ cls: 'sidebar-calendar__day-list-header' });
	header.createDiv({ cls: 'sidebar-calendar__day-list-title', text: formatLongDay(model.day, model.locale) });
	const sortButton = header.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Sort and filter' } });
	setIcon(sortButton, 'arrow-up-down');
	sortButton.addEventListener('click', (evt) => {
		const menu = new Menu();
		for (const sort of LIST_SORTS) {
			menu.addItem((item) =>
				item.setTitle(SORT_LABELS[sort]).setChecked(sort === model.sort).onClick(() => handlers.onSort(sort)),
			);
		}
		menu.addSeparator();
		menu.addItem((item) =>
			item.setTitle('Show completed').setChecked(model.showDone).onClick(() => handlers.onShowDone(!model.showDone)),
		);
		menu.showAtMouseEvent(evt);
	});

	renderGroup(list, model.strings.events, model.events.filter((event) => event.onCalendar), model, handlers);
	renderGroup(list, model.offCalendarLabel, model.events.filter((event) => !event.onCalendar), model, handlers);
	if (model.overdue.length > 0) {
		list.createDiv({ cls: 'sidebar-calendar__day-list-group mod-overdue', text: model.strings.overdue });
		renderItems(list, model.overdue, model, handlers, true);
	}
}

function renderGroup(
	list: HTMLElement,
	label: string,
	events: readonly CalendarEvent[],
	model: DayListModel,
	handlers: DayListHandlers,
): void {
	list.createDiv({ cls: 'sidebar-calendar__day-list-group', text: label });
	if (events.length === 0) list.createDiv({ cls: 'sidebar-calendar__day-list-empty', text: model.strings.none });
	else renderItems(list, events, model, handlers, false);
}

/** `overdue` rows show their day and a button that moves them to today. */
function renderItems(
	list: HTMLElement,
	events: readonly CalendarEvent[],
	model: DayListModel,
	handlers: DayListHandlers,
	overdue: boolean,
): void {
	for (const event of events) {
		const item = list.createDiv({ cls: 'sidebar-calendar__event-item', attr: { 'data-event': event.id } });
		if (event.task === 'done') item.addClass('is-done');
		const color = model.colorFor(event);
		if (color) item.style.setProperty('--sidebar-calendar-bar-color', color);
		if (event.onCalendar) {
			item.createSpan({ cls: 'sidebar-calendar__event-swatch' });
		} else {
			const check = item.createSpan({
				cls: 'sidebar-calendar__event-check',
				attr: { role: 'checkbox', 'aria-checked': String(event.task === 'done') },
			});
			setIcon(check, 'check');
			check.addEventListener('click', (evt) => {
				evt.stopPropagation();
				if (evt.detail <= 1) handlers.onToggleTask(event, event.task !== 'done');
			});
			check.addEventListener('dblclick', (evt) => evt.stopPropagation());
		}

		const text = item.createDiv({ cls: 'sidebar-calendar__event-text' });
		text.createDiv({ cls: 'sidebar-calendar__event-title', text: event.title });
		// A to-do is meant for its own day, so only one that runs longer, or is late, shows its dates.
		if (event.onCalendar || overdue || event.start !== event.end) {
			text.createDiv({ cls: 'sidebar-calendar__event-range', text: formatRange(event.start, event.end, model.locale) });
		}
		if (event.task === null) {
			item.addEventListener('click', (evt) => handlers.onOpenEvent(event, evt));
		} else {
			// A task's double-click toggles it, so its single click waits to see whether a second one follows.
			let pendingOpen: number | undefined;
			item.addEventListener('click', (evt) => {
				if (evt.detail > 1) return;
				pendingOpen = window.setTimeout(() => handlers.onOpenEvent(event, evt), DOUBLE_CLICK_MS);
			});
			item.addEventListener('dblclick', () => {
				window.clearTimeout(pendingOpen);
				handlers.onToggleTask(event, event.task !== 'done');
			});
		}
		if (overdue) {
			const toToday = item.createDiv({ cls: 'clickable-icon sidebar-calendar__event-action', attr: { 'aria-label': model.strings.moveToToday } });
			setIcon(toToday, 'arrow-down-to-line');
			toToday.addEventListener('click', (evt) => {
				evt.stopPropagation();
				handlers.onMoveToToday(event);
			});
			toToday.addEventListener('dblclick', (evt) => evt.stopPropagation());
			toToday.addEventListener('pointerdown', (evt) => evt.stopPropagation());
		}
		item.addEventListener('contextmenu', (evt) => handlers.onEventMenu(event, evt));
		item.addEventListener('pointerdown', (evt) => handlers.onStartMove(event, evt));
	}
}
