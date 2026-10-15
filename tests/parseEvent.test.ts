import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareEvents, isInFolder, parseEvent } from '../src/data/parseEvent';
import type { CalendarEvent } from '../src/types';

const PATH = 'Events/부산 출장.md';
const NAME = '부산 출장';

function ok(frontmatter: unknown): CalendarEvent {
	const result = parseEvent(frontmatter, PATH, NAME);
	assert.ok(result.ok, result.ok ? '' : result.reason);
	return result.event;
}

function reason(frontmatter: unknown): string {
	const result = parseEvent(frontmatter, PATH, NAME);
	assert.ok(!result.ok, 'expected parse failure');
	return result.reason;
}

test('full event', () => {
	assert.deepEqual(ok({ title: '부산 출장', start: '2026-10-20', end: '2026-10-23', category: '업무' }), {
		id: PATH,
		title: '부산 출장',
		start: '2026-10-20',
		end: '2026-10-23',
		category: '업무',
	});
});

test('missing end means a one-day event', () => {
	const event = ok({ start: '2026-10-20' });
	assert.equal(event.end, '2026-10-20');
});

test('missing or blank title falls back to the file name', () => {
	assert.equal(ok({ start: '2026-10-20' }).title, NAME);
	assert.equal(ok({ start: '2026-10-20', title: '  ' }).title, NAME);
});

test('numeric title is kept', () => {
	assert.equal(ok({ start: '2026-10-20', title: 2026 }).title, '2026');
});

test('missing category is left out', () => {
	assert.equal('category' in ok({ start: '2026-10-20' }), false);
});

test('category given as a list uses the first item', () => {
	assert.equal(ok({ start: '2026-10-20', category: ['업무', '출장'] }).category, '업무');
});

test('date-time values keep only the date', () => {
	assert.equal(ok({ start: '2026-10-20T09:30' }).start, '2026-10-20');
});

test('Date objects are accepted', () => {
	assert.equal(ok({ start: new Date('2026-10-20T00:00:00Z') }).start, '2026-10-20');
});

test('same start and end is fine', () => {
	assert.equal(ok({ start: '2026-10-20', end: '2026-10-20' }).end, '2026-10-20');
});

test('rejects notes without frontmatter or start', () => {
	assert.equal(reason(undefined), 'no frontmatter');
	assert.equal(reason({ title: 'x' }), 'missing "start"');
	assert.equal(reason({ start: '' }), 'missing "start"');
});

test('rejects malformed dates', () => {
	assert.match(reason({ start: '2026-13-01' }), /invalid "start"/);
	assert.match(reason({ start: '2026/10/20' }), /invalid "start"/);
	assert.match(reason({ start: 20261020 }), /invalid "start"/);
	assert.match(reason({ start: '2026-10-20', end: '2026-02-30' }), /invalid "end"/);
});

test('rejects end before start', () => {
	assert.match(reason({ start: '2026-10-23', end: '2026-10-20' }), /before "start"/);
});

test('isInFolder', () => {
	assert.equal(isInFolder('Events/a.md', 'Events'), true);
	assert.equal(isInFolder('Events/2026/a.md', 'Events'), true);
	assert.equal(isInFolder('Events/a.md', 'Events/'), true);
	assert.equal(isInFolder('EventsArchive/a.md', 'Events'), false);
	assert.equal(isInFolder('Daily/2026-10-15.md', 'Events'), false);
	assert.equal(isInFolder('a.md', ''), true);
	assert.equal(isInFolder('a.md', '/'), true);
});

test('compareEvents sorts by start, longer first, then title', () => {
	const e = (title: string, start: string, end: string): CalendarEvent => ({ id: title, title, start, end });
	const sorted = [
		e('b', '2026-10-21', '2026-10-21'),
		e('c', '2026-10-20', '2026-10-20'),
		e('a', '2026-10-20', '2026-10-20'),
		e('long', '2026-10-20', '2026-10-25'),
	].sort(compareEvents);
	assert.deepEqual(
		sorted.map((x) => x.title),
		['long', 'a', 'c', 'b'],
	);
});
