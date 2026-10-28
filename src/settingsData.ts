import type { Category } from './categoryColor';
import type { Weekday } from './date/dayKey';

export interface SidebarCalendarSettings {
	/** Text of the daily note heading whose list items are schedule entries. */
	scheduleHeading: string;
	weekStart: Weekday;
	maxLanes: number;
	categories: Category[];
	/** Bar color for events without a known category. Empty means the theme's accent color. */
	defaultColor: string;
	/** Show daily note dots and the open/create button (uses the core Daily notes plugin). */
	dailyNotes: boolean;
}

export const DEFAULT_SETTINGS: SidebarCalendarSettings = {
	scheduleHeading: '일정',
	weekStart: 0,
	maxLanes: 3,
	categories: [],
	defaultColor: '',
	dailyNotes: true,
};

export const MIN_LANES = 1;
export const MAX_LANES = 6;

/**
 * Turns whatever was saved in data.json (possibly hand-edited or from an older version) into
 * valid settings. Unknown or malformed values fall back to the defaults. Always returns fresh
 * objects, so editing the result never mutates DEFAULT_SETTINGS.
 */
export function sanitizeSettings(raw: unknown): SidebarCalendarSettings {
	const data = isRecord(raw) ? raw : {};
	const d = DEFAULT_SETTINGS;

	const lanes = typeof data.maxLanes === 'number' && Number.isFinite(data.maxLanes)
		? Math.min(MAX_LANES, Math.max(MIN_LANES, Math.round(data.maxLanes)))
		: d.maxLanes;
	const categories = Array.isArray(data.categories)
		? data.categories.filter(isRecord).map((c) => ({
			name: typeof c.name === 'string' ? c.name : '',
			color: typeof c.color === 'string' ? c.color : '',
		}))
		: [];

	return {
		scheduleHeading: sanitizeHeading(data.scheduleHeading),
		weekStart: data.weekStart === 1 || data.weekStart === '1' ? 1 : 0,
		maxLanes: lanes,
		categories,
		defaultColor: typeof data.defaultColor === 'string' ? data.defaultColor : d.defaultColor,
		dailyNotes: typeof data.dailyNotes === 'boolean' ? data.dailyNotes : d.dailyNotes,
	};
}

/** Heading text without leading `#`s and spaces; empty or not a string means the default. */
export function sanitizeHeading(value: unknown): string {
	const text = typeof value === 'string' ? value.trim().replace(/^[#\s]+/, '') : '';
	return text || DEFAULT_SETTINGS.scheduleHeading;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
