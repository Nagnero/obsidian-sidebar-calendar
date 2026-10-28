import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeKinds, DEFAULT_SETTINGS, Kind, KIND_COLORS, reconcileKinds, sanitizeSettings } from '../src/settingsData';

test('missing or broken data gives the defaults', () => {
	for (const raw of [null, undefined, 'x', 42, []]) {
		assert.deepEqual(sanitizeSettings(raw), DEFAULT_SETTINGS);
	}
});

test('valid values are kept', () => {
	const raw = {
		settingsLanguage: 'ko',
		weekStart: 1,
		maxLanes: 5,
		dailyNotes: false,
		showOneDay: false,
		kinds: [
			{ name: '업무', enabled: true, color: '#0090ff' },
			{ name: 'Journaling', enabled: false, color: '' },
		],
		lastKind: '업무',
		listSort: 'unchecked',
	};
	assert.deepEqual(sanitizeSettings(raw), raw);
});

test('fields from older versions are dropped', () => {
	const result = sanitizeSettings({
		scheduleHeading: '일정',
		categories: [{ name: 'work', color: '#e5484d' }],
		defaultColor: '#000000',
		weekStart: 1,
	});
	assert.deepEqual(result, { ...DEFAULT_SETTINGS, weekStart: 1 });
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

test('settings language accepts only English or Korean', () => {
	assert.equal(sanitizeSettings({}).settingsLanguage, 'en');
	assert.equal(sanitizeSettings({ settingsLanguage: 'ko' }).settingsLanguage, 'ko');
	assert.equal(sanitizeSettings({ settingsLanguage: 'ja' }).settingsLanguage, 'en');
	assert.equal(sanitizeSettings({ settingsLanguage: 1 }).settingsLanguage, 'en');
});

test('show one-day entries accepts only a boolean', () => {
	assert.equal(sanitizeSettings({ showOneDay: false }).showOneDay, false);
	assert.equal(sanitizeSettings({ showOneDay: 'false' }).showOneDay, true);
	assert.equal(sanitizeSettings({ showOneDay: 0 }).showOneDay, true);
	assert.equal(sanitizeSettings({}).showOneDay, true);
});

test('malformed kinds are dropped or repaired, names trimmed and unique', () => {
	const result = sanitizeSettings({
		kinds: [null, 'x', { name: ' 개인 ' }, { name: 1, color: '#fff' }, { name: '' }, { name: '개인', enabled: false }, { name: '업무', enabled: 'no', color: 3 }],
	});
	assert.deepEqual(result.kinds, [
		{ name: '개인', enabled: true, color: '' },
		{ name: '업무', enabled: true, color: '' },
	]);
	assert.deepEqual(sanitizeSettings({ kinds: 'nope' }).kinds, []);
	assert.equal(sanitizeSettings({ lastKind: 3 }).lastKind, '');
});

test('result never shares arrays with the defaults', () => {
	const result = sanitizeSettings({});
	result.kinds.push({ name: 'a', enabled: true, color: '' });
	assert.equal(DEFAULT_SETTINGS.kinds.length, 0);
});

test('reconcile adds new template H1s, enabled, with the first unused preset color', () => {
	assert.deepEqual(reconcileKinds([], ['업무', '개인', 'Journaling']), [
		{ name: '업무', enabled: true, color: KIND_COLORS[0] },
		{ name: '개인', enabled: true, color: KIND_COLORS[1] },
		{ name: 'Journaling', enabled: true, color: KIND_COLORS[2] },
	]);
	const stored: Kind[] = [{ name: '업무', enabled: true, color: KIND_COLORS[0] ?? '' }];
	assert.deepEqual(reconcileKinds(stored, ['업무', '개인']).map((k) => k.color), [KIND_COLORS[0], KIND_COLORS[1]]);
});

test('reconcile keeps stored settings, follows template order, and keeps stale kinds last', () => {
	const stored: Kind[] = [
		{ name: '옛날', enabled: true, color: '#111111' },
		{ name: '개인', enabled: false, color: '#222222' },
		{ name: '업무', enabled: true, color: '' },
	];
	const result = reconcileKinds(stored, ['업무', '개인', '업무']);
	assert.deepEqual(result, [
		{ name: '업무', enabled: true, color: '' },
		{ name: '개인', enabled: false, color: '#222222' },
		{ name: '옛날', enabled: true, color: '#111111' },
	]);
	assert.equal(result[0], stored[2], 'existing kinds stay the same objects, so open settings edits are not lost');
	assert.deepEqual(reconcileKinds(stored, []), stored);
});

test('reconcile is idempotent', () => {
	const once = reconcileKinds([{ name: '옛날', enabled: true, color: '' }], ['업무', '개인']);
	assert.deepEqual(reconcileKinds(once, ['업무', '개인']), once);
});

test('active kinds are the enabled ones the template has, in template order', () => {
	const kinds: Kind[] = [
		{ name: '옛날', enabled: true, color: '' },
		{ name: 'Journaling', enabled: false, color: '' },
		{ name: '개인', enabled: true, color: '' },
		{ name: '업무', enabled: true, color: '' },
	];
	assert.deepEqual(activeKinds(kinds, ['업무', 'Journaling', '개인']).map((k) => k.name), ['업무', '개인']);
	assert.deepEqual(activeKinds(kinds, []), []);
});

test('list sort accepts only a known sort key', () => {
	for (const sort of ['start', 'note', 'unchecked', 'kind']) assert.equal(sanitizeSettings({ listSort: sort }).listSort, sort);
	for (const sort of ['title', 'Kind', 1, null]) assert.equal(sanitizeSettings({ listSort: sort }).listSort, 'start');
});
