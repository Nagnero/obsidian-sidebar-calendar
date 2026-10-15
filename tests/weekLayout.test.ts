import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays } from '../src/date/dayKey';
import { layoutWeek } from '../src/layout/weekLayout';
import type { CalendarEvent } from '../src/types';

// Sunday 2026-10-18 … Saturday 2026-10-24
const WEEK = Array.from({ length: 7 }, (_, i) => addDays('2026-10-18', i));

function ev(title: string, start: string, end = start): CalendarEvent {
	return { id: title, title, start, end };
}

test('empty week', () => {
	assert.deepEqual(layoutWeek(WEEK, [], 3), { bars: [], laneCount: 0, hiddenCounts: [0, 0, 0, 0, 0, 0, 0] });
});

test('one-day events land in their column, stacked per day', () => {
	const layout = layoutWeek(WEEK, [ev('a', '2026-10-18'), ev('b', '2026-10-20'), ev('c', '2026-10-20')], 3);
	assert.deepEqual(
		layout.bars.map((b) => [b.event.title, b.startCol, b.endCol, b.lane]),
		[
			['a', 0, 0, 0],
			['b', 2, 2, 0],
			['c', 2, 2, 1],
		],
	);
	assert.equal(layout.laneCount, 2);
});

test('events past maxLanes are counted as hidden', () => {
	const events = ['a', 'b', 'c', 'd', 'e'].map((t) => ev(t, '2026-10-24'));
	const layout = layoutWeek(WEEK, events, 3);
	assert.equal(layout.bars.length, 3);
	assert.equal(layout.laneCount, 3);
	assert.deepEqual(layout.hiddenCounts, [0, 0, 0, 0, 0, 0, 2]);
});

test('events outside the week are ignored', () => {
	const layout = layoutWeek(WEEK, [ev('before', '2026-10-17'), ev('after', '2026-10-25')], 3);
	assert.equal(layout.bars.length, 0);
});

test('multi-day events are not placed yet', () => {
	const layout = layoutWeek(WEEK, [ev('trip', '2026-10-20', '2026-10-23')], 3);
	assert.equal(layout.bars.length, 0);
});
