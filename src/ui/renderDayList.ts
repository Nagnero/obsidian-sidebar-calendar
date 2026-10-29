import { Menu, setIcon } from 'obsidian';
import type { DayKey } from '../date/dayKey';
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
	locale: string;
	colorFor: (event: CalendarEvent) => string | null;
}

export interface DayListHandlers {
	onOpenEvent: (event: CalendarEvent, evt: MouseEvent) => void;
	onEventMenu: (event: CalendarEvent, evt: MouseEvent) => void;
	onToggleTask: (event: CalendarEvent, done: boolean) => void;
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

	renderGroup(list, 'Events', model.events.filter((event) => event.onCalendar), model, handlers);
	renderGroup(list, model.offCalendarLabel, model.events.filter((event) => !event.onCalendar), model, handlers);
}

function renderGroup(
	list: HTMLElement,
	label: string,
	events: readonly CalendarEvent[],
	model: DayListModel,
	handlers: DayListHandlers,
): void {
	list.createDiv({ cls: 'sidebar-calendar__day-list-group', text: label });
	if (events.length === 0) {
		list.createDiv({ cls: 'sidebar-calendar__day-list-empty', text: 'None' });
		return;
	}
	for (const event of events) {
		const item = list.createDiv({ cls: 'sidebar-calendar__event-item', attr: { 'data-event': event.id } });
		if (event.task === 'done') item.addClass('is-done');
		const swatch = item.createSpan({ cls: 'sidebar-calendar__event-swatch' });
		const color = model.colorFor(event);
		if (color) swatch.style.setProperty('--sidebar-calendar-bar-color', color);

		const text = item.createDiv({ cls: 'sidebar-calendar__event-text' });
		text.createDiv({ cls: 'sidebar-calendar__event-title', text: event.title });
		text.createDiv({ cls: 'sidebar-calendar__event-range', text: formatRange(event.start, event.end, model.locale) });
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
		item.addEventListener('contextmenu', (evt) => handlers.onEventMenu(event, evt));
	}
}
