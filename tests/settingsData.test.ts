import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/settingsData';

test('missing or broken data gives the defaults', () => {
	for (const raw of [null, undefined, 'x', 42, []]) {
		assert.deepEqual(sanitizeSettings(raw), DEFAULT_SETTINGS);
	}
});

test('valid values are kept', () => {
	const raw = {
		scheduleHeading: 'Schedule',
		weekStart: 1,
		maxLanes: 5,
		categories: [{ name: '업무', color: '#0090ff' }],
		defaultColor: '#e5484d',
		dailyNotes: false,
	};
	assert.deepEqual(sanitizeSettings(raw), raw);
});

test('bar rows are rounded and clamped to 1-6', () => {
	assert.equal(sanitizeSettings({ maxLanes: 0 }).maxLanes, 1);
	assert.equal(sanitizeSettings({ maxLanes: 99 }).maxLanes, 6);
	assert.equal(sanitizeSettings({ maxLanes: 2.6 }).maxLanes, 3);
	assert.equal(sanitizeSettings({ maxLanes: '4' }).maxLanes, DEFAULT_SETTINGS.maxLanes);
	assert.equal(sanitizeSettings({ maxLanes: NaN }).maxLanes, DEFAULT_SETTINGS.maxLanes);
});

test('week start accepts only Sunday or Monday', () => {
	assert.equal(sanitizeSettings({ weekStart: 1 }).weekStart, 1);
	assert.equal(sanitizeSettings({ weekStart: '1' }).weekStart, 1);
	assert.equal(sanitizeSettings({ weekStart: 3 }).weekStart, 0);
});

test('schedule heading is trimmed, loses leading #s, and falls back to 일정', () => {
	assert.equal(sanitizeSettings({ scheduleHeading: '  ## 할 일  ' }).scheduleHeading, '할 일');
	assert.equal(sanitizeSettings({ scheduleHeading: '#일정' }).scheduleHeading, '일정');
	assert.equal(sanitizeSettings({ scheduleHeading: ' ### ' }).scheduleHeading, '일정');
	assert.equal(sanitizeSettings({ scheduleHeading: '' }).scheduleHeading, '일정');
	assert.equal(sanitizeSettings({ scheduleHeading: 7 }).scheduleHeading, '일정');
});

test('malformed categories are dropped or repaired', () => {
	const result = sanitizeSettings({ categories: [null, 'x', { name: '개인' }, { name: 1, color: '#fff' }] });
	assert.deepEqual(result.categories, [
		{ name: '개인', color: '' },
		{ name: '', color: '#fff' },
	]);
	assert.deepEqual(sanitizeSettings({ categories: 'nope' }).categories, []);
});

test('result never shares arrays with the defaults', () => {
	const result = sanitizeSettings({});
	result.categories.push({ name: 'a', color: '#000' });
	assert.equal(DEFAULT_SETTINGS.categories.length, 0);
});
