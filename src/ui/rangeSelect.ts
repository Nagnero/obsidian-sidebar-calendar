import type { DayKey } from '../date/dayKey';

const DAY_SELECTOR = '.sidebar-calendar__day';

/**
 * Lets the user pick a range of days in the month grid: press on a day, drag across days (across
 * weeks too), release on another day. Double-clicking a day picks just that day. A press and
 * release on the same day is left alone so the day's own click handler runs.
 */
export function enableRangeSelect(weeksEl: HTMLElement, onSelect: (start: DayKey, end: DayKey) => void): void {
	const doc = weeksEl.ownerDocument;
	const win = doc.defaultView ?? window;
	let drag: { anchor: DayKey; current: DayKey } | null = null;

	// Cells span every row of their week, so the cell is under the pointer even over a bar.
	const dayAt = (evt: MouseEvent): DayKey | null => {
		const cell = doc.elementsFromPoint(evt.clientX, evt.clientY).find((el) => el.matches(DAY_SELECTOR));
		return cell instanceof HTMLElement && weeksEl.contains(cell) ? (cell.dataset.date ?? null) : null;
	};

	const highlight = () => {
		const [from, to] = drag ? ordered(drag.anchor, drag.current) : ['', ''];
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

	const finish = (evt: PointerEvent | KeyboardEvent) => {
		if (evt instanceof KeyboardEvent && evt.key !== 'Escape') return;
		const done = drag;
		drag = null;
		highlight();
		win.removeEventListener('pointermove', onMove);
		win.removeEventListener('pointerup', finish);
		win.removeEventListener('pointercancel', finish);
		win.removeEventListener('keydown', finish);
		if (!done || evt.type !== 'pointerup' || done.anchor === done.current) return;

		// The click that ends a drag must not also select a day or open a bar's note.
		const swallow = (click: MouseEvent) => click.stopPropagation();
		weeksEl.addEventListener('click', swallow, { capture: true });
		win.setTimeout(() => weeksEl.removeEventListener('click', swallow, { capture: true }), 0);
		onSelect(...ordered(done.anchor, done.current));
	};

	weeksEl.addEventListener('pointerdown', (evt) => {
		const day = evt.button === 0 ? dayAt(evt) : null;
		if (day === null) return;
		drag = { anchor: day, current: day };
		win.addEventListener('pointermove', onMove);
		win.addEventListener('pointerup', finish);
		win.addEventListener('pointercancel', finish);
		win.addEventListener('keydown', finish);
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
			onSelect(day, day);
		},
		{ capture: true },
	);
}

function ordered(a: DayKey, b: DayKey): [DayKey, DayKey] {
	return a <= b ? [a, b] : [b, a];
}
