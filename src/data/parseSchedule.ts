import { DayKey, parseDayKey, yearMonth } from '../date/dayKey';
import type { TaskState } from '../types';

/** One schedule line of a daily note. The store adds the note's path and date. */
export interface ParsedEntry {
	/** 0-based line of the list item in the file. */
	line: number;
	title: string;
	/** Inclusive. Equal to the note's date for a one-day entry. */
	end: DayKey;
	/** Text of the H1 the entry sits under. */
	kind: string;
	task: TaskState;
	/** False for an item under the kind's hidden sub-heading: listed for its day, but not drawn on the grid. */
	onCalendar: boolean;
}

/** Which parts of a daily note are schedule entries. */
export interface ScheduleRules {
	/** Names of the enabled kinds, in template order. */
	kinds: readonly string[];
	/** Sub-heading name, matched case-insensitively, whose items stay off the grid. */
	hiddenSubheading: string;
}

export interface NewEntry {
	title: string;
	start: DayKey;
	end: DayKey;
}

type LineKind = { kind: 'heading'; level: number; text: string } | { kind: 'code' } | { kind: 'text' };

/** Line range `[from, to)` of one H1 section, excluding the H1 line itself. */
interface Section {
	h1: string;
	from: number;
	to: number;
}

const HEADING_RE = /^(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const ITEM_RE = /^[-*+][ \t]+(.*)$/;
const CONTINUATION_RE = /^[ \t]+\S/;
const TASK_RE = /^\[([^\]])\](?:[ \t]+(.*))?$/;
const RANGE_RE = /\s*~(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[-/](\d{1,2}))$/;
const PAREN_RE = /\s*\([^()]*\)$/;
const TEMPLATE_VARIABLE_RE = /{{[^}]*}}/;

/**
 * The entries of a daily note dated `day`. Each top-level list item under an H1 whose text is
 * one of the kinds is an entry of that kind, including items under deeper headings; the section
 * ends at the next H1. Items under the hidden sub-heading are entries with `onCalendar` false.
 * Indented items, code blocks and frontmatter are ignored.
 */
export function parseSchedule(text: string, day: DayKey, rules: ScheduleRules): ParsedEntry[] {
	const lines = text.split(/\r?\n/);
	const classes = classify(lines);
	const entries: ParsedEntry[] = [];
	for (const section of h1Sections(classes)) {
		if (!rules.kinds.includes(section.h1)) continue;
		const hidden = hiddenLines(classes, section, rules.hiddenSubheading);
		for (let i = section.from; i < section.to; i++) {
			const item = classes[i]?.kind === 'text' ? ITEM_RE.exec(lines[i] ?? '') : null;
			const entry = item ? parseItem(item[1] ?? '', day) : null;
			if (entry) entries.push({ line: i, ...entry, kind: section.h1, onCalendar: !hidden[i - section.from] });
		}
	}
	return entries;
}

/**
 * The H1 texts of a template in order, without duplicates. H1s in code blocks or frontmatter,
 * and H1s with a template variable such as `# {{date}}`, are not kinds.
 */
export function templateH1s(text: string): string[] {
	const names = h1Sections(classify(text.split(/\r?\n/)))
		.map((section) => section.h1)
		.filter((name) => name !== '' && !TEMPLATE_VARIABLE_RE.test(name));
	return [...new Set(names)];
}

/**
 * `text` with `entry` written as an open task in the visible part of the first `# kind` section,
 * outside the `hiddenSubheading` region: after its last top-level item and that item's indented
 * lines or, with no such item, after the free text that follows the H1. A note without that H1
 * gets a new `# kind` section at the end.
 */
export function appendScheduleLine(text: string, kind: string, entry: NewEntry, hiddenSubheading: string): string {
	const eol = text.includes('\r\n') ? '\r\n' : '\n';
	const item = formatEntryLine(entry);
	const lines = text.split(/\r?\n/);
	const classes = classify(lines);
	const section = h1Sections(classes).find((s) => s.h1 === kind);

	if (!section) {
		const body = text.replace(/(\r?\n)+$/, '');
		return `${body === '' ? '' : body + eol + eol}# ${kind}${eol}${item}${eol}`;
	}

	const isText = (i: number) => classes[i]?.kind === 'text';
	const hidden = hiddenLines(classes, section, hiddenSubheading);
	let lastItem = -1;
	for (let i = section.from; i < section.to; i++) {
		if (!hidden[i - section.from] && isText(i) && ITEM_RE.test(lines[i] ?? '')) lastItem = i;
	}
	let at: number;
	if (lastItem >= 0) {
		at = lastItem + 1;
		while (at < section.to && isText(at) && CONTINUATION_RE.test(lines[at] ?? '')) at++;
	} else {
		let lastText = section.from - 1;
		for (let i = section.from; i < section.to && isText(i); i++) if ((lines[i] ?? '').trim() !== '') lastText = i;
		at = lastText + 1;
	}
	lines.splice(at, 0, item);
	return lines.join(eol);
}

/**
 * `text` with the entry on 0-based `line` of the daily note dated `day` ending on `end`: its range
 * token is replaced, added or, when `end` is `day`, removed. A token just before trailing
 * parentheses is rewritten in place. Only that line changes. Null when the line is not an entry.
 */
