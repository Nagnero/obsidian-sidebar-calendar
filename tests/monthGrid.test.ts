import assert from 'node:assert/strict';
import { test } from 'node:test';
import { weekdayOrder } from '../src/date/monthGrid';

test('weekdayOrder', () => {
	assert.deepEqual(weekdayOrder(0), [0, 1, 2, 3, 4, 5, 6]);
	assert.deepEqual(weekdayOrder(1), [1, 2, 3, 4, 5, 6, 0]);
});
