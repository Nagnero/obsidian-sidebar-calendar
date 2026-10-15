import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays } from '../src/date/dayKey';
import { buildMonthGrid } from '../src/date/monthGrid';
import { eventsOnDay, layoutWeek, splitIntoWeek } from '../src/layout/weekLayout';
import type { CalendarEvent } from '../src/types';

// Sunday 2026-10-18 … Saturday 2026-10-24
const WEEK = Array.from({ length: 7 }, (_, i) => addDays('2026-10-18', i));

function ev(title: string, start: string, end = start): CalendarEvent {
	return { id: title, title, start, end };
}

function summary(week: string[], events: CalendarEvent[], maxLanes = 3) {
	const layout = layoutWeek(week, events, maxLanes);
	return {
		bars: layout.bars.map((b) => `${b.event.title}:${b.startCol}-${b.endCol}@${b.lane}`),
		laneCount: layout.laneCount,
		hidden: layout.hiddenCounts,
	};
}

test('empty week', () => {
	assert.deepEqual(summary(WEEK, []), { bars: [], laneCount: 0, hidden: [0, 0, 0, 0, 0, 0, 0] });
});

test('one-day events stack per day', () => {
	assert.deepEqual(summary(WEEK, [ev('a', '2026-10-18'), ev('b', '2026-10-20'), ev('c', '2026-10-20')]).bars, [
		'a:0-0@0',
		'b:2-2@0',
		'c:2-2@1',
	]);
});

test('a multi-day event spans its columns in one bar', () => {
	assert.deepEqual(summary(WEEK, [ev('busan', '2026-10-20', '2026-10-23')]).bars, ['busan:2-5@0']);
});

test('overlapping events take separate lanes; non-overlapping reuse a lane', () => {
	const result = summary(WEEK, [
		ev('busan', '2026-10-20', '2026-10-23'),
		ev('workshop', '2026-10-21', '2026-10-22'),
		ev('mon', '2026-10-19'),
		ev('sat', '2026-10-24'),
	]);
	assert.deepEqual(result.bars, ['mon:1-1@0', 'busan:2-5@0', 'workshop:3-4@1', 'sat:6-6@0']);
	assert.equal(result.laneCount, 2);
});

test('longer event goes first when two start the same day', () => {
	assert.deepEqual(summary(WEEK, [ev('short', '2026-10-20'), ev('long', '2026-10-20', '2026-10-22')]).bars, [
		'long:2-4@0',
		'short:2-2@1',
	]);
});

test('an event crossing weeks is split and flagged at the cut', () => {
	const grid = buildMonthGrid(2026, 10, 0);
	const trip = ev('trip', '2026-10-30', '2026-11-02');
	const thisWeek = splitIntoWeek(grid[4]!, [trip]);
	const nextWeek = splitIntoWeek(grid[5]!, [trip]);
	assert.deepEqual(
		thisWeek.map((s) => [s.startCol, s.endCol, s.continuesBefore, s.continuesAfter]),
		[[5, 6, false, true]],
	);
	assert.deepEqual(
		nextWeek.map((s) => [s.startCol, s.endCol, s.continuesBefore, s.continuesAfter]),
		[[0, 1, true, false]],
	);
});

test('a very long event fills whole weeks with both ends continued', () => {
	const [segment] = splitIntoWeek(WEEK, [ev('long', '2026-09-01', '2026-12-31')]);
	assert.deepEqual(
		[segment?.startCol, segment?.endCol, segment?.continuesBefore, segment?.continuesAfter],
		[0, 6, true, true],
	);
});

test('events outside the week are ignored', () => {
	assert.deepEqual(summary(WEEK, [ev('before', '2026-10-10', '2026-10-17'), ev('after', '2026-10-25')]).bars, []);
});

test('segments past maxLanes are hidden and counted on every day they cover', () => {
	const result = summary(
		WEEK,
		[
			ev('a', '2026-10-19', '2026-10-21'),
			ev('b', '2026-10-19', '2026-10-21'),
			ev('c', '2026-10-20'),
			ev('d', '2026-10-20', '2026-10-22'),
		],
		2,
	);
	assert.deepEqual(result.bars, ['a:1-3@0', 'b:1-3@1']);
	assert.equal(result.laneCount, 2);
	// d (lane 2, cols 2-4) and c (lane 3, col 2) are hidden.
	assert.deepEqual(result.hidden, [0, 0, 2, 1, 1, 0, 0]);
});

test('five one-day events with three lanes leave +2', () => {
	const events = ['a', 'b', 'c', 'd', 'e'].map((t) => ev(t, '2026-10-24'));
	const result = summary(WEEK, events);
	assert.equal(result.bars.length, 3);
	assert.deepEqual(result.hidden, [0, 0, 0, 0, 0, 0, 2]);
});

test('maxLanes 1 keeps only the first row', () => {
	const result = summary(WEEK, [ev('a', '2026-10-20', '2026-10-21'), ev('b', '2026-10-21')], 1);
	assert.deepEqual(result.bars, ['a:2-3@0']);
	assert.deepEqual(result.hidden, [0, 0, 0, 1, 0, 0, 0]);
});

test('eventsOnDay includes every event covering the day, hidden or not', () => {
	const events = [ev('busan', '2026-10-20', '2026-10-23'), ev('one', '2026-10-21'), ev('other', '2026-10-25')];
	assert.deepEqual(
		eventsOnDay(events, '2026-10-21').map((e) => e.title),
		['busan', 'one'],
	);
	assert.deepEqual(
		eventsOnDay(events, '2026-10-23').map((e) => e.title),
		['busan'],
	);
	assert.deepEqual(eventsOnDay(events, '2026-10-24'), []);
});
