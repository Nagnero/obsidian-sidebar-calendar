import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendScheduleLine, parseEntryInput, ParsedEntry, parseSchedule } from '../src/data/parseSchedule';

const DAY = '2026-10-20';
const CATEGORIES = ['업무', 'Work Trip'];

function parse(text: string, day = DAY) {
	return parseSchedule(text, day, '일정', CATEGORIES);
}

function one(item: string, day = DAY): ParsedEntry {
	const entries = parse(`## 일정\n${item}\n`, day);
	const [entry] = entries;
	assert.ok(entry && entries.length === 1, `expected one entry from ${item}`);
	return entry;
}

test('plain item is a one-day entry on the note date', () => {
	assert.deepEqual(one('- 14:00 치과'), { line: 1, title: '14:00 치과', end: DAY, done: false });
});

test('every list marker works', () => {
	assert.deepEqual(parse('## 일정\n- a\n* b\n+ c\n').map((e) => e.title), ['a', 'b', 'c']);
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
	assert.deepEqual(one('- 회의 ~02-30'), { line: 1, title: '회의', end: DAY, done: false });
	assert.equal(one('- 회의 ~2026-10-19').end, DAY);
	assert.equal(one('- 회의 ~2026-13-01').end, DAY);
	assert.equal(one('- 회의 ~2026-10-19').title, '회의');
});

test('trailing (name) is a category only when it matches one, ignoring case and spaces', () => {
	assert.equal(one('- 보고서 (업무)').category, '업무');
	assert.equal(one('- 보고서 (업무)').title, '보고서');
	assert.equal(one('- 출장 ( work trip )').category, 'Work Trip');
	const plain = one('- 점심 (김밥천국)');
	assert.equal(plain.title, '점심 (김밥천국)');
	assert.equal(plain.category, undefined);
});

test('range and category in either order', () => {
	const a = one('- [x] 부산 출장 ~10-23 (업무)');
	const b = one('- [x] 부산 출장 (업무) ~10-23');
	for (const entry of [a, b]) {
		assert.deepEqual(entry, { line: 1, title: '부산 출장', end: '2026-10-23', category: '업무', done: true });
	}
});

test('range before non-category parentheses still counts, and the parentheses stay in the title', () => {
	assert.deepEqual(one('- 부산 출장 ~10-23 (회의)'), { line: 1, title: '부산 출장 (회의)', end: '2026-10-23', done: false });
	assert.deepEqual(one('- 부산 출장 (회의) ~10-23 (업무)'), {
		line: 1,
		title: '부산 출장 (회의)',
		end: '2026-10-23',
		category: '업무',
		done: false,
	});
});

test('nested items are ignored', () => {
	const entries = parse('## 일정\n- [x] 부산 출장 ~10-23 (업무)\n  - 숙소 예약 완료\n\t- 기차표\n- 치과\n');
	assert.deepEqual(entries.map((e) => [e.line, e.title]), [[1, '부산 출장'], [4, '치과']]);
});

test('section ends at a same or higher heading, not at a deeper one', () => {
	const text = [
		'# 2026-10-20',
		'- 머리말',
		'## 일정',
		'- 첫째',
		'### 오후',
		'- 둘째',
		'## 메모',
		'- 아님',
		'# 끝',
		'- 아님',
	].join('\n');
	assert.deepEqual(parse(text).map((e) => [e.line, e.title]), [[3, '첫째'], [5, '둘째']]);
	assert.deepEqual(parse('### 일정\n- a\n## 다음\n- b').map((e) => e.title), ['a']);
});

test('any heading level, trailing #s and case-insensitive heading text', () => {
	assert.deepEqual(parse('# 일정\n- a').map((e) => e.title), ['a']);
	assert.deepEqual(parse('###### 일정 ##\n- a').map((e) => e.title), ['a']);
	assert.deepEqual(parseSchedule('## Schedule\n- a', DAY, 'schedule', []).map((e) => e.title), ['a']);
	assert.deepEqual(parse('## 일정 계획\n- a'), []);
	assert.deepEqual(parse('- a\n- b'), []);
});

