/** Languages the settings tab can be shown in. The rest of the plugin is English only. */
export const SETTINGS_LANGUAGES = ['en', 'ko'] as const;
export type SettingsLanguage = (typeof SETTINGS_LANGUAGES)[number];

/** Each language's name in itself, for the language dropdown. */
export const LANGUAGE_NAMES: Record<SettingsLanguage, string> = { en: 'English', ko: '한국어' };

export function isSettingsLanguage(value: unknown): value is SettingsLanguage {
	return SETTINGS_LANGUAGES.some((language) => language === value);
}

/** Text around a value that is shown as code, such as the template path. */
export interface Around {
	before: string;
	after: string;
}

const en = {
	language: 'Language (언어)',
	languageDesc: 'Applies to this settings tab only.',
	template: 'Daily note template',
	templateOff: 'Turn on the core daily notes plugin. Kinds come from the top-level headings of its template.',
	templateNone: 'Linked to core daily notes, which has no template. Set one in its settings; its top-level headings become the kinds.',
	templateMissing: { before: 'Linked to core daily notes, but its template ', after: ' was not found.' },
	templateOk: (headings: number): Around => ({
		before: 'Linked to core daily notes. Template: ',
		after: ` (${headings} ${headings === 1 ? 'heading' : 'headings'}).`,
	}),
	kinds: 'Kinds',
	kindsDesc: 'Each top-level heading (#) of the template is a kind. List items under it in daily notes are schedule entries.',
	noKinds: 'No top-level headings in the template yet.',
	staleKind: 'Not in the template. Not read or offered until the template has this heading again.',
	deleteKind: 'Delete',
	useAsKind: 'Use as kind',
	useAccentColor: 'Use theme accent color',
	calendar: 'Calendar',
	weekStart: 'Start week on',
	sunday: 'Sunday',
	monday: 'Monday',
	maxLanes: 'Bar rows per week',
	maxLanesDesc: 'Events that do not fit are counted in the number shown under their days.',
	showOneDay: 'Show one-day entries',
	showOneDayDesc: 'When off, the calendar shows only entries that span several days. The list under the calendar still shows every entry of the selected day.',
	dailyNotes: 'Daily notes',
	dailyNotesDesc:
		'Mark days that have a daily note with a dot, and with a ring when the note has an unchecked task. Clicking such a day opens its note. Uses the folder, format and template of the core daily notes plugin, which must be turned on.',
};

export type SettingsStrings = typeof en;

const ko: SettingsStrings = {
	language: '언어 (Language)',
	languageDesc: '이 설정 탭에만 적용돼요.',
	template: '일일 노트 템플릿',
	templateOff: '코어 플러그인 일일 노트를 켜 주세요. 종류는 그 템플릿의 최상위 제목에서 가져와요.',
	templateNone: '코어 플러그인 일일 노트와 연결되었지만 템플릿이 없어요. 일일 노트 설정에서 템플릿을 지정하면 그 최상위 제목이 종류가 돼요.',
	templateMissing: { before: '코어 플러그인 일일 노트와 연결되었지만 템플릿 ', after: ' 파일을 찾을 수 없어요.' },
	templateOk: (headings) => ({
		before: '코어 플러그인 일일 노트와 연결되어 있어요. 템플릿: ',
		after: ` (제목 ${headings}개).`,
	}),
	kinds: '종류',
	kindsDesc: '템플릿의 최상위 제목(#) 하나하나가 종류예요. 일일 노트에서 그 제목 아래에 있는 목록 항목이 일정이 돼요.',
	noKinds: '템플릿에 아직 최상위 제목이 없어요.',
	staleKind: '템플릿에 없는 제목이에요. 템플릿에 다시 생길 때까지 읽지 않고, 일정을 추가할 때도 보여 주지 않아요.',
	deleteKind: '삭제',
	useAsKind: '종류로 사용',
	useAccentColor: '테마 강조 색상 사용',
	calendar: '달력',
	weekStart: '주 시작 요일',
	sunday: '일요일',
	monday: '월요일',
	maxLanes: '주당 막대 줄 수',
	maxLanesDesc: '들어가지 못한 일정은 날짜 아래에 표시되는 숫자에 포함돼요.',
	showOneDay: '하루짜리 일정 표시',
	showOneDayDesc: '끄면 달력에는 여러 날에 걸친 일정만 표시돼요. 달력 아래 목록에는 선택한 날의 일정이 모두 그대로 표시돼요.',
	dailyNotes: '일일 노트',
	dailyNotesDesc:
		'일일 노트가 있는 날은 점으로, 그 노트에 완료하지 않은 할 일이 있으면 고리로 표시해요. 그런 날을 클릭하면 노트가 열려요. 코어 플러그인 일일 노트의 폴더, 형식, 템플릿을 사용하므로 그 플러그인을 켜 두어야 해요.',
};

export const SETTINGS_STRINGS: Record<SettingsLanguage, SettingsStrings> = { en, ko };
