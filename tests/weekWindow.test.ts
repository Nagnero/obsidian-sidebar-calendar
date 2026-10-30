import assert from 'node:assert/strict';
import { test } from 'node:test';
import { monthWindow, startOfWeek, windowMonth, windowWeeks } from '../src/date/weekWindow';

test('a month window holds the rows with days of that month', () => {
	assert.deepEqual(monthWindow(2026, 10, 0), { top: '2026-09-27', rows: 5 });
	assert.deepEqual(monthWindow(2026, 10, 1), { top: '2026-09-28', rows: 5 });
	assert.deepEqual(monthWindow(2026, 2, 0), { top: '2026-02-01', rows: 4 });
	assert.deepEqual(monthWindow(2026, 8, 0), { top: '2026-07-26', rows: 6 });
	assert.deepEqual(monthWindow(2026, 12, 0), { top: '2026-11-29', rows: 5 });
});

test('the top row names the month, so scrolling into the next month keeps the name until its first row is on top', () => {
	const october = monthWindow(2026, 10, 0);
	const down = (weeks: number) => ({ ...october, top: windowWeeks({ top: october.top, rows: weeks + 1 })[weeks]?.[0] ?? '' });
	assert.deepEqual(windowMonth(october), { year: 2026, month: 10 });
	assert.deepEqual(windowMonth(down(1)), { year: 2026, month: 10 });
	assert.deepEqual(windowMonth(down(4)), { year: 2026, month: 10 });
	assert.deepEqual(windowMonth(down(5)), { year: 2026, month: 11 });
	assert.deepEqual(windowWeeks(down(1)).map((week) => week[0]), ['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01']);
});

test('startOfWeek follows the week start', () => {
	assert.equal(startOfWeek('2026-10-30', 0), '2026-10-25');
	assert.equal(startOfWeek('2026-10-30', 1), '2026-10-26');
	assert.equal(startOfWeek('2026-10-25', 0), '2026-10-25');
});

test('the first row always holds the 1st and the last row the last day, in every month', () => {
	for (let month = 1; month <= 12; month++) {
		for (const weekStart of [0, 1] as const) {
			const days = windowWeeks(monthWindow(2026, month, weekStart)).flat();
			const first = `2026-${String(month).padStart(2, '0')}-01`;
			assert.ok(days.slice(0, 7).includes(first), `${first} ${weekStart}`);
			assert.ok(days.every((day, i) => i === 0 || day > (days[i - 1] ?? '')), 'consecutive days');
		}
	}
	assert.ok(windowWeeks(monthWindow(2028, 2, 0)).flat().includes('2028-02-29'));
	assert.equal(windowWeeks(monthWindow(2026, 12, 0)).at(-1)?.[6], '2027-01-02');
});
