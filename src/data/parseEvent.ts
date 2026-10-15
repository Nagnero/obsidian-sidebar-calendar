import { DayKey, parseDayKey } from '../date/dayKey';
import type { CalendarEvent } from '../types';

export type ParseResult = { ok: true; event: CalendarEvent } | { ok: false; reason: string };

/**
 * Turns one note's frontmatter into an event. Pure: takes the note's path and
 * file name (without extension) instead of an Obsidian file object.
 */
export function parseEvent(frontmatter: unknown, path: string, basename: string): ParseResult {
	if (!isRecord(frontmatter)) return { ok: false, reason: 'no frontmatter' };

	if (frontmatter.start === undefined || frontmatter.start === null || frontmatter.start === '') {
		return { ok: false, reason: 'missing "start"' };
	}
	const start = toDayKey(frontmatter.start);
	if (!start) return { ok: false, reason: `invalid "start": ${describe(frontmatter.start)}` };

	let end: DayKey = start;
	if (frontmatter.end !== undefined && frontmatter.end !== null && frontmatter.end !== '') {
		const parsed = toDayKey(frontmatter.end);
		if (!parsed) return { ok: false, reason: `invalid "end": ${describe(frontmatter.end)}` };
		if (parsed < start) return { ok: false, reason: `"end" (${parsed}) is before "start" (${start})` };
		end = parsed;
	}

	const event: CalendarEvent = { id: path, title: toTitle(frontmatter.title) ?? basename, start, end };
	const category = toText(frontmatter.category);
	if (category) event.category = category;
	return { ok: true, event };
}

/**
 * Accepts `2026-10-20`, a date-time string starting with a date (the time is ignored),
 * or a Date object, which some YAML parsers produce.
 */
function toDayKey(value: unknown): DayKey | null {
	if (typeof value === 'string') return parseDayKey(value.trim().slice(0, 10));
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return parseDayKey(value.toISOString().slice(0, 10));
	}
	return null;
}

function toTitle(value: unknown): string | null {
	if (typeof value === 'number') return String(value);
	return toText(value);
}

/** A trimmed non-empty string; for a list (e.g. `category: [업무]`) the first item. */
function toText(value: unknown): string | null {
	if (Array.isArray(value)) return toText(value[0]);
	if (typeof value !== 'string') return null;
	const text = value.trim();
	return text === '' ? null : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
	return typeof value === 'string' ? `"${value}"` : JSON.stringify(value) ?? String(value);
}

/** Whether a vault path is inside `folder` (at any depth). An empty folder or "/" means the whole vault. */
export function isInFolder(path: string, folder: string): boolean {
	const normalized = folder.replace(/^\/+|\/+$/g, '');
	if (normalized === '') return true;
	return path.startsWith(`${normalized}/`);
}

/** Sorts by start date, then longer events first, then title. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
	if (a.start !== b.start) return a.start < b.start ? -1 : 1;
	if (a.end !== b.end) return a.end > b.end ? -1 : 1;
	return a.title.localeCompare(b.title);
}
