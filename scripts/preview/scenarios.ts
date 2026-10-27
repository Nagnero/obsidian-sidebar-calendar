import type { DayKey } from '../../src/date/dayKey';
import type { SidebarCalendarSettings } from '../../src/settingsData';

export type Action = { click: 'next' | 'prev' | 'today' } | { selectDay: DayKey };

export interface PreviewScenario {
	name: string;
	theme: 'light' | 'dark';
	today: DayKey;
	/** App language, as Obsidian sets it on moment. Defaults to English. */
	locale?: string;
	settings?: Partial<SidebarCalendarSettings>;
	/** Days that have a daily note in the fake vault. */
	dailyNotes?: DayKey[];
	/** Applied in order through the rendered DOM after the first render. */
	actions?: Action[];
}

const TODAY = '2026-10-15';
const NOTE_DAYS = ['2026-10-12', '2026-10-15', '2026-10-20'];

/** Every scenario run.mjs captures. Add a row here to add a screenshot. */
export const SCENARIOS: readonly PreviewScenario[] = [
	{ name: 'month-light', theme: 'light', today: TODAY, dailyNotes: NOTE_DAYS },
	{ name: 'month-dark', theme: 'dark', today: TODAY, dailyNotes: NOTE_DAYS },
	{
		name: 'day-selected-dark',
		theme: 'dark',
		today: TODAY,
		dailyNotes: NOTE_DAYS,
		actions: [{ selectDay: '2026-10-20' }],
	},
	{ name: 'next-month-light', theme: 'light', today: TODAY, dailyNotes: NOTE_DAYS, actions: [{ click: 'next' }] },
	{ name: 'korean-light', theme: 'light', today: TODAY, dailyNotes: NOTE_DAYS, locale: 'ko' },
	{ name: 'monday-start-light', theme: 'light', today: TODAY, dailyNotes: NOTE_DAYS, settings: { weekStart: 1 } },
];
