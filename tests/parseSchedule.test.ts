import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendScheduleLine, ParsedEntry, parseSchedule, templateH1s } from '../src/data/parseSchedule';

const DAY = '2026-10-20';
const KINDS = ['업무', '개인'];

function parse(text: string, day = DAY, kinds: readonly string[] = KINDS) {
	return parseSchedule(text, day, kinds);
}

function one(item: string, day = DAY): ParsedEntry {
	const entries = parse(`# 업무\n${item}\n`, day);
	const [entry] = entries;
	assert.ok(entry && entries.length === 1, `expected one entry from ${item}`);
	return entry;
}

test('plain item is a one-day entry of its H1 kind on the note date', () => {
	assert.deepEqual(one('- 14:00 치과'), { line: 1, title: '14:00 치과', end: DAY, kind: '업무', done: false });
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

test('an H1 may have closing #s', () => {
	assert.deepEqual(parse('# 업무 ##\n- a').map((e) => e.title), ['a']);
});

test('task box sets done', () => {
	assert.equal(one('- [ ] 보고서').done, false);
	assert.equal(one('- [ ] 보고서').title, '보고서');
	assert.equal(one('- [x] 보고서').done, true);
	assert.equal(one('- [/] 보고서').done, true);
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
	assert.deepEqual(one('- 회의 ~02-30'), { line: 1, title: '회의', end: DAY, kind: '업무', done: false });
	assert.equal(one('- 회의 ~2026-10-19').end, DAY);
	assert.equal(one('- 회의 ~2026-13-01').end, DAY);
	assert.equal(one('- 회의 ~2026-10-19').title, '회의');
});

test('parentheses are title text, and a range just before trailing parentheses still counts', () => {
	assert.equal(one('- 점심 (김밥천국)').title, '점심 (김밥천국)');
	assert.deepEqual(one('- [x] 부산 출장 (업무) ~10-23'), { line: 1, title: '부산 출장 (업무)', end: '2026-10-23', kind: '업무', done: true });
	assert.deepEqual(one('- 부산 출장 ~10-23 (회의)'), { line: 1, title: '부산 출장 (회의)', end: '2026-10-23', kind: '업무', done: false });
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
	assert.equal(appendScheduleLine(text, '업무', entry('보고서')), '# 업무\n- 치과\n  - 예약됨\n- [ ] 보고서\n\n# 개인\n텍스트\n');
});

test('append into a section with free text goes below the text', () => {
	assert.equal(
		appendScheduleLine('# 업무\n오늘 할 일:\n\n# 개인\n', '업무', entry('a')),
		'# 업무\n오늘 할 일:\n- [ ] a\n\n# 개인\n',
	);
	assert.equal(appendScheduleLine('# 업무\n\n# 개인\n', '업무', entry('a')), '# 업무\n- [ ] a\n\n# 개인\n');
});

test('append goes to the chosen H1, even past deeper headings, and not to a later section', () => {
	const text = '# 업무\n- a\n# 개인\n- b\n## 저녁\n- c\n\n# Journaling\n일기\n';
	assert.equal(
		appendScheduleLine(text, '개인', entry('d')),
		'# 업무\n- a\n# 개인\n- b\n## 저녁\n- c\n- [ ] d\n\n# Journaling\n일기\n',
	);
});

test('append writes the range', () => {
	assert.equal(appendScheduleLine('# 업무\n', '업무', entry('제주 여행', '2026-10-23')), '# 업무\n- [ ] 제주 여행 ~10-23\n');
	assert.equal(
		appendScheduleLine('# 업무\n', '업무', { title: '연말', start: '2026-12-30', end: '2027-01-02' }),
		'# 업무\n- [ ] 연말 ~2027-01-02\n',
	);
});

test('append adds the H1 at the end when the note lacks it', () => {
	assert.equal(appendScheduleLine('메모\n', '업무', entry('a')), '메모\n\n# 업무\n- [ ] a\n');
	assert.equal(appendScheduleLine('메모', '업무', entry('a')), '메모\n\n# 업무\n- [ ] a\n');
	assert.equal(appendScheduleLine('', '업무', entry('a')), '# 업무\n- [ ] a\n');
	assert.equal(appendScheduleLine('## 업무\n- x\n', '업무', entry('a')), '## 업무\n- x\n\n# 업무\n- [ ] a\n');
	assert.equal(appendScheduleLine('메모\r\n', '업무', entry('a')), '메모\r\n\r\n# 업무\r\n- [ ] a\r\n');
});

test('append keeps CRLF inside an existing section', () => {
	assert.equal(appendScheduleLine('# 업무\r\n- x\r\n', '업무', entry('a')), '# 업무\r\n- x\r\n- [ ] a\r\n');
});

test('appended entries parse back as open tasks of the chosen kind', () => {
	const entries = [
		{ kind: '업무', title: '부산 출장', start: DAY, end: '2026-10-23' },
		{ kind: '개인', title: '점심 (김밥천국)', start: DAY, end: DAY },
		{ kind: '업무', title: '연말', start: DAY, end: '2027-01-02' },
	];
	for (const base of ['', '# 제목\n', '# 업무\n- [x] 기존\n  - 메모\n\n# 개인\n\n# Journaling\n일기\n']) {
		let text = base;
		for (const { kind, ...e } of entries) text = appendScheduleLine(text, kind, e);
		const parsed = parse(text);
		for (const { kind, title, end } of entries) {
			assert.ok(
				parsed.some((p) => p.title === title && p.end === end && p.kind === kind && !p.done),
				`${title} round-trips from base ${JSON.stringify(base)}:\n${text}`,
			);
		}
	}
});
