import { categoryKey } from '../categoryColor';
import { DayKey, parseDayKey, yearMonth } from '../date/dayKey';

/** One schedule line of a daily note. The store adds the note's path and date. */
export interface ParsedEntry {
	/** 0-based line of the list item in the file. */
	line: number;
	title: string;
	/** Inclusive. Equal to the note's date for a one-day entry. */
	end: DayKey;
	/** The category name as written in settings. */
	category?: string;
	done: boolean;
}

export interface NewEntry {
	title: string;
	start: DayKey;
	end: DayKey;
	category?: string;
}

type LineKind = { kind: 'heading'; level: number; text: string } | { kind: 'code' } | { kind: 'text' };

const HEADING_RE = /^(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const ITEM_RE = /^[-*+][ \t]+(.*)$/;
const CONTINUATION_RE = /^[ \t]+\S/;
const TASK_RE = /^\[([^\]])\](?:[ \t]+(.*))?$/;
const RANGE_RE = /\s*~(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[-/](\d{1,2}))$/;
const PAREN_RE = /\s*\(([^()]*)\)$/;

export function isScheduleHeading(text: string, heading: string): boolean {
	return text.trim().toLowerCase() === heading.trim().toLowerCase();
}

/**
 * The entries under every `heading` section of a daily note dated `day`. Each top-level list
 * item is one entry; indented items, code blocks and frontmatter are ignored. A section ends at
 * the next heading of the same or a higher level.
 */
export function parseSchedule(
	text: string,
	day: DayKey,
	heading: string,
	categories: readonly string[],
): ParsedEntry[] {
	const lines = text.split(/\r?\n/);
	const kinds = classify(lines);
	const entries: ParsedEntry[] = [];
	for (const { from, to } of sections(kinds, heading)) {
		for (let i = from; i < to; i++) {
			const item = kinds[i]?.kind === 'text' ? ITEM_RE.exec(lines[i] ?? '') : null;
			const entry = item ? parseItem(item[1] ?? '', day, categories) : null;
			if (entry) entries.push({ line: i, ...entry });
		}
	}
	return entries;
}

/**
 * `text` with `entry` added as the last top-level item of the first `heading` section, or with a
 * new `## heading` section at the end when there is none.
 */
export function appendScheduleLine(text: string, heading: string, entry: NewEntry): string {
	const eol = text.includes('\r\n') ? '\r\n' : '\n';
	const item = formatEntryLine(entry);
	const lines = text.split(/\r?\n/);
	const kinds = classify(lines);
	const section = sections(kinds, heading)[0];

	if (!section) {
		const body = text.replace(/(\r?\n)+$/, '');
		return `${body === '' ? '' : body + eol + eol}## ${heading}${eol}${item}${eol}`;
	}

	const isText = (i: number) => kinds[i]?.kind === 'text';
	let lastItem = -1;
	let lastContent = section.from - 1;
	for (let i = section.from; i < section.to; i++) {
		if (isText(i) && ITEM_RE.test(lines[i] ?? '')) lastItem = i;
		if ((lines[i] ?? '').trim() !== '') lastContent = i;
	}
	let at = lastContent + 1;
	if (lastItem >= 0) {
		at = lastItem + 1;
		while (at < section.to && isText(at) && CONTINUATION_RE.test(lines[at] ?? '')) at++;
	}
	lines.splice(at, 0, item);
	return lines.join(eol);
}

/** Splits a title typed by the user into the title and a trailing `(category)`, if it names one. */
export function parseEntryInput(input: string, categories: readonly string[]): { title: string; category?: string } {
	const title = input.trim();
	const trailing = trailingCategory(title, categories);
	return trailing ? { title: trailing.rest, category: trailing.category } : { title };
}

function formatEntryLine(entry: NewEntry): string {
	let line = `- ${entry.title}`;
	if (entry.end !== entry.start) {
		line += ` ~${yearMonth(entry.end).year === yearMonth(entry.start).year ? entry.end.slice(5) : entry.end}`;
	}
	if (entry.category) line += ` (${entry.category})`;
	return line;
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
		kinds.push(heading ? { kind: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' } : { kind: 'text' });
	});
	return kinds;
}

/** Line ranges `[from, to)` of each section under `heading`, excluding the heading line itself. */
function sections(kinds: readonly LineKind[], heading: string): Array<{ from: number; to: number }> {
	const result: Array<{ from: number; to: number }> = [];
	kinds.forEach((kind, i) => {
		if (kind.kind !== 'heading' || !isScheduleHeading(kind.text, heading)) return;
		let to = i + 1;
		while (to < kinds.length) {
			const next = kinds[to];
			if (next?.kind === 'heading' && next.level <= kind.level) break;
			to++;
		}
		result.push({ from: i + 1, to });
	});
	return result;
}

function parseItem(
	content: string,
	day: DayKey,
	categories: readonly string[],
): Omit<ParsedEntry, 'line'> | null {
	let rest = content.trim();
	let done = false;
	const task = TASK_RE.exec(rest);
	if (task) {
		done = task[1] !== ' ';
		rest = (task[2] ?? '').trim();
	}

	let end: DayKey | undefined;
	let category: string | undefined;
	for (;;) {
		const range = end === undefined ? RANGE_RE.exec(rest) : null;
		if (range) {
			end = resolveEnd(range, day);
			rest = rest.slice(0, range.index);
			continue;
		}
		const trailing = category === undefined ? trailingCategory(rest, categories) : null;
		if (trailing) {
			category = trailing.category;
			rest = trailing.rest;
			continue;
		}
		break;
	}
	// `부산 출장 ~10-23 (회의)` where `(회의)` names no category: the range still counts and the
	// parentheses stay in the title.
	if (end === undefined) {
		const paren = PAREN_RE.exec(rest);
		const range = paren ? RANGE_RE.exec(rest.slice(0, paren.index)) : null;
		if (paren && range) {
			end = resolveEnd(range, day);
			rest = rest.slice(0, range.index) + paren[0];
		}
	}

	const title = rest.trim();
	if (title === '') return null;
	const entry: Omit<ParsedEntry, 'line'> = { title, end: end ?? day, done };
	if (category !== undefined) entry.category = category;
	return entry;
}

/** A trailing `(name)` that matches a configured category, and the text before it. */
function trailingCategory(text: string, categories: readonly string[]): { rest: string; category: string } | null {
	const paren = PAREN_RE.exec(text);
	if (!paren) return null;
	const wanted = categoryKey(paren[1] ?? '');
	const category = wanted === '' ? undefined : categories.find((name) => categoryKey(name) === wanted);
	return category === undefined ? null : { rest: text.slice(0, paren.index).trim(), category };
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
