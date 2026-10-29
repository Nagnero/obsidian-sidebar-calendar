import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendScheduleLine, putEntry, takeEntry, ParsedEntry, parseSchedule, setEntryEnd, setEntryTask, templateH1s } from '../src/data/parseSchedule';

const DAY = '2026-10-20';
const KINDS = ['업무', '개인'];

const HIDDEN = 'To do';
const RULES = { kinds: KINDS, hiddenSubheading: HIDDEN, plainItems: true };

function parse(text: string, day = DAY, kinds: readonly string[] = KINDS) {
	return parseSchedule(text, day, { ...RULES, kinds });
}

function append(text: string, kind: string, entry: { title: string; start: string; end: string }) {
	return appendScheduleLine(text, kind, entry, HIDDEN);
}

function one(item: string, day = DAY): ParsedEntry {
	const entries = parse(`# 업무\n${item}\n`, day);
	const [entry] = entries;
	assert.ok(entry && entries.length === 1, `expected one entry from ${item}`);
	return entry;
}

test('plain item is a one-day entry of its H1 kind on the note date', () => {
	assert.deepEqual(one('- 14:00 치과'), { line: 1, title: '14:00 치과', end: DAY, kind: '업무', task: null, onCalendar: true });
});

test('every list marker works', () => {
	assert.deepEqual(parse('# 업무\n- a\n* b\n+ c\n').map((e) => e.title), ['a', 'b', 'c']);
});

test('each H1 section gives entries of its own kind', () => {
	const text = '# 업무\n- 보고서\n# 개인\n- 치과\n- 운동\n';
	assert.deepEqual(parse(text).map((e) => [e.line, e.title, e.kind]), [
		[1, '보고서', '업무'],
		[3, '치과', '개인'],
		[4, '운동', '개인'],
	]);
});

test('H1s that are not kinds are not read, and match is exact', () => {
	const text = '# Journaling\n- 일기\n# 업무 계획\n- a\n# 업무\n- b\n# 개인 \n- c\n';
	assert.deepEqual(parse(text).map((e) => e.title), ['b', 'c']);
	assert.deepEqual(parse('# Work\n- a', DAY, ['work']), []);
	assert.deepEqual(parse('- a\n- b'), []);
	assert.deepEqual(parse('# 업무\n- a', DAY, []), []);
});

test('deeper headings inside a section are part of it; the next H1 ends it', () => {
	const text = ['# 업무', '- 첫째', '## 오후', '- 둘째', '### 메모', '- 셋째', '# 메모', '- 아님', '## 업무', '- 아님'].join('\n');
	assert.deepEqual(parse(text).map((e) => [e.line, e.title]), [[1, '첫째'], [3, '둘째'], [5, '셋째']]);
});

const onCalendar = (text: string, kinds: readonly string[] = ['Personal']) =>
	parse(text, DAY, kinds).map((e) => [e.title, e.onCalendar]);

test('task items under the To do sub-heading are entries kept off the calendar, plain items there are not entries', () => {
	const text = '# Personal\n- [ ] 18시 기헌이 약속\n## To do\n- [ ] 메리츠증권 자소서 작성\n  - 마감 금요일\n- 장보기\n';
	assert.deepEqual(parse(text, DAY, ['Personal']).map((e) => [e.line, e.title, e.task, e.kind, e.onCalendar]), [
		[1, '18시 기헌이 약속', 'open', 'Personal', true],
		[3, '메리츠증권 자소서 작성', 'open', 'Personal', false],
	]);
});

test('the To do region ends at the next heading of the same or a higher level', () => {
	assert.deepEqual(onCalendar('# Personal\n## To do\n- [ ] a\n## Evening\n- [ ] b\n'), [['a', false], ['b', true]]);
	assert.deepEqual(onCalendar('# Personal\n### To do\n- [ ] a\n## Evening\n- [ ] b\n'), [['a', false], ['b', true]]);
	assert.deepEqual(onCalendar('# Personal\n## To do\n- [ ] a\n# 업무\n- [ ] b\n', ['Personal', '업무']), [['a', false], ['b', true]]);
});

