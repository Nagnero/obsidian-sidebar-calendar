import type { DayKey } from '../date/dayKey';
import type { CalendarEvent } from '../types';

const DAY_SELECTOR = '.sidebar-calendar__day';

export interface DayDragHandlers {
	/** A range of days was dragged across, or one day double-clicked. */
	onSelect: (start: DayKey, end: DayKey) => void;
	/** An entry's end handle was dragged to another day. `end` is never before the entry's start. */
	onResize: (event: CalendarEvent, end: DayKey) => void;
}

/** A press on a day that may become a range, or a press on an entry's end handle. */
type Drag =
	| { kind: 'select'; anchor: DayKey; current: DayKey }
	| { kind: 'resize'; event: CalendarEvent; current: DayKey };

/**
 * Drags over the month grid's days, across weeks too. Pressing on a day and releasing on another
 * selects that range; double-clicking a day selects just that day; a press and release on the
 * same day is left alone so the day's own click handler runs. `startResize`, called from a bar's
 * end handle, drags the entry's end to the day under the pointer instead. Escape cancels either.
 */
export function enableDayDrag(weeksEl: HTMLElement, handlers: DayDragHandlers): { startResize: (event: CalendarEvent, evt: PointerEvent) => void } {
	const doc = weeksEl.ownerDocument;
	const win = doc.defaultView ?? window;
	let drag: Drag | null = null;

	// Cells span every row of their week, so the cell is under the pointer even over a bar.
	const dayAt = (evt: MouseEvent): DayKey | null => {
		const cell = doc.elementsFromPoint(evt.clientX, evt.clientY).find((el) => el.matches(DAY_SELECTOR));
		return cell instanceof HTMLElement && weeksEl.contains(cell) ? (cell.dataset.date ?? null) : null;
	};

	const range = (d: Drag): [DayKey, DayKey] =>
		d.kind === 'select' ? ordered(d.anchor, d.current) : [d.event.start, d.current < d.event.start ? d.event.start : d.current];

	const highlight = () => {
		const [from, to] = drag ? range(drag) : ['', ''];
		weeksEl.toggleClass('is-resizing', drag?.kind === 'resize');
		weeksEl.querySelectorAll<HTMLElement>(DAY_SELECTOR).forEach((cell) => {
			const day = cell.dataset.date ?? '';
			cell.toggleClass('is-in-range', drag !== null && from <= day && day <= to);
		});
	};

	const onMove = (evt: PointerEvent) => {
		const day = dayAt(evt);
		if (!drag || day === null || day === drag.current) return;
		drag.current = day;
		highlight();
	};

	// The click that ends a drag must not also select a day or open a bar's note.
	const swallowNextClick = () => {
		const swallow = (click: MouseEvent) => click.stopPropagation();
		win.addEventListener('click', swallow, { capture: true });
		win.setTimeout(() => win.removeEventListener('click', swallow, { capture: true }), 0);
	};

	const finish = (evt: PointerEvent | KeyboardEvent) => {
		if (evt instanceof KeyboardEvent && evt.key !== 'Escape') return;
		const done = drag;
		drag = null;
		highlight();
		win.removeEventListener('pointermove', onMove);
		win.removeEventListener('pointerup', finish);
		win.removeEventListener('pointercancel', finish);
		win.removeEventListener('keydown', finish, { capture: true });
		if (!done) return;
		if (evt instanceof KeyboardEvent) {
			evt.stopPropagation();
			// The button is still down on a cancelled resize; its release must not open the note.
			if (done.kind === 'resize') win.addEventListener('pointerup', swallowNextClick, { capture: true, once: true });
			return;
		}
		if (done.kind === 'resize') {
			if (evt.type !== 'pointerup') return;
			swallowNextClick();
			const [, end] = range(done);
			if (end !== done.event.end) handlers.onResize(done.event, end);
			return;
		}
		if (evt.type !== 'pointerup' || done.anchor === done.current) return;
		swallowNextClick();
		handlers.onSelect(...range(done));
	};

	const start = (next: Drag) => {
		drag = next;
		highlight();
		win.addEventListener('pointermove', onMove);
		win.addEventListener('pointerup', finish);
		win.addEventListener('pointercancel', finish);
		win.addEventListener('keydown', finish, { capture: true });
	};

	weeksEl.addEventListener('pointerdown', (evt) => {
		const day = evt.button === 0 ? dayAt(evt) : null;
		if (day !== null) start({ kind: 'select', anchor: day, current: day });
	});

	// Not `dblclick`: the first click re-renders the grid, so `dblclick` would target a detached
	// cell. The second click itself carries the count, and stopping it here keeps the day from
	// being selected (and its note opened) a second time.
	weeksEl.addEventListener(
		'click',
		(evt) => {
			const day = evt.detail === 2 ? dayAt(evt) : null;
			if (day === null) return;
			evt.stopPropagation();
			handlers.onSelect(day, day);
		},
		{ capture: true },
	);

	return {
		startResize: (event, evt) => {
			if (evt.button !== 0) return;
			// Keeps the grid's own pointerdown from starting a range select as well.
			evt.stopPropagation();
			evt.preventDefault();
			start({ kind: 'resize', event, current: event.end });
		},
	};
}

function ordered(a: DayKey, b: DayKey): [DayKey, DayKey] {
	return a <= b ? [a, b] : [b, a];
}
