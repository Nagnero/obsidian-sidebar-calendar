import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleEvents } from '../src/data/visibleEvents';
import type { CalendarEvent, TaskState } from '../src/types';

function entry(title: string, task: TaskState, end = '2026-10-22'): CalendarEvent {
	return { id: `2026-10-22.md:${title}`, path: '2026-10-22.md', line: 1, title, start: '2026-10-22', end, kind: '업무', task, onCalendar: true };
}

const EVENTS = [
	entry('open day', 'open'),
	entry('done day', 'done'),
	entry('plain day', null),
	entry('done trip', 'done', '2026-10-25'),
	entry('open trip', 'open', '2026-10-25'),
];

const titles = (events: readonly CalendarEvent[]) => events.map((e) => e.title);
const members = (events: readonly CalendarEvent[]) => titles(events).sort();

test('everything is shown by default', () => {
	const { list, grid } = visibleEvents(EVENTS, { showOneDay: true, showDone: true });
	assert.deepEqual(titles(list), titles(EVENTS));
	assert.deepEqual(members(grid), members(EVENTS));
});

test('hiding done tasks removes them from the list and the grid, never open tasks or plain items', () => {
	const { list, grid } = visibleEvents(EVENTS, { showOneDay: true, showDone: false });
	assert.deepEqual(titles(list), ['open day', 'plain day', 'open trip']);
	assert.deepEqual(members(grid), ['open day', 'plain day', 'open trip'].sort());
});

test('hiding one-day entries affects only the grid', () => {
	const { list, grid } = visibleEvents(EVENTS, { showOneDay: false, showDone: true });
	assert.deepEqual(titles(list), titles(EVENTS));
	assert.deepEqual(members(grid), ['done trip', 'open trip'].sort());
});

test('both filters combine on the grid', () => {
	const { list, grid } = visibleEvents(EVENTS, { showOneDay: false, showDone: false });
	assert.deepEqual(titles(list), ['open day', 'plain day', 'open trip']);
	assert.deepEqual(members(grid), ['open trip'].sort());
});

test('entries off the calendar are listed but never drawn on the grid', () => {
	const todo = { ...entry('todo', 'open'), onCalendar: false };
	const { list, grid } = visibleEvents([...EVENTS, todo], { showOneDay: true, showDone: true });
	assert.deepEqual(titles(list), [...titles(EVENTS), 'todo']);
	assert.deepEqual(members(grid), members(EVENTS));
});

test('the grid lists done tasks last, longer entries first among the rest', () => {
	const { grid } = visibleEvents(EVENTS, { showOneDay: true, showDone: true });
	assert.deepEqual(titles(grid), ['open trip', 'open day', 'plain day', 'done trip', 'done day']);
});