test('deeper headings inside the To do region stay hidden', () => {
	assert.deepEqual(onCalendar('# Personal\n## To do\n- [ ] a\n### Later\n- [ ] b\n#### Much later\n- [ ] c\n## Done\n- [ ] d\n'), [
		['a', false],
		['b', false],
		['c', false],
		['d', true],
	]);
});

test('the To do name matches in any case, as the whole heading text', () => {
	assert.deepEqual(onCalendar('# Personal\n## TO DO\n- [ ] a\n'), [['a', false]]);
	assert.deepEqual(onCalendar('# Personal\n## to do ##\n- [ ] a\n'), [['a', false]]);
	assert.deepEqual(onCalendar('# Personal\n## To do list\n- [ ] a\n## Todo\n- [ ] b\n'), [['a', true], ['b', true]]);
	assert.deepEqual(parseSchedule('# Personal\n## 할 일\n- [ ] a\n## To do\n- [ ] b\n', DAY, { kinds: ['Personal'], hiddenSubheading: '할 일', plainItems: true })
		.map((e) => [e.title, e.onCalendar]), [['a', false], ['b', true]]);
});

test('an H1 named To do is a kind, not a hidden region', () => {
	assert.deepEqual(onCalendar('# To do\n- [ ] a\n', ['To do']), [['a', true]]);
});

test('an H1 may have closing #s', () => {
	assert.deepEqual(parse('# 업무 ##\n- a').map((e) => e.title), ['a']);
});

test('task box sets the task state; a plain item is not a task', () => {
	assert.equal(one('- 보고서').task, null);
	assert.equal(one('- [ ] 보고서').task, 'open');
	assert.equal(one('- [ ] 보고서').title, '보고서');
	assert.equal(one('- [x] 보고서').task, 'done');
	assert.equal(one('- [/] 보고서').task, 'done');
	assert.equal(one('- [X] 보고서').title, '보고서');
});

test('range in MM-DD, M/D and YYYY-MM-DD', () => {
	assert.equal(one('- 부산 출장 ~10-23').end, '2026-10-23');
	assert.equal(one('- 부산 출장 ~10-23').title, '부산 출장');
	assert.equal(one('- 부산 출장 ~10/23').end, '2026-10-23');
	assert.equal(one('- 부산 출장 ~11/3').end, '2026-11-03');
	assert.equal(one('- 부산 출장 ~2026-11-02').end, '2026-11-02');
	assert.equal(one('- 부산 출장~10-22').title, '부산 출장');
});

test('MM-DD before the start date means next year', () => {
	assert.equal(one('- 연말 휴가 ~01-03', '2026-12-30').end, '2027-01-03');
	assert.equal(one('- 연말 휴가 ~2027-01-03', '2026-12-30').end, '2027-01-03');
});

test('invalid or backwards range keeps the entry as one day', () => {
	assert.deepEqual(one('- 회의 ~02-30'), { line: 1, title: '회의', end: DAY, kind: '업무', task: null, onCalendar: true });
	assert.equal(one('- 회의 ~2026-10-19').end, DAY);
	assert.equal(one('- 회의 ~2026-13-01').end, DAY);
	assert.equal(one('- 회의 ~2026-10-19').title, '회의');
});

test('parentheses are title text, and a range just before trailing parentheses still counts', () => {
	assert.equal(one('- 점심 (김밥천국)').title, '점심 (김밥천국)');
	assert.deepEqual(one('- [x] 부산 출장 (업무) ~10-23'), { line: 1, title: '부산 출장 (업무)', end: '2026-10-23', kind: '업무', task: 'done', onCalendar: true });
	assert.deepEqual(one('- 부산 출장 ~10-23 (회의)'), { line: 1, title: '부산 출장 (회의)', end: '2026-10-23', kind: '업무', task: null, onCalendar: true });
});

