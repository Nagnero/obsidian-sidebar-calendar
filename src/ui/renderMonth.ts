import { setIcon, setTooltip } from 'obsidian';
import { DayKey, makeDayKey, Weekday, yearMonth } from '../date/dayKey';
import { buildMonthGrid, weekdayOrder } from '../date/monthGrid';
import { layoutWeek } from '../layout/weekLayout';
import type { CalendarEvent } from '../types';
import { enableRangeSelect } from './rangeSelect';

export interface MonthViewModel {
	year: number;
	/** 1-based. */
	month: number;
	today: DayKey;
	weekStart: Weekday;
	locale: string;
	events: readonly CalendarEvent[];
	maxLanes: number;
	/** Bar color for an event; null means the theme's accent color. */
	colorFor: (event: CalendarEvent) => string | null;
	selectedDay: DayKey | null;
	/** Whether a daily note exists for a day; null when daily notes are off. */
	hasDailyNote: ((day: DayKey) => boolean) | null;
}

export interface MonthViewHandlers {
	onPrev: () => void;
	onToday: () => void;
	onNext: () => void;
	onSelectDay: (day: DayKey, evt: MouseEvent) => void;
	onOpenEvent: (event: CalendarEvent, evt: MouseEvent) => void;
	/** A range of days was dragged across, or one day double-clicked. */
	onAddEntry: (start: DayKey, end: DayKey) => void;
}

export function renderMonth(parent: HTMLElement, model: MonthViewModel, handlers: MonthViewHandlers): void {
	renderHeader(parent, model, handlers);
	renderWeekdays(parent, model);

	const weeksEl = parent.createDiv({ cls: 'sidebar-calendar__weeks' });
	enableRangeSelect(weeksEl, handlers.onAddEntry);
	for (const week of buildMonthGrid(model.year, model.month, model.weekStart)) {
		renderWeek(weeksEl, week, model, handlers);
	}
}

function renderHeader(parent: HTMLElement, model: MonthViewModel, handlers: MonthViewHandlers): void {
	const header = parent.createDiv({ cls: 'sidebar-calendar__header' });
	const title = header.createDiv({ cls: 'sidebar-calendar__title' });
	title.createSpan({ cls: 'sidebar-calendar__title-month', text: formatMonthShort(model.year, model.month) });
	title.createSpan({ cls: 'sidebar-calendar__title-year', text: String(model.year) });

	const nav = header.createDiv({ cls: 'sidebar-calendar__nav' });
	const prev = nav.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Previous month' } });
	setIcon(prev, 'chevron-left');
	prev.addEventListener('click', handlers.onPrev);

	const today = nav.createDiv({
		cls: 'clickable-icon sidebar-calendar__today-btn',
		text: formatToday(model.locale),
		attr: { 'aria-label': 'Current month' },
	});
	today.addEventListener('click', handlers.onToday);

	const next = nav.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Next month' } });
	setIcon(next, 'chevron-right');
	next.addEventListener('click', handlers.onNext);
}

function renderWeekdays(parent: HTMLElement, model: MonthViewModel): void {
	const row = parent.createDiv({ cls: 'sidebar-calendar__weekdays' });
	for (const weekday of weekdayOrder(model.weekStart)) {
		row.createDiv({
			cls: 'sidebar-calendar__weekday',
			text: formatWeekday(weekday, model.locale),
		});
	}
}

/**
 * One week is a 7-column grid. Day cells span every row so they act as the background and
 * click target; row 1 holds the date numbers, then one row per bar lane, then a "+N" row.
 */
function renderWeek(parent: HTMLElement, week: DayKey[], model: MonthViewModel, handlers: MonthViewHandlers): void {
	const layout = layoutWeek(week, model.events, model.maxLanes);

	// Every week reserves all bar rows and the "+N" row so week heights never depend on events.
	const weekEl = parent.createDiv({ cls: 'sidebar-calendar__week' });
	weekEl.style.gridTemplateRows = [
		'auto',
		`repeat(${model.maxLanes}, var(--sidebar-calendar-lane-height))`,
		'var(--sidebar-calendar-more-height)',
	].join(' ');

	week.forEach((day, i) => {
		const { month } = yearMonth(day);
		const cell = weekEl.createDiv({ cls: 'sidebar-calendar__day', attr: { 'data-date': day } });
		cell.style.gridColumn = String(i + 1);
		if (month !== model.month) cell.addClass('is-other-month');
		if (day === model.today) cell.addClass('is-today');
		if (day === model.selectedDay) cell.addClass('is-selected');
		cell.addEventListener('click', (evt) => handlers.onSelectDay(day, evt));

		// The number is its own grid item so row 1 gets its height; the cell behind it spans all rows.
		const number = weekEl.createDiv({ cls: 'sidebar-calendar__day-number-slot' });
		number.style.gridColumn = String(i + 1);
		if (month !== model.month) number.addClass('is-other-month');
		if (day === model.today) number.addClass('is-today');
		number.createSpan({ cls: 'sidebar-calendar__day-number', text: String(Number(day.slice(8))) });
		// Always present so every week keeps the same height; only visible on days with a daily note.
		const dot = number.createSpan({ cls: 'sidebar-calendar__note-dot' });
		if (model.hasDailyNote?.(day)) dot.addClass('has-note');
	});

	for (const bar of layout.bars) {
		const barEl = weekEl.createDiv({ cls: 'sidebar-calendar__bar', attr: { 'data-event': bar.event.id } });
		if (bar.continuesBefore) barEl.addClass('is-continued-before');
		if (bar.continuesAfter) barEl.addClass('is-continued-after');
		if (bar.event.task === 'done') barEl.addClass('is-done');
		const color = model.colorFor(bar.event);
		if (color) barEl.style.setProperty('--sidebar-calendar-bar-color', color);
		barEl.style.gridColumn = `${bar.startCol + 1} / ${bar.endCol + 2}`;
		barEl.style.gridRow = String(bar.lane + 2);
		setTooltip(barEl, `${bar.event.title}\n${formatRange(bar.event.start, bar.event.end, model.locale)}`, {
			placement: 'top',
		});
		barEl.addEventListener('click', (evt) => handlers.onOpenEvent(bar.event, evt));
	}

	layout.hiddenCounts.forEach((count, col) => {
		if (count === 0) return;
		const more = weekEl.createDiv({ cls: 'sidebar-calendar__more', text: `+${count}` });
		more.style.gridColumn = String(col + 1);
		more.style.gridRow = String(model.maxLanes + 2);
	});
}

/** Short English month name ("Oct") regardless of app language. */
function formatMonthShort(year: number, month: number): string {
	return new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(
		utcDate(makeDayKey(year, month, 1)),
	);
}

function formatWeekday(weekday: Weekday, locale: string): string {
	// 2026-10-18 is a Sunday.
	return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
		utcDate(makeDayKey(2026, 10, 18 + weekday)),
	);
}

function formatToday(locale: string): string {
	const text = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day');
	return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** "10월 20일 (화)" or "10월 20일 (화) – 10월 23일 (금)", in the app language. */
export function formatRange(start: DayKey, end: DayKey, locale: string): string {
	const format = new Intl.DateTimeFormat(locale, {
		month: 'short',
		day: 'numeric',
		weekday: 'short',
		timeZone: 'UTC',
	});
	const from = format.format(utcDate(start));
	return start === end ? from : `${from} – ${format.format(utcDate(end))}`;
}

/** "10월 20일 화요일" in the app language. */
export function formatLongDay(day: DayKey, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(
		utcDate(day),
	);
}

function utcDate(key: DayKey): Date {
	return new Date(`${key}T00:00:00Z`);
}
