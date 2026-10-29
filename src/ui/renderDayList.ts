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

export interface DayListModel {
	day: DayKey;
	/** Already in `sort` order. */
	events: readonly CalendarEvent[];
	sort: ListSort;
	showDone: boolean;
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

	if (model.events.length === 0) {
		list.createDiv({ cls: 'sidebar-calendar__day-list-empty', text: 'No events' });
		return;
	}

	for (const event of model.events) {
		const item = list.createDiv({ cls: 'sidebar-calendar__event-item', attr: { 'data-event': event.id } });
		if (event.task === 'done') item.addClass('is-done');
		const swatch = item.createSpan({ cls: 'sidebar-calendar__event-swatch' });
		const color = model.colorFor(event);
		if (color) swatch.style.setProperty('--sidebar-calendar-bar-color', color);

		if (event.task !== null) {
			const box = item.createEl('input', { cls: 'task-list-item-checkbox sidebar-calendar__event-check', type: 'checkbox' });
			box.checked = event.task === 'done';
			box.addEventListener('click', (evt) => {
				evt.stopPropagation();
				handlers.onToggleTask(event, box.checked);
			});
		}
		const text = item.createDiv({ cls: 'sidebar-calendar__event-text' });
		text.createDiv({ cls: 'sidebar-calendar__event-title', text: event.title });
		if (event.start !== event.end) {
			text.createDiv({ cls: 'sidebar-calendar__event-range', text: formatRange(event.start, event.end, model.locale) });
		}
		item.addEventListener('click', (evt) => handlers.onOpenEvent(event, evt));
		item.addEventListener('contextmenu', (evt) => handlers.onEventMenu(event, evt));
	}
}