test('nested items are ignored', () => {
	const entries = parse('# 업무\n- [x] 부산 출장 ~10-23\n  - 숙소 예약 완료\n\t- 기차표\n- 치과\n');
	assert.deepEqual(entries.map((e) => [e.line, e.title]), [[1, '부산 출장'], [4, '치과']]);
});

test('empty titles are skipped', () => {
	assert.deepEqual(parse('# 업무\n- \n- [ ]\n- ~10-23\n- 진짜\n').map((e) => e.title), ['진짜']);
});

test('headings and list items in code blocks and frontmatter are ignored', () => {
	const text = '---\ntags: x\n# 업무\n- fm\n---\n# 업무\n```\n# 개인\n- code\n```\n- real\n';
	assert.deepEqual(parse(text).map((e) => [e.line, e.title, e.kind]), [[10, 'real', '업무']]);
});

test('CRLF line endings', () => {
	assert.deepEqual(parse('# 업무\r\n- a\r\n# 개인\r\n- b\r\n').map((e) => [e.title, e.kind]), [
		['a', '업무'],
		['b', '개인'],
	]);
});

test('template H1s in order, without duplicates, code blocks, deeper headings or variables', () => {
	const template = [
		'---',
		'# 앞머리',
		'---',
		'# {{date:YYYY-MM-DD}}',
		'# 업무',
		'- [ ] ',
		'## 회의',
		'# 개인 #',
		'```',
		'# 코드',
		'```',
		'# 업무',
		'#',
		'# Journaling',
		'오늘은…',
	].join('\n');
	assert.deepEqual(templateH1s(template), ['업무', '개인', 'Journaling']);
	assert.deepEqual(templateH1s(''), []);
});

const entry = (title: string, end = DAY) => ({ title, start: DAY, end });

test('append writes an open task after the last top-level item and its nested items', () => {
	const text = '# 업무\n- 치과\n  - 예약됨\n\n# 개인\n텍스트\n';
	assert.equal(append(text, '업무', entry('보고서')), '# 업무\n- 치과\n  - 예약됨\n- [ ] 보고서\n\n# 개인\n텍스트\n');
});

test('append into a section with free text goes below the text', () => {
	assert.equal(
		append('# 업무\n오늘 할 일:\n\n# 개인\n', '업무', entry('a')),
		'# 업무\n오늘 할 일:\n- [ ] a\n\n# 개인\n',
	);
	assert.equal(append('# 업무\n\n# 개인\n', '업무', entry('a')), '# 업무\n- [ ] a\n\n# 개인\n');
});

test('append goes to the chosen H1, even past deeper headings, and not to a later section', () => {
	const text = '# 업무\n- a\n# 개인\n- b\n## 저녁\n- c\n\n# Journaling\n일기\n';
	assert.equal(
		append(text, '개인', entry('d')),
		'# 업무\n- a\n# 개인\n- b\n## 저녁\n- c\n- [ ] d\n\n# Journaling\n일기\n',
	);
});

test('append goes above the To do sub-heading, after the last visible item', () => {
	const text = '# Personal\n- [ ] 18시 기헌이 약속\n  - 강남역\n## To do\n- [ ] 메리츠증권 자소서 작성\n';
	assert.equal(
		append(text, 'Personal', entry('점심')),
		'# Personal\n- [ ] 18시 기헌이 약속\n  - 강남역\n- [ ] 점심\n## To do\n- [ ] 메리츠증권 자소서 작성\n',
	);
	assert.equal(
		append('# Personal\n## to do\n- [ ] a\n## Evening\n- b\n', 'Personal', entry('c')),
		'# Personal\n## to do\n- [ ] a\n## Evening\n- b\n- [ ] c\n',
	);
});

