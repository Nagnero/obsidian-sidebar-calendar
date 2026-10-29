import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortEntries, timeOfDay } from '../src/data/sortEntries';
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

test('timeOfDay reads a time at the start of a title', () => {
	const cases: [string, number | null][] = [
		['9:30 standup', 570],
		['14:00 회의', 840],
		['18시 기헌이 약속', 1080],
		['9시 30분 치과', 570],
		['3시반 미팅', 210],
		['오후 3시 미팅', 900],
		['오전 12시 출발', 0],
		['3pm call', 900],
		['3 apples', null],
		['3시간 공부', null],
		['보고서 작성', null],
		['25:00 bad', null],
	];
	for (const [title, minutes] of cases) assert.equal(timeOfDay(title), minutes, title);
});

test('the start order puts untimed entries first, then timed ones by time', () => {
	const titlesIn = ['18시 약속', '9시 회의', '보고서', '14:00 점심'];
	const sorted = sortEntries(titlesIn.map((title, i) => entry('2026-10-20.md', i + 1, title, '업무', 'open')), 'start', []);
	assert.deepEqual(sorted.map((e) => e.title), ['보고서', '9시 회의', '14:00 점심', '18시 약속']);
});
