import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, dayOfWeek, diffDays, parseDayKey, todayKey } from '../src/date/dayKey';

test('parseDayKey accepts real dates', () => {
	assert.equal(parseDayKey('2026-10-20'), '2026-10-20');
	assert.equal(parseDayKey(' 2028-02-29 '), '2028-02-29');
});

test('parseDayKey rejects malformed or impossible dates', () => {
	for (const bad of ['2026-02-30', '2026-13-01', '2027-02-29', '2026-1-5', '20261020', 'tomorrow', '']) {
		assert.equal(parseDayKey(bad), null, bad);
	}
});

test('addDays crosses month and year boundaries', () => {
	assert.equal(addDays('2026-12-31', 1), '2027-01-01');
	assert.equal(addDays('2026-03-01', -1), '2026-02-28');
	assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('diffDays counts calendar days', () => {
	assert.equal(diffDays('2026-10-20', '2026-10-23'), 3);
	assert.equal(diffDays('2026-10-23', '2026-10-20'), -3);
	assert.equal(diffDays('2026-12-31', '2027-01-01'), 1);
});

test('dayOfWeek', () => {
	assert.equal(dayOfWeek('2026-10-15'), 4); // Thursday
	assert.equal(dayOfWeek('2026-10-18'), 0); // Sunday
});

test('todayKey uses local date parts', () => {
	assert.equal(todayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