test('append into a section whose items are all under To do goes right after the H1 and its text', () => {
	assert.equal(
		append('# Personal\n## To do\n- [ ] a\n', 'Personal', entry('b')),
		'# Personal\n- [ ] b\n## To do\n- [ ] a\n',
	);
	assert.equal(
		append('# Personal\n메모\n\n## To do\n- [ ] a\n\n# 업무\n', 'Personal', entry('b')),
		'# Personal\n메모\n- [ ] b\n\n## To do\n- [ ] a\n\n# 업무\n',
	);
});

test('an entry appended next to a To do region parses back on the calendar, and the To do item stays off it', () => {
	const base = '# 개인\n## To do\n- [ ] 자소서\n### 나중에\n- [ ] 여권\n';
	const text = append(append(base, '개인', entry('약속')), '개인', entry('출장', '2026-10-23'));
	assert.deepEqual(parse(text).map((e) => [e.title, e.end, e.task, e.onCalendar]), [
		['약속', DAY, 'open', true],
		['출장', '2026-10-23', 'open', true],
		['자소서', DAY, 'open', false],
		['여권', DAY, 'open', false],
	]);
});

test('setEntryEnd changes an entry under To do as well', () => {
	assert.equal(
		setEntryEnd('# 업무\n## To do\n- [ ] 보고서\n', DAY, RULES, 2, '2026-10-22'),
		'# 업무\n## To do\n- [ ] 보고서 ~10-22\n',
	);
});

test('append writes the range', () => {
	assert.equal(append('# 업무\n', '업무', entry('제주 여행', '2026-10-23')), '# 업무\n- [ ] 제주 여행 ~10-23\n');
	assert.equal(
		append('# 업무\n', '업무', { title: '연말', start: '2026-12-30', end: '2027-01-02' }),
		'# 업무\n- [ ] 연말 ~2027-01-02\n',
	);
});

test('append adds the H1 at the end when the note lacks it', () => {
	assert.equal(append('메모\n', '업무', entry('a')), '메모\n\n# 업무\n- [ ] a\n');
	assert.equal(append('메모', '업무', entry('a')), '메모\n\n# 업무\n- [ ] a\n');
	assert.equal(append('', '업무', entry('a')), '# 업무\n- [ ] a\n');
	assert.equal(append('## 업무\n- x\n', '업무', entry('a')), '## 업무\n- x\n\n# 업무\n- [ ] a\n');
	assert.equal(append('메모\r\n', '업무', entry('a')), '메모\r\n\r\n# 업무\r\n- [ ] a\r\n');
});

test('append keeps CRLF inside an existing section', () => {
	assert.equal(append('# 업무\r\n- x\r\n', '업무', entry('a')), '# 업무\r\n- x\r\n- [ ] a\r\n');
});

test('appended entries parse back as open tasks of the chosen kind', () => {
	const entries = [
		{ kind: '업무', title: '부산 출장', start: DAY, end: '2026-10-23' },
		{ kind: '개인', title: '점심 (김밥천국)', start: DAY, end: DAY },
		{ kind: '업무', title: '연말', start: DAY, end: '2027-01-02' },
	];
	for (const base of ['', '# 제목\n', '# 업무\n- [x] 기존\n  - 메모\n\n# 개인\n\n# Journaling\n일기\n']) {
		let text = base;
		for (const { kind, ...e } of entries) text = append(text, kind, e);
		const parsed = parse(text);
		for (const { kind, title, end } of entries) {
			assert.ok(
				parsed.some((p) => p.title === title && p.end === end && p.kind === kind && p.task === 'open'),
				`${title} round-trips from base ${JSON.stringify(base)}:\n${text}`,
			);
		}
	}
});

test('setEntryEnd turns a one-day entry into a 3-day entry', () => {
	const text = '# 업무\n- [ ] 보고서\n- 회의\n';
	assert.equal(setEntryEnd(text, DAY, RULES, 1, '2026-10-22'), '# 업무\n- [ ] 보고서 ~10-22\n- 회의\n');
});

