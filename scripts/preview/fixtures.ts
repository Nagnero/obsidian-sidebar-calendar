import type { SidebarCalendarSettings } from '../../src/settingsData';

export const EVENTS_FOLDER = 'Events';

/** Event notes by file name, with the frontmatter the metadata cache would hold for each. */
export const EVENT_NOTES: Record<string, Record<string, unknown>> = {
	'Jeju trip': { title: 'Jeju trip', start: '2026-10-06', end: '2026-10-09', category: 'travel' },
	'Dentist': { title: 'Dentist', start: '2026-10-15', category: 'health' },
	'Design workshop': { title: 'Design workshop', start: '2026-10-16', end: '2026-10-20', category: 'study' },
	'Sprint review': { title: 'Sprint review', start: '2026-10-19', end: '2026-10-21', category: 'work' },
	'Conference': { title: 'Conference', start: '2026-10-19', end: '2026-10-23', category: 'work' },
	'Hackathon': { title: 'Hackathon', start: '2026-10-20', end: '2026-10-22', category: 'study' },
	'Team lunch': { title: 'Team lunch', start: '2026-10-20', category: 'work' },
	'Month-end report': { title: 'Month-end report', start: '2026-10-30', category: 'work' },
	'Bad date': { title: 'Bad date', start: '2026-13-45' },
};

/** Settings every scenario starts from; a scenario's own settings override these. */
export const BASE_SETTINGS: Partial<SidebarCalendarSettings> = {
	eventsFolder: EVENTS_FOLDER,
	categories: [
		{ name: 'travel', color: '#0090ff' },
		{ name: 'health', color: '#30a46c' },
		{ name: 'work', color: '#e5484d' },
		{ name: 'study', color: '#8e4ec6' },
	],
};
