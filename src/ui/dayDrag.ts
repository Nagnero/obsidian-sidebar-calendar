import { addDays, DayKey, diffDays } from '../date/dayKey';
import type { CalendarEvent } from '../types';

const DAY_SELECTOR = '.sidebar-calendar__day';
/** A press must travel this far before it becomes a move, so a click never flashes the preview. */
const MOVE_THRESHOLD_PX = 4;

export interface DayDragHandlers {
	/** A range of days was dragged across, or one day double-clicked. */
	onSelect: (start: DayKey, end: DayKey) => void;
	/** An entry's end handle was dragged to another day. `end` is never before the entry's start. */
	onResize: (event: CalendarEvent, end: DayKey) => void;
	/** An entry was dragged so that it starts on `start`, a day other than its own. */
	onMove: (event: CalendarEvent, start: DayKey) => void;
	/** Text for the range an entry would cover, shown on the drag preview. */
	describe: (start: DayKey, end: DayKey) => string;
}

export interface DayDrag {
	/**
	 * Makes `weeksEl` the grid that drags read and highlight. Called on every render, so a drag in
	 * progress carries on into a newly shown month.
	 */
	attach: (weeksEl: HTMLElement) => void;
	startResize: (event: CalendarEvent, evt: PointerEvent) => void;
	/** Starts moving an entry from a press on its bar or its row in the day list. */
	startMove: (event: CalendarEvent, evt: PointerEvent) => void;
}

/** A press on a day that may become a range, or a press on an entry's end handle. */
type Drag =
	| { kind: 'select'; anchor: DayKey; current: DayKey }
	| { kind: 'resize'; event: CalendarEvent; current: DayKey }
	/**
	 * `anchor` is the day pressed, which lands on `current`; null while off the grid. `preview` is
	 * the card under the pointer, created once the press has travelled far enough to be a move.
	 */
	| {
			kind: 'move';
			event: CalendarEvent;
			anchor: DayKey;
			current: DayKey | null;
			from: { x: number; y: number };
			color: string;
			preview: HTMLElement | null;
	  };

/**
 * Drags over the month grid's days, across weeks too. Pressing on a day and releasing on another
 * selects that range; double-clicking a day selects just that day; a press and release on the
 * same day is left alone so the day's own click handler runs. `startResize`, called from a bar's
 * end handle, drags the entry's end to the day under the pointer instead. `startMove`, from a bar
 * or a day-list row, drags the whole entry; a release off the grid or on its own place does
 * nothing, so the press stays a click. Escape cancels any of them. One instance lives as long as
 * the view, so a drag survives the re-render that shows another month.
 */
