import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMonthGrid, weekdayOrder } from '../src/date/monthGrid';

function shape(weeks: string[][]) {
	return { count: weeks.length, first: weeks[0]?.[0], last: weeks[weeks.length - 1]?.[6] };
}

test('October 2026, Sunday start: 6 weeks from 9/27, filled into November', () => {
	assert.deepEqual(shape(buildMonthGrid(2026, 10, 0)), {
		count: 6,
		first: '2026-09-27',
		last: '2026-11-07',
	});
});

test('October 2026, Monday start: 6 weeks from 9/28', () => {
	assert.deepEqual(shape(buildMonthGrid(2026, 10, 1)), {
		count: 6,
		first: '2026-09-28',
		last: '2026-11-08',
	});
});

test('February 2026, Sunday start: starts on the 1st, 2 weeks of March after it', () => {
	assert.deepEqual(shape(buildMonthGrid(2026, 2, 0)), {
		count: 6,
		first: '2026-02-01',
		last: '2026-03-14',
	});
});

test('the first week always contains the 1st', () => {
	for (let month = 1; month <= 12; month++) {
		for (const weekStart of [0, 1] as const) {
			const key = `2026-${String(month).padStart(2, '0')}-01`;
			assert.ok(buildMonthGrid(2026, month, weekStart)[0]?.includes(key), `${key} ${weekStart}`);
		}
	}
});

test('August 2026, Sunday start: 6 weeks, month fills all of them', () => {
	assert.deepEqual(shape(buildMonthGrid(2026, 8, 0)), {
		count: 6,
		first: '2026-07-26',
		last: '2026-09-05',
	});
});

test('leap year February 2028 includes the 29th', () => {
	const days = buildMonthGrid(2028, 2, 0).flat();
	assert.ok(days.includes('2028-02-29'));
});

test('December 2026 runs into January 2027', () => {
	const weeks = buildMonthGrid(2026, 12, 0);
	assert.equal(weeks[weeks.length - 1]?.[6], '2027-01-09');
});

test('every week has 7 consecutive days', () => {
	for (const weekStart of [0, 1] as const) {
		for (const week of buildMonthGrid(2026, 10, weekStart)) assert.equal(week.length, 7);
	}
});

test('weekdayOrder', () => {
	assert.deepEqual(weekdayOrder(0), [0, 1, 2, 3, 4, 5, 6]);
	assert.deepEqual(weekdayOrder(1), [1, 2, 3, 4, 5, 6, 0]);
});
