import { setIcon } from 'obsidian';
import { DayKey, makeDayKey, Weekday, yearMonth } from '../date/dayKey';
import { buildMonthGrid, weekdayOrder } from '../date/monthGrid';

export interface MonthViewModel {
	year: number;
	/** 1-based. */
	month: number;
	today: DayKey;
	weekStart: Weekday;
	locale: string;
}

export interface MonthViewHandlers {
	onPrev: () => void;
	onToday: () => void;
	onNext: () => void;
}

export function renderMonth(parent: HTMLElement, model: MonthViewModel, handlers: MonthViewHandlers): void {
	renderHeader(parent, model, handlers);
	renderWeekdays(parent, model);

	const weeksEl = parent.createDiv({ cls: 'sidebar-calendar__weeks' });
	for (const week of buildMonthGrid(model.year, model.month, model.weekStart)) {
		renderWeek(weeksEl, week, model);
	}
}

function renderHeader(parent: HTMLElement, model: MonthViewModel, handlers: MonthViewHandlers): void {
	const header = parent.createDiv({ cls: 'sidebar-calendar__header' });
	header.createDiv({
		cls: 'sidebar-calendar__title',
		text: formatMonthTitle(model.year, model.month, model.locale),
	});

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
 * click target; row 1 holds the date numbers and later rows will hold event bars.
 */
function renderWeek(parent: HTMLElement, week: DayKey[], model: MonthViewModel): void {
	const weekEl = parent.createDiv({ cls: 'sidebar-calendar__week' });
	week.forEach((day, i) => {
		const { month } = yearMonth(day);
		const cell = weekEl.createDiv({ cls: 'sidebar-calendar__day', attr: { 'data-date': day } });
		cell.style.gridColumn = String(i + 1);
		if (month !== model.month) cell.addClass('is-other-month');
		if (day === model.today) cell.addClass('is-today');

		cell.createSpan({ cls: 'sidebar-calendar__day-number', text: String(Number(day.slice(8))) });
	});
}

function formatMonthTitle(year: number, month: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(
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

function utcDate(key: DayKey): Date {
	return new Date(`${key}T00:00:00Z`);
}