export function createDayDrag(handlers: DayDragHandlers): DayDrag {
	let weeksEl: HTMLElement | null = null;
	let doc = document;
	let win = window;
	let drag: Drag | null = null;

	/** Where the pointer was last seen during a drag, to find the day under it after a re-render. */
	let pointer: { clientX: number; clientY: number } | null = null;

	// Cells span every row of their week, so the cell is under the pointer even over a bar.
	const dayAt = (at: { clientX: number; clientY: number }): DayKey | null => {
		const cell = doc.elementsFromPoint(at.clientX, at.clientY).find((el) => el.matches(DAY_SELECTOR));
		return cell instanceof HTMLElement && weeksEl?.contains(cell) ? (cell.dataset.date ?? null) : null;
	};

	const range = (d: Drag): [DayKey, DayKey] | null => {
		switch (d.kind) {
			case 'select':
				return ordered(d.anchor, d.current);
			case 'resize':
				return [d.event.start, d.current < d.event.start ? d.event.start : d.current];
			case 'move': {
				if (d.current === null) return null;
				const start = addDays(d.event.start, diffDays(d.anchor, d.current));
				return [start, addDays(start, diffDays(d.event.start, d.event.end))];
			}
		}
	};

	const highlight = () => {
		if (!weeksEl) return;
		const shown = drag?.kind !== 'move' || drag.preview !== null;
		const [from, to] = (drag && shown && range(drag)) || ['', ''];
		weeksEl.toggleClass('is-resizing', drag?.kind === 'resize');
		weeksEl.toggleClass('is-moving', drag?.kind === 'move' && shown);
		weeksEl.querySelectorAll<HTMLElement>(DAY_SELECTOR).forEach((cell) => {
			const day = cell.dataset.date ?? '';
			cell.toggleClass('is-in-range', from <= day && day <= to);
		});
		if (drag?.kind === 'move' && drag.preview) {
			weeksEl.setCssProps({ '--sidebar-calendar-drag-color': drag.color || 'var(--interactive-accent)' });
			sources(drag.event).forEach((el) => el.addClass('is-drag-source'));
		}
	};

	/** The entry's rows and bars, faded while it is being moved. */
	const sources = (event: CalendarEvent) =>
		doc.querySelectorAll<HTMLElement>(`.sidebar-calendar [data-event="${CSS.escape(event.id)}"]`);

	const showPreview = (d: Extract<Drag, { kind: 'move' }>) => {
		const card = doc.body.createDiv({ cls: 'sidebar-calendar__drag-preview' });
		if (d.color) card.style.setProperty('--sidebar-calendar-bar-color', d.color);
		card.createDiv({ cls: 'sidebar-calendar__drag-preview-title', text: d.event.title });
		card.createDiv({ cls: 'sidebar-calendar__drag-preview-range' });
		d.preview = card;
		doc.body.addClass('sidebar-calendar-is-moving');
	};

	const updatePreview = (d: Extract<Drag, { kind: 'move' }>, evt: { clientX: number; clientY: number }) => {
		if (!d.preview) return;
		d.preview.style.left = `${evt.clientX}px`;
		d.preview.style.top = `${evt.clientY}px`;
		const target = range(d);
		d.preview.toggleClass('is-off-grid', target === null);
		d.preview.find('.sidebar-calendar__drag-preview-range')?.setText(target ? handlers.describe(...target) : '');
		// The sidebar sits at the window's right edge, so the card opens to the left when it would not fit.
		d.preview.toggleClass('is-flipped', evt.clientX + d.preview.offsetWidth + 16 > win.innerWidth);
	};

	const hidePreview = (d: Drag) => {
		if (d.kind !== 'move' || !d.preview) return;
		d.preview.remove();
		sources(d.event).forEach((el) => el.removeClass('is-drag-source'));
		doc.body.removeClass('sidebar-calendar-is-moving');
	};

	const onMove = (evt: { clientX: number; clientY: number }) => {
		if (!drag) return;
		pointer = { clientX: evt.clientX, clientY: evt.clientY };
		const day = dayAt(evt);
		if (drag.kind === 'move') {
			if (!drag.preview) {
				if (Math.hypot(evt.clientX - drag.from.x, evt.clientY - drag.from.y) < MOVE_THRESHOLD_PX) return;
				showPreview(drag);
				drag.current = day;
				highlight();
			}
			if (day !== drag.current) {
				drag.current = day;
				highlight();
			}
			updatePreview(drag, evt);
			return;
		}
		if (day === null || day === drag.current) return;
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
		// The release point decides the day, even if no move event reported it.
		if (evt.type === 'pointerup' && evt instanceof PointerEvent) onMove(evt);
		const done = drag;
		drag = null;
		pointer = null;
		highlight();
		if (done) hidePreview(done);
		win.removeEventListener('pointermove', onMove);
		win.removeEventListener('pointerup', finish);
		win.removeEventListener('pointercancel', finish);
		win.removeEventListener('keydown', finish, { capture: true });
		if (!done) return;
		if (evt instanceof KeyboardEvent) {
			evt.stopPropagation();
			// The button is still down on a cancelled resize or move; its release must not open the note.
			if (done.kind === 'resize' || (done.kind === 'move' && done.preview)) {
				win.addEventListener('pointerup', swallowNextClick, { capture: true, once: true });
			}
			return;
		}
		if (done.kind === 'move') {
			const moved = evt.type === 'pointerup' && done.preview ? range(done) : null;
			if (!moved || moved[0] === done.event.start) return;
			swallowNextClick();
			handlers.onMove(done.event, moved[0]);
			return;
		}
		if (done.kind === 'resize') {
			if (evt.type !== 'pointerup') return;
			swallowNextClick();
			const [, end] = range(done) ?? [done.event.start, done.event.end];
			if (end !== done.event.end) handlers.onResize(done.event, end);
			return;
		}
		if (evt.type !== 'pointerup' || done.anchor === done.current) return;
		swallowNextClick();
		handlers.onSelect(...ordered(done.anchor, done.current));
	};

	const start = (next: Drag) => {
		drag = next;
		highlight();
		win.addEventListener('pointermove', onMove);
		win.addEventListener('pointerup', finish);
		win.addEventListener('pointercancel', finish);
		win.addEventListener('keydown', finish, { capture: true });
	};

	const listen = (el: HTMLElement) => {
		el.addEventListener('pointerdown', (evt) => {
			const day = evt.button === 0 ? dayAt(evt) : null;
			if (day !== null) start({ kind: 'select', anchor: day, current: day });
		});

		// Not `dblclick`: the first click re-renders the grid, so `dblclick` would target a detached
		// cell. The second click itself carries the count, and stopping it here keeps the day from
		// being selected (and its note opened) a second time.
		el.addEventListener(
			'click',
			(evt) => {
				const day = evt.detail === 2 ? dayAt(evt) : null;
				if (day === null) return;
				evt.stopPropagation();
				handlers.onSelect(day, day);
			},
			{ capture: true },
		);
	};

	return {
		attach: (el) => {
			weeksEl = el;
			doc = el.ownerDocument;
			win = doc.defaultView ?? window;
			listen(el);
			highlight();
			// The grid under a still pointer changed, so read the day under it again.
			if (drag && pointer) onMove(pointer);
		},
		startResize: (event, evt) => {
			if (evt.button !== 0) return;
			// Keeps the grid's own pointerdown from starting a range select as well.
			evt.stopPropagation();
			evt.preventDefault();
			start({ kind: 'resize', event, current: event.end });
		},
		startMove: (event, evt) => {
			if (evt.button !== 0) return;
			// Keeps the grid's own pointerdown from starting a range select as well.
			evt.stopPropagation();
			const day = dayAt(evt);
			const color = evt.currentTarget instanceof HTMLElement ? evt.currentTarget.style.getPropertyValue('--sidebar-calendar-bar-color') : '';
			start({ kind: 'move', event, anchor: day ?? event.start, current: day, from: { x: evt.clientX, y: evt.clientY }, color, preview: null });
		},
	};
}

function ordered(a: DayKey, b: DayKey): [DayKey, DayKey] {
	return a <= b ? [a, b] : [b, a];
}
