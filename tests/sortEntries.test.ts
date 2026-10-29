import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortEntries } from '../src/data/sortEntries';
import type { CalendarEvent, TaskState } from '../src/types';

function entry(path: string, line: number, title: string, kind: string, task: TaskState, end?: string): CalendarEvent {
	const start = path.slice(0, 10);
	return { id: `${path}:${line}`, path, line, title, start, end: end ?? start, kind, task, onCalendar: true };
}

// Everything listed on 2026-10-20.
const ENTRIES = [
	entry('2026-10-20.md', 1, 'b', '개인', 'done'),
	entry('2026-10-18.md', 3, 'trip', '업무', 'open', '2026-10-22'),
	entry('2026-10-20.md', 4, 'a', '업무', null),
	entry('2026-10-20.md', 2, 'c', '개인', 'open'),
	entry('2026-10-19.md', 1, 'x', '업무', null, '2026-10-21'),
];
const KINDS = ['개인', '업무'];

const titles = (sort: Parameters<typeof sortEntries>[1]) => sortEntries(ENTRIES, sort, KINDS).map((e) => e.title);

test('start date: by start, longer first, then title', () => {
	assert.deepEqual(titles('start'), ['trip', 'x', 'a', 'b', 'c']);
});

test('note order: by note path, then line', () => {
	assert.deepEqual(titles('note'), ['trip', 'x', 'b', 'c', 'a']);
});

test('unchecked first: open tasks, plain items, done tasks, each in note order', () => {
	assert.deepEqual(titles('unchecked'), ['trip', 'c', 'x', 'a', 'b']);
});

test('kind: template order of kinds, then note order', () => {
	assert.deepEqual(titles('kind'), ['b', 'c', 'trip', 'x', 'a']);
	assert.deepEqual(sortEntries(ENTRIES, 'kind', ['업무', '개인']).map((e) => e.title), ['trip', 'x', 'a', 'b', 'c']);
});

test('sorting returns a copy and leaves the input order alone', () => {
	const before = ENTRIES.map((e) => e.id);
	sortEntries(ENTRIES, 'unchecked', KINDS);
	assert.deepEqual(ENTRIES.map((e) => e.id), before);
});