export function setEntryEnd(text: string, day: DayKey, rules: ScheduleRules, line: number, end: DayKey): string | null {
	if (!parseSchedule(text, day, rules).some((entry) => entry.line === line)) return null;
	// Odd indexes hold the line breaks, so every other line keeps its own.
	const parts = text.split(/(\r?\n)/);
	const old = parts[2 * line] ?? '';
	const body = old.trimEnd();
	const paren = RANGE_RE.test(body) ? null : PAREN_RE.exec(body);
	const tail = paren && RANGE_RE.test(body.slice(0, paren.index)) ? paren[0] : '';
	const head = body.slice(0, body.length - tail.length).replace(RANGE_RE, '');
	parts[2 * line] = head + rangeToken(day, end) + tail + old.slice(body.length);
	return parts.join('');
}

function formatEntryLine(entry: NewEntry): string {
	return `- [ ] ${entry.title}${rangeToken(entry.start, entry.end)}`;
}

/** ` ~MM-DD`, or ` ~YYYY-MM-DD` in another year, for an entry from `start` to `end`; empty for one day. */
function rangeToken(start: DayKey, end: DayKey): string {
	if (end === start) return '';
	return ` ~${yearMonth(end).year === yearMonth(start).year ? end.slice(5) : end}`;
}

function classify(lines: readonly string[]): LineKind[] {
	const kinds: LineKind[] = [];
	let fence: string | null = null;
	let frontmatter = lines[0] === '---';
	lines.forEach((line, i) => {
		if (frontmatter) {
			kinds.push({ kind: 'code' });
			if (i > 0 && (line === '---' || line === '...')) frontmatter = false;
			return;
		}
		const fenceMatch = FENCE_RE.exec(line);
		if (fence !== null) {
			kinds.push({ kind: 'code' });
			if (fenceMatch?.[1]?.startsWith(fence)) fence = null;
			return;
		}
		if (fenceMatch) {
			fence = fenceMatch[1] ?? null;
			kinds.push({ kind: 'code' });
			return;
		}
		const heading = HEADING_RE.exec(line);
		kinds.push(
			heading ? { kind: 'heading', level: heading[1]?.length ?? 1, text: (heading[2] ?? '').trim() } : { kind: 'text' },
		);
	});
	return kinds;
}

/** Every H1 section, in file order. */
function h1Sections(classes: readonly LineKind[]): Section[] {
	const sections: Section[] = [];
	classes.forEach((line, i) => {
		if (line.kind !== 'heading' || line.level !== 1) return;
		const previous = sections[sections.length - 1];
		if (previous) previous.to = i;
		sections.push({ h1: line.text, from: i + 1, to: classes.length });
	});
	return sections;
}

/**
 * Per line of `section` (index 0 is `section.from`), whether it is in a region opened by a
 * sub-heading named `name` (any case). The region ends at the next heading of the same or a
 * higher level.
 */
function hiddenLines(classes: readonly LineKind[], section: Section, name: string): boolean[] {
	const wanted = name.toLowerCase();
	let level: number | null = null;
	const hidden: boolean[] = [];
	for (let i = section.from; i < section.to; i++) {
		const line = classes[i];
		if (line?.kind === 'heading') {
			if (level !== null && line.level <= level) level = null;
			if (level === null && line.text.toLowerCase() === wanted) level = line.level;
		}
		hidden.push(level !== null);
	}
	return hidden;
}

function parseItem(content: string, day: DayKey): Omit<ParsedEntry, 'line' | 'kind' | 'onCalendar'> | null {
	let rest = content.trim();
	let task: TaskState = null;
	const box = TASK_RE.exec(rest);
	if (box) {
		task = box[1] === ' ' ? 'open' : 'done';
		rest = (box[2] ?? '').trim();
	}

	let end: DayKey = day;
	const range = RANGE_RE.exec(rest);
	if (range) {
		end = resolveEnd(range, day);
		rest = rest.slice(0, range.index);
	} else {
		// `부산 출장 ~10-23 (회의)`: the range still counts and the parentheses stay in the title.
		const paren = PAREN_RE.exec(rest);
		const beforeParen = paren ? RANGE_RE.exec(rest.slice(0, paren.index)) : null;
		if (paren && beforeParen) {
			end = resolveEnd(beforeParen, day);
			rest = rest.slice(0, beforeParen.index) + paren[0];
		}
	}

	const title = rest.trim();
	return title === '' ? null : { title, end, task };
}

/** The end date a `~…` token names, or `start` when it is invalid or before `start`. */
function resolveEnd(match: RegExpExecArray, start: DayKey): DayKey {
	const [, y, m, d, shortM, shortD] = match;
	let end: DayKey | null;
	if (y !== undefined) {
		end = dayKey(Number(y), Number(m), Number(d));
	} else {
		const { year } = yearMonth(start);
		end = dayKey(year, Number(shortM), Number(shortD));
		if (end !== null && end < start) end = dayKey(year + 1, Number(shortM), Number(shortD));
	}
	return end !== null && end >= start ? end : start;
}

function dayKey(year: number, month: number, day: number): DayKey | null {
	return parseDayKey(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
}
