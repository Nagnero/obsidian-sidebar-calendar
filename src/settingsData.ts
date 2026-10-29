import type { Weekday } from './date/dayKey';
import { isListSort, ListSort } from './data/sortEntries';
import { isSettingsLanguage, SettingsLanguage } from './i18n';
import { KindColor, NAMED_COLORS, NamedColor, parseKindColor } from './kindColor';

/** An H1 of the daily note template, used as a kind of schedule entry. */
export interface Kind {
	/** The H1 text, trimmed. Unique within the settings. */
	name: string;
	/** Whether entries under this H1 are read and offered when adding. */
	enabled: boolean;
	color: KindColor;
}

export interface SidebarCalendarSettings {
	/** Language of the settings tab. The calendar itself is English only. */
	settingsLanguage: SettingsLanguage;
	weekStart: Weekday;
	maxLanes: number;
	/** Mark days that have a daily note, and ones with an unchecked task (uses the core Daily notes plugin). */
	dailyNotes: boolean;
	/** Draw entries whose `start` equals `end` on the grid. The day list shows them either way. */
	showOneDay: boolean;
	/** Show done tasks on the grid and in the day list. Chosen from the day list's sort menu. */
	showDone: boolean;
	/** Every H1 seen in the template, in template order; ones no longer there come last. */
	kinds: Kind[];
	/** Name of the kind chosen last when adding an entry. */
	lastKind: string;
	/** Order of the selected day's list. */
	listSort: ListSort;
	/** Sub-heading inside a kind whose items are listed for their day but not drawn on the grid. */
	hiddenSubheading: string;
}

export const DEFAULT_SETTINGS: SidebarCalendarSettings = {
	settingsLanguage: 'en',
	weekStart: 0,
	maxLanes: 3,
	dailyNotes: true,
	showOneDay: true,
	showDone: true,
	kinds: [],
	lastKind: '',
	listSort: 'start',
	hiddenSubheading: 'To do',
};

export const MIN_LANES = 1;
export const MAX_LANES = 6;

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
			color: parseKindColor(k.color),
		});
	}

	return {
		settingsLanguage: isSettingsLanguage(data.settingsLanguage) ? data.settingsLanguage : d.settingsLanguage,
		weekStart: data.weekStart === 1 || data.weekStart === '1' ? 1 : 0,
		maxLanes: lanes,
		dailyNotes: typeof data.dailyNotes === 'boolean' ? data.dailyNotes : d.dailyNotes,
		showOneDay: typeof data.showOneDay === 'boolean' ? data.showOneDay : d.showOneDay,
		showDone: typeof data.showDone === 'boolean' ? data.showDone : d.showDone,
		kinds,
		lastKind: typeof data.lastKind === 'string' ? data.lastKind : d.lastKind,
		listSort: isListSort(data.listSort) ? data.listSort : d.listSort,
		hiddenSubheading: sanitizeSubheading(data.hiddenSubheading),
	};
}

/**
 * The stored kinds matched to the template's H1s: one per H1 in template order (a new H1 gets
 * enabled with the first unused named color), then the stored kinds the template no longer has,
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

/** A sub-heading name as typed, without surrounding spaces or leading `#`s; empty gives the default. */
export function sanitizeSubheading(raw: unknown): string {
	const name = typeof raw === 'string' ? raw.trim().replace(/^#+/, '').trim() : '';
	return name === '' ? DEFAULT_SETTINGS.hiddenSubheading : name;
}

function nextColor(taken: readonly Kind[]): NamedColor {
	const used = new Set<KindColor>(taken.map((k) => k.color));
	return NAMED_COLORS.find((c) => !used.has(c)) ?? NAMED_COLORS[taken.length % NAMED_COLORS.length] ?? 'red';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