test('setEntryEnd replaces an existing range, in either written form', () => {
	assert.equal(setEntryEnd('# 업무\n- 출장 ~10-23\n', DAY, RULES, 1, '2026-10-25'), '# 업무\n- 출장 ~10-25\n');
	assert.equal(setEntryEnd('# 업무\n- 출장 ~10/23\n', DAY, RULES, 1, '2026-10-21'), '# 업무\n- 출장 ~10-21\n');
	assert.equal(setEntryEnd('# 업무\n- 출장 ~2026-10-23\n', DAY, RULES, 1, '2026-10-21'), '# 업무\n- 출장 ~10-21\n');
});

test('setEntryEnd removes the range when the entry becomes one day', () => {
	assert.equal(setEntryEnd('# 업무\n- [x] 출장 ~10-23\n', DAY, RULES, 1, DAY), '# 업무\n- [x] 출장\n');
	assert.equal(setEntryEnd('# 업무\n- 치과\n', DAY, RULES, 1, DAY), '# 업무\n- 치과\n');
});

test('setEntryEnd keeps the task box and the list marker', () => {
	assert.equal(setEntryEnd('# 업무\n* [/] 보고서\n', DAY, RULES, 1, '2026-10-21'), '# 업무\n* [/] 보고서 ~10-21\n');
});

test('setEntryEnd keeps trailing parentheses in the title', () => {
	assert.equal(setEntryEnd('# 업무\n- 워크숍 (취미)\n', DAY, RULES, 1, '2026-10-21'), '# 업무\n- 워크숍 (취미) ~10-21\n');
	assert.equal(setEntryEnd('# 업무\n- 출장 ~10-23 (회의)\n', DAY, RULES, 1, '2026-10-25'), '# 업무\n- 출장 ~10-25 (회의)\n');
	assert.equal(setEntryEnd('# 업무\n- 출장 ~10-23 (회의)\n', DAY, RULES, 1, DAY), '# 업무\n- 출장 (회의)\n');
});

test('setEntryEnd writes the year when the range crosses into the next year', () => {
	assert.equal(setEntryEnd('# 업무\n- 휴가\n', '2026-12-30', RULES, 1, '2027-01-02'), '# 업무\n- 휴가 ~2027-01-02\n');
});

test('setEntryEnd returns null for a line that is not an entry', () => {
	const text = '# 업무\n- a\n  - nested\n텍스트\n# Journaling\n- b\n```\n- c\n```\n';
	for (const line of [0, 2, 3, 4, 5, 7, 99]) assert.equal(setEntryEnd(text, DAY, RULES, line, '2026-10-21'), null, `line ${line}`);
});

test('setEntryEnd keeps CRLF and every other line byte for byte', () => {
	const text = '# 업무\r\n- a  \r\n- b\n\n# 개인\r\n';
	assert.equal(setEntryEnd(text, DAY, RULES, 1, '2026-10-22'), '# 업무\r\n- a ~10-22  \r\n- b\n\n# 개인\r\n');
});

test('setEntryEnd round-trips through parseSchedule', () => {
	const text = '# 업무\n- [ ] 보고서\n- 출장 ~10-23 (회의)\n# 개인\n- 휴가 ~2026-11-02\n';
	for (const { line, title, task } of parse(text)) {
		for (const end of [DAY, '2026-10-21', '2026-12-31', '2027-01-05']) {
			const next = setEntryEnd(text, DAY, RULES, line, end);
			assert.ok(next !== null);
			const entry = parse(next).find((e) => e.line === line);
			assert.deepEqual(entry && [entry.title, entry.task, entry.end], [title, task, end], `${title} → ${end}`);
		}
	}
});

test('setEntryTask checks and unchecks a task entry, keeping its range and marker', () => {
	assert.equal(setEntryTask('# 업무\n- [ ] 출장 ~10-23\n', DAY, RULES, 1, true), '# 업무\n- [x] 출장 ~10-23\n');
	assert.equal(setEntryTask('# 업무\r\n* [x] 보고서\r\n', DAY, RULES, 1, false), '# 업무\r\n* [ ] 보고서\r\n');
});