test('empty titles are skipped', () => {
	assert.deepEqual(parse('## 일정\n- \n- [ ]\n- ~10-23\n- (업무)\n- 진짜\n').map((e) => e.title), ['진짜']);
});

test('list items in code blocks and frontmatter are ignored', () => {
	const text = '---\ntags: x\n# 일정\n- fm\n---\n## 일정\n```\n- code\n```\n- real\n';
	assert.deepEqual(parse(text).map((e) => [e.line, e.title]), [[9, 'real']]);
});

test('CRLF line endings', () => {
	assert.deepEqual(parse('## 일정\r\n- a (업무)\r\n- b\r\n').map((e) => [e.title, e.category]), [
		['a', '업무'],
		['b', undefined],
	]);
});

test('append goes after the last top-level item and its nested items', () => {
	const text = '# 2026-10-20\n\n## 일정\n- 치과\n  - 예약됨\n\n## 메모\n텍스트\n';
	assert.equal(
		appendScheduleLine(text, '일정', { title: '보고서', start: DAY, end: DAY }),
		'# 2026-10-20\n\n## 일정\n- 치과\n  - 예약됨\n- 보고서\n\n## 메모\n텍스트\n',
	);
});

test('append into an empty section goes right under the heading', () => {
	assert.equal(
		appendScheduleLine('## 일정\n\n## 메모\n', '일정', { title: 'a', start: DAY, end: DAY }),
		'## 일정\n- a\n\n## 메모\n',
	);
});

test('append writes the range and category', () => {
	assert.equal(
		appendScheduleLine('## 일정\n', '일정', { title: '제주 여행', start: DAY, end: '2026-10-23', category: '취미' }),
		'## 일정\n- 제주 여행 ~10-23 (취미)\n',
	);
	assert.equal(
		appendScheduleLine('## 일정\n', '일정', { title: '연말', start: '2026-12-30', end: '2027-01-02' }),
		'## 일정\n- 연말 ~2027-01-02\n',
	);
});

test('append adds the section at the end when it is missing', () => {
	const entry = { title: 'a', start: DAY, end: DAY };
	assert.equal(appendScheduleLine('메모\n', '일정', entry), '메모\n\n## 일정\n- a\n');
	assert.equal(appendScheduleLine('메모', '일정', entry), '메모\n\n## 일정\n- a\n');
	assert.equal(appendScheduleLine('', '일정', entry), '## 일정\n- a\n');
	assert.equal(appendScheduleLine('메모\r\n', '일정', entry), '메모\r\n\r\n## 일정\r\n- a\r\n');
});

test('appended entries parse back', () => {
	const entries = [
		{ title: '부산 출장', start: DAY, end: '2026-10-23', category: '업무' },
		{ title: '점심 (김밥천국)', start: DAY, end: DAY },
		{ title: '연말', start: DAY, end: '2027-01-02' },
	];
	for (const base of ['', '# 제목\n', '## 일정\n- [x] 기존\n  - 메모\n\n## 메모\n']) {
		let text = base;
		for (const entry of entries) text = appendScheduleLine(text, '일정', entry);
		const parsed = parse(text).map(({ title, end, category }) => ({ title, end, category }));
		for (const { title, end, category } of entries) {
			assert.ok(
				parsed.some((p) => p.title === title && p.end === end && p.category === category),
				`${title} round-trips from base ${JSON.stringify(base)}:\n${text}`,
			);
		}
	}
});

test('typed input keeps non-category parentheses in the title', () => {
	assert.deepEqual(parseEntryInput('  제주 여행 (업무) ', CATEGORIES), { title: '제주 여행', category: '업무' });
	assert.deepEqual(parseEntryInput('제주 여행 (취미)', CATEGORIES), { title: '제주 여행 (취미)' });
});
