import { setIcon } from 'obsidian';
import type { DayKey } from '../date/dayKey';
import type { CalendarEvent } from '../types';
import { formatLongDay, formatRange } from './renderMonth';

export interface DayListModel {
	day: DayKey;
	events: readonly CalendarEvent[];
	locale: string;
	colorFor: (event: CalendarEvent) => string | null;
	/** null when daily notes are off; otherwise whether the day's note exists. */
	dailyNoteExists: boolean | null;
}

export interface DayListHandlers {
	onOpenEvent: (event: CalendarEvent, evt: MouseEvent) => void;
	onOpenDailyNote: (evt: MouseEvent) => void;
}

/** The selected day's events, shown under the calendar. */
export function renderDayList(parent: HTMLElement, model: DayListModel, handlers: DayListHandlers): void {
	const list = parent.createDiv({ cls: 'sidebar-calendar__day-list' });

	const header = list.createDiv({ cls: 'sidebar-calendar__day-list-header' });
	header.createDiv({ cls: 'sidebar-calendar__day-list-title', text: formatLongDay(model.day, model.locale) });

	if (model.dailyNoteExists !== null) {
		const label = model.dailyNoteExists ? 'Open daily note' : 'Create daily note';
		const button = header.createDiv({
			cls: 'clickable-icon sidebar-calendar__daily-note-btn',
			attr: { 'aria-label': label },
		});
		setIcon(button, model.dailyNoteExists ? 'file-text' : 'file-plus');
		button.addEventListener('click', handlers.onOpenDailyNote);
	}

	if (model.events.length === 0) {
		list.createDiv({ cls: 'sidebar-calendar__day-list-empty', text: 'No events' });
		return;
	}

	for (const event of model.events) {
		const item = list.createDiv({ cls: 'sidebar-calendar__event-item' });
		const swatch = item.createSpan({ cls: 'sidebar-calendar__event-swatch' });
		const color = model.colorFor(event);
		if (color) swatch.style.setProperty('--sidebar-calendar-bar-color', color);

		const text = item.createDiv({ cls: 'sidebar-calendar__event-text' });
		text.createDiv({ cls: 'sidebar-calendar__event-title', text: event.title });
		if (event.start !== event.end) {
			text.createDiv({ cls: 'sidebar-calendar__event-range', text: formatRange(event.start, event.end, model.locale) });
		}
		item.addEventListener('click', (evt) => handlers.onOpenEvent(event, evt));
	}
}
