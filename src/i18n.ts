import type { NamedColor } from './kindColor';

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
	languageDesc: 'Applies to this settings tab and the group names in the list under the calendar.',
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
	color: 'Color',
	customColor: 'Custom color',
	colorNames: {
		'': 'Theme accent',
		red: 'Red',
		orange: 'Orange',
		yellow: 'Yellow',
		green: 'Green',
		cyan: 'Cyan',
		blue: 'Blue',
		purple: 'Purple',
		pink: 'Pink',
	} satisfies Record<'' | NamedColor, string>,
	calendar: 'Calendar',
	weekStart: 'Start week on',
	sunday: 'Sunday',
	monday: 'Monday',
	maxLanes: 'Bar rows per week',
	maxLanesDesc: 'Events that do not fit are counted in the number shown under their days.',
	barStyle: 'Bar style',
	barStyleDesc: 'Title draws each entry as a filled bar with its title in it. Line draws thin bars without text.',
	barStyleTitle: 'Title',
	barStyleLine: 'Line',
	showOneDay: 'Show one-day entries',
	showOneDayDesc: 'When off, the calendar shows only entries that span several days. The list under the calendar still shows every entry of the selected day.',
	hiddenSubheading: 'Sub-heading hidden from the calendar',
	hiddenSubheadingDesc:
		'Tasks under a sub-heading (## or deeper) with this name inside a kind are not drawn on the calendar, until the next heading of the same or a higher level. They show as to-dos in the list under the calendar and count toward the open-task ring. Items without a checkbox there are ignored. Not case-sensitive.',
	plainItems: 'Show items without a checkbox',
	plainItemsDesc:
		'When on, list items without a checkbox outside the hidden sub-heading are entries too. When off, only items with a checkbox (- [ ] or - [x]) are entries.',
	showOverdue: 'Show overdue to-dos',
	showOverdueDesc: 'When on, selecting today lists the unchecked to-dos of earlier days under Overdue in the list under the calendar.',
	dailyNotes: 'Daily notes',
	dailyNotesDesc:
		'Mark days that have a daily note with a dot, and with a ring when the note has an unchecked task. Clicking such a day opens its note. Uses the folder, format and template of the core daily notes plugin, which must be turned on.',
};

export type SettingsStrings = typeof en;

const ko: SettingsStrings = {
	language: '언어 (Language)',
	languageDesc: '이 설정 탭과 Calendar 아래 목록의 묶음 이름에 적용됩니다.',
	template: '일일 노트 템플릿',
	templateOff: "코어 플러그인 '일일 노트'를 켜 주십시오. 종류는 일일 노트 템플릿의 최상위 제목(#)에서 가져옵니다.",
	templateNone: '일일 노트 템플릿이 지정되지 않았습니다. 일일 노트 설정에서 템플릿을 지정하면 그 템플릿의 최상위 제목(#)이 종류가 됩니다.',
	templateMissing: { before: '템플릿 파일 ', after: '을(를) 찾을 수 없습니다.' },
	templateOk: (headings) => ({
		before: '코어 플러그인 일일 노트와 연결되어 있습니다. 템플릿: ',
		after: ` (제목 ${headings}개).`,
	}),
	kinds: '종류',
	kindsDesc: '템플릿의 최상위 제목(#)마다 종류가 하나씩 만들어집니다. 일일 노트에서 그 제목 아래에 적은 목록 항목이 일정으로 표시됩니다.',
	noKinds: '템플릿에 아직 최상위 제목이 없습니다.',
	staleKind: '템플릿에서 삭제된 제목입니다. 템플릿에 다시 추가하면 이전 설정 그대로 사용됩니다. 그 전까지는 Calendar에 표시하지 않고, 일정 추가 시 선택할 수도 없습니다.',
	deleteKind: '삭제',
	useAsKind: '종류로 사용',
	color: '색상',
	customColor: '사용자 지정 색상',
	colorNames: {
		'': '테마 강조색',
		red: '빨강',
		orange: '주황',
		yellow: '노랑',
		green: '초록',
		cyan: '청록',
		blue: '파랑',
		purple: '보라',
		pink: '분홍',
	},
	calendar: 'Calendar',
	weekStart: '주 시작 요일',
	sunday: '일요일',
	monday: '월요일',
	maxLanes: '주당 일정 수',
	maxLanesDesc: '칸에 다 들어가지 못한 일정은 날짜 아래에 +N으로 표시됩니다.',
	barStyle: '막대 모양',
	barStyleDesc: '제목은 각 일정을 색이 채워진 막대 안에 제목과 함께 표시합니다. 선은 글자 없이 얇은 막대로 표시합니다.',
	barStyleTitle: '제목',
	barStyleLine: '선',
	showOneDay: '하루짜리 일정 표시',
	showOneDayDesc: '끄면 Calendar에는 여러 날에 걸친 일정만 표시됩니다. Calendar 아래 목록에는 선택한 날의 일정이 모두 그대로 표시됩니다.',
	hiddenSubheading: 'Calendar에서 숨길 소제목',
	hiddenSubheadingDesc:
		'종류 안에서 이 이름의 소제목(## 이하) 아래에 적은 할 일은 Calendar에 막대로 표시하지 않습니다. 같은 수준이나 더 높은 수준의 다음 제목에서 이 구역이 끝납니다. Calendar 아래 목록에는 할 일로 표시되고, 완료하지 않은 할 일은 빈 원에도 반영됩니다. 이 구역의 체크박스 없는 항목은 무시합니다. 대소문자는 구분하지 않습니다.',
	plainItems: '체크박스 없는 항목도 표시',
	plainItemsDesc:
		'켜면 숨길 소제목 밖에 있는 체크박스 없는 목록 항목도 일정으로 표시합니다. 끄면 체크박스가 있는 항목(- [ ], - [x])만 일정으로 표시합니다.',
	showOverdue: '지난 할 일 표시',
	showOverdueDesc: '켜면 오늘을 선택했을 때 지난 날짜의 완료하지 않은 할 일을 Calendar 아래 목록의 지난 할 일 묶음에 표시합니다.',
	dailyNotes: '일일 노트',
	dailyNotesDesc:
		'일일 노트가 있는 날은 점으로, 그 노트에 완료하지 않은 할 일이 있으면 빈 원으로 표시합니다. 그런 날을 클릭하면 노트가 열립니다. 코어 플러그인 일일 노트의 폴더, 형식, 템플릿을 사용하므로 그 플러그인을 켜 두어야 합니다.',
};

export const SETTINGS_STRINGS: Record<SettingsLanguage, SettingsStrings> = { en, ko };

/** Words of the list under the calendar that follow the language setting. */
export interface DayListStrings {
	events: string;
	none: string;
	overdue: string;
	moveToToday: string;
}

export const DAY_LIST_STRINGS: Record<SettingsLanguage, DayListStrings> = {
	en: { events: 'Events', none: 'None', overdue: 'Overdue', moveToToday: 'Move to today' },
	ko: { events: '일정', none: '없음', overdue: '지난 할 일', moveToToday: '오늘로 옮기기' },
};
