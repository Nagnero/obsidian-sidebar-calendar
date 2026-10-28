import { DayKey, parseDayKey, yearMonth } from '../date/dayKey';

/** One schedule line of a daily note. The store adds the note's path and date. */
export interface ParsedEntry {
	/** 0-based line of the list item in the file. */
	line: number;
	title: string;
	/** Inclusive. Equal to the note's date for a one-day entry. */
	end: DayKey;
	/** Text of the H1 the entry sits under. */
	kind: string;
	done: boolean;
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
 * one of `kinds` is an entry of that kind, including items under deeper headings; the section
 * ends at the next H1. Indented items, code blocks and frontmatter are ignored.
 */
export function parseSchedule(text: string, day: DayKey, kinds: readonly string[]): ParsedEntry[] {
	const lines = text.split(/\r?\n/);
	const classes = classify(lines);
	const entries: ParsedEntry[] = [];
	for (const { h1, from, to } of h1Sections(classes)) {
		if (!kinds.includes(h1)) continue;
		for (let i = from; i < to; i++) {
			const item = classes[i]?.kind === 'text' ? ITEM_RE.exec(lines[i] ?? '') : null;
			const entry = item ? parseItem(item[1] ?? '', day) : null;
			if (entry) entries.push({ line: i, ...entry, kind: h1 });
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
 * `text` with `entry` written as an open task in the first `# kind` section: after the section's
 * last top-level item and that item's indented lines, or, with no item, after the section's last
 * non-blank line. A note without that H1 gets a new `# kind` section at the end.
 */
export function appendScheduleLine(text: string, kind: string, entry: NewEntry): string {
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

function formatEntryLine(entry: NewEntry): string {
	let line = `- [ ] ${entry.title}`;
	if (entry.end !== entry.start) {
		line += ` ~${yearMonth(entry.end).year === yearMonth(entry.start).year ? entry.end.slice(5) : entry.end}`;
	}
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

function parseItem(content: string, day: DayKey): Omit<ParsedEntry, 'line' | 'kind'> | null {
	let rest = content.trim();
	let done = false;
	const task = TASK_RE.exec(rest);
	if (task) {
		done = task[1] !== ' ';
		rest = (task[2] ?? '').trim();
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
	return title === '' ? null : { title, end, done };
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