test('setEntryTask returns null for a plain item or a line that is not an entry', () => {
	const text = '# 업무\n- 회의\n- [ ] 보고서\n';
	for (const line of [0, 1, 3]) assert.equal(setEntryTask(text, DAY, RULES, line, true), null, `line ${line}`);
});

test('without plainItems only items with a task box are entries', () => {
	const text = '# 업무\n- [ ] 보고서\n- 회의\n- [x] 장보기\n## To do\n- [ ] 자소서\n- 메모\n';
	assert.deepEqual(
		parseSchedule(text, DAY, { ...RULES, plainItems: false }).map((e) => [e.line, e.title, e.onCalendar]),
		[[1, '보고서', true], [3, '장보기', true], [5, '자소서', false]],
	);
});

test('setEntryEnd leaves a plain item alone without plainItems', () => {
	assert.equal(setEntryEnd('# 업무\n- 회의\n', DAY, { ...RULES, plainItems: false }, 1, '2026-10-22'), null);
});

test('takeEntry lifts an entry with its indented lines and moves its range to the new start', () => {
	const text = '# 업무\n- [ ] 출장 ~10-23 (부산)\n  - KTX\n- 회의\n';
	assert.deepEqual(takeEntry(text, DAY, RULES, 1, '2026-10-25'), {
		text: '# 업무\n- 회의\n',
		block: { lines: ['- [ ] 출장 ~10-28 (부산)', '  - KTX'], kind: '업무', onCalendar: true },
	});
	assert.deepEqual(takeEntry('# 업무\n- [x] 보고서\n', DAY, RULES, 1, '2026-12-31')?.block.lines, ['- [x] 보고서']);
	assert.equal(takeEntry(text, DAY, RULES, 2, '2026-10-25'), null);
});

test('putEntry puts an event after the visible items and a to-do under the To do heading', () => {
	const target = '# 업무\n- 회의\n## To do\n- [ ] 메일\n### Later\n- [ ] 여권\n';
	const event = { lines: ['- [ ] 출장'], kind: '업무', onCalendar: true };
	const todo = { lines: ['- [ ] 자소서', '  - 마감 금요일'], kind: '업무', onCalendar: false };
	assert.equal(putEntry(target, event, HIDDEN), '# 업무\n- 회의\n- [ ] 출장\n## To do\n- [ ] 메일\n### Later\n- [ ] 여권\n');
	assert.equal(
		putEntry(target, todo, HIDDEN),
		'# 업무\n- 회의\n## To do\n- [ ] 메일\n- [ ] 자소서\n  - 마감 금요일\n### Later\n- [ ] 여권\n',
	);
});

test('putEntry adds the To do heading or the kind section when the note lacks it', () => {
	const todo = { lines: ['- [ ] 자소서'], kind: '업무', onCalendar: false };
	assert.equal(putEntry('# 업무\n- 회의\n\n# 개인\n', todo, HIDDEN), '# 업무\n- 회의\n## To do\n- [ ] 자소서\n\n# 개인\n');
	assert.equal(putEntry('# 개인\n- 산책\n', todo, HIDDEN), '# 개인\n- 산책\n\n# 업무\n## To do\n- [ ] 자소서\n');
});

test('a moved entry parses back on its new day with the same length and place', () => {
	const from = '# 업무\n- [ ] 출장 ~10-22\n## To do\n- [ ] 자소서\n';
	const event = takeEntry(from, DAY, RULES, 1, '2026-11-02');
	const todo = takeEntry(from, DAY, RULES, 3, '2026-11-02');
	assert.ok(event && todo);
	const to = putEntry(putEntry('# 업무\n', event.block, HIDDEN), todo.block, HIDDEN);
	assert.deepEqual(parse(to, '2026-11-02').map((e) => [e.title, e.end, e.onCalendar]), [
		['출장', '2026-11-04', true],
		['자소서', '2026-11-02', false],
	]);
});
