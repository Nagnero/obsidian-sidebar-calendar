import type { Weekday } from './date/dayKey';

/** An H1 of the daily note template, used as a kind of schedule entry. */
export interface Kind {
	/** The H1 text, trimmed. Unique within the settings. */
	name: string;
	/** Whether entries under this H1 are read and offered when adding. */
	enabled: boolean;
	/** CSS color, e.g. `#e5484d`. Empty means the theme's accent color. */
	color: string;
}

export interface SidebarCalendarSettings {
	weekStart: Weekday;
	maxLanes: number;
	/** Mark days that have a daily note (uses the core Daily notes plugin). */
	dailyNotes: boolean;
	/** Draw entries whose `start` equals `end` on the grid. The day list shows them either way. */
	showOneDay: boolean;
	/** Every H1 seen in the template, in template order; ones no longer there come last. */
	kinds: Kind[];
	/** Name of the kind chosen last when adding an entry. */
	lastKind: string;
}

export const DEFAULT_SETTINGS: SidebarCalendarSettings = {
	weekStart: 0,
	maxLanes: 3,
	dailyNotes: true,
	showOneDay: true,
	kinds: [],
	lastKind: '',
};

export const MIN_LANES = 1;
export const MAX_LANES = 6;

/** Colors given to new kinds, first unused one first. */
export const KIND_COLORS = ['#e5484d', '#30a46c', '#0090ff', '#f76b15', '#8e4ec6', '#ffc53d', '#12a594'];

/**
 * Turns whatever was saved in data.json (possibly hand-edited or from an older version) into
 * valid settings. Unknown fields are dropped and malformed values fall back to the defaults.
 * Always returns fresh objects, so editing the result never mutates DEFAULT_SETTINGS.
 */
export function sanitizeSettings(raw: unknown): SidebarCalendarSettings {
	const data = isRecord(raw) ? raw : {};
	const d = DEFAULT_SETTINGS;

	const lanes = typeof data.maxLanes === 'number' && Number.isFinite(data.maxLanes)
		? Math.min(MAX_LANES, Math.max(MIN_LANES, Math.round(data.maxLanes)))
		: d.maxLanes;

	const kinds: Kind[] = [];
	for (const k of Array.isArray(data.kinds) ? data.kinds : []) {
		const name = isRecord(k) && typeof k.name === 'string' ? k.name.trim() : '';
		if (!isRecord(k) || name === '' || kinds.some((kind) => kind.name === name)) continue;
		kinds.push({
			name,
			enabled: typeof k.enabled === 'boolean' ? k.enabled : true,
			color: typeof k.color === 'string' ? k.color : '',
		});
	}

	return {
		weekStart: data.weekStart === 1 || data.weekStart === '1' ? 1 : 0,
		maxLanes: lanes,
		dailyNotes: typeof data.dailyNotes === 'boolean' ? data.dailyNotes : d.dailyNotes,
		showOneDay: typeof data.showOneDay === 'boolean' ? data.showOneDay : d.showOneDay,
		kinds,
		lastKind: typeof data.lastKind === 'string' ? data.lastKind : d.lastKind,
	};
}

/**
 * The stored kinds matched to the template's H1s: one per H1 in template order (a new H1 gets
 * enabled with the first unused preset color), then the stored kinds the template no longer has,
 * kept so their settings survive a template edit. Existing kinds keep their object identity.
 */
export function reconcileKinds(stored: readonly Kind[], templateH1s: readonly string[]): Kind[] {
	const known = [...stored];
	const result: Kind[] = [];
	for (const name of templateH1s) {
		let kind = known.find((k) => k.name === name);
		if (!kind) {
			kind = { name, enabled: true, color: nextColor(known) };
			known.push(kind);
		}
		if (!result.includes(kind)) result.push(kind);
	}
	return [...result, ...stored.filter((k) => !templateH1s.includes(k.name))];
}

/** The enabled kinds that the template has, in template order. These are what gets read and offered. */
export function activeKinds(kinds: readonly Kind[], templateH1s: readonly string[]): Kind[] {
	return templateH1s.flatMap((name) => kinds.filter((k) => k.name === name && k.enabled).slice(0, 1));
}

function nextColor(taken: readonly Kind[]): string {
	const used = new Set(taken.map((k) => k.color.toLowerCase()));
	return KIND_COLORS.find((c) => !used.has(c)) ?? KIND_COLORS[taken.length % KIND_COLORS.length] ?? '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
