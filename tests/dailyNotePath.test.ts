import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyNoteName, dailyNotePath, fillDailyTemplate } from '../src/data/dailyNotePath';

test('dailyNotePath joins folder and file name', () => {
	assert.equal(dailyNotePath('Daily', '2026-10-15'), 'Daily/2026-10-15.md');
	assert.equal(dailyNotePath('/Journal/Daily/', '2026-10-15'), 'Journal/Daily/2026-10-15.md');
	assert.equal(dailyNotePath('', '2026-10-15'), '2026-10-15.md');
	assert.equal(dailyNotePath('/', '2026-10-15'), '2026-10-15.md');
});

test('dailyNotePath keeps folders inside the format', () => {
	assert.equal(dailyNotePath('Daily', '2026/10/2026-10-15'), 'Daily/2026/10/2026-10-15.md');
});

test('fillDailyTemplate replaces title, date and time variables', () => {
	const date = (f?: string) => `D(${f ?? 'default'})`;
	const time = (f?: string) => `T(${f ?? 'default'})`;
	assert.equal(
		fillDailyTemplate('# {{title}}\n{{date}} {{ time }} {{date:YYYY년 M월}} {{TIME:HH}}', '2026-10-15', date, time),
		'# 2026-10-15\nD(default) T(default) D(YYYY년 M월) T(HH)',
	);
});

test('fillDailyTemplate leaves other text alone', () => {
	const id = () => 'x';
	assert.equal(fillDailyTemplate('{{other}} plain', 't', id, id), '{{other}} plain');
});

test('dailyNoteName is the path inside the folder without .md', () => {
	assert.equal(dailyNoteName('Daily', 'Daily/2026-10-15.md'), '2026-10-15');
	assert.equal(dailyNoteName('/Journal/', 'Journal/2026/10/2026-10-15.md'), '2026/10/2026-10-15');
	assert.equal(dailyNoteName('', '2026-10-15.md'), '2026-10-15');
	assert.equal(dailyNoteName('Daily', 'Other/2026-10-15.md'), null);
	assert.equal(dailyNoteName('Daily', 'Dailyx/2026-10-15.md'), null);
	assert.equal(dailyNoteName('', 'image.png'), null);
});
