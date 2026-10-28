import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { App } from 'obsidian';
import type { DailyNotes } from '../src/data/DailyNotes';
import { EventStore } from '../src/data/EventStore';

const KINDS = ['업무'];

/** A vault of daily notes named `<day>.md`, some open in an editor, with reads that wait for `release`. */
function fakeVault(saved: Record<string, string>) {
	const editors: Record<string, string> = {};
	let release = () => {};
	const gate = new Promise<void>((resolve) => (release = resolve));
	const files = Object.keys(saved).map((path) => ({ path }));
	const app = {
		vault: {
			getMarkdownFiles: () => files,
			cachedRead: async (file: { path: string }) => {
				await gate;
				return saved[file.path];
			},
		},
		metadataCache: {
			getFileCache: (file: { path: string }) => ({
				headings: [...(saved[file.path] ?? '').matchAll(/^# (.+)$/gm)].map((m) => ({ level: 1, heading: m[1] ?? '' })),
			}),
		},
		workspace: {
			getLeavesOfType: () => Object.entries(editors).map(([path, text]) => ({
				view: { file: { path }, editor: { getValue: () => text } },
			})),
		},
	} as unknown as App;
	const dailyNotes = { dayOf: (file: { path: string }) => file.path.slice(0, 10) } as unknown as DailyNotes;
	return { store: new EventStore(app, dailyNotes, () => KINDS), editors, release };
}

const titles = (store: EventStore) => store.getEvents().map((e) => `${e.title}:${e.task}`);

test('updateNote replaces only that note, keeping the list sorted by start', async () => {
	const { store, release } = fakeVault({
		'2026-10-20.md': '# 업무\n- [ ] Report\n',
		'2026-10-22.md': '# 업무\n- Lunch\n',
	});
	release();
	await store.reload();

	assert.equal(store.updateNote('2026-10-20.md', '2026-10-20', '# 업무\n- [x] Report\n- [ ] Budget\n'), true);
	assert.deepEqual(titles(store), ['Budget:open', 'Report:done', 'Lunch:null']);
	assert.equal(store.getEvents()[0]?.id, '2026-10-20.md:2');
});

test('updateNote reports no change when the entries are the same', async () => {
	const { store, release } = fakeVault({ '2026-10-20.md': '# 업무\n- [ ] Report\n' });
	release();
	await store.reload();

	assert.equal(store.updateNote('2026-10-20.md', '2026-10-20', '# 업무\n- [ ] Report\n\nsome prose\n'), false);
	assert.equal(store.updateNote('2026-10-20.md', '2026-10-20', '# 개인\n- [ ] Report\n'), true);
	assert.deepEqual(titles(store), []);
});

test('updateNote adds a daily note the store had no entries for', () => {
	const { store } = fakeVault({});
	store.updateNote('2026-10-21.md', '2026-10-21', '# 업무\n- [ ] New item\n');
	assert.deepEqual(titles(store), ['New item:open']);
});

test('reload reads an open editor instead of the older saved file', async () => {
	const { store, editors, release } = fakeVault({ '2026-10-20.md': '# 업무\n- [ ] Report\n' });
	editors['2026-10-20.md'] = '# 업무\n- [x] Report\n';
	release();
	await store.reload();
	assert.deepEqual(titles(store), ['Report:done']);
});

test('a reload that started before an edit does not undo it', async () => {
	const { store, editors, release } = fakeVault({ '2026-10-20.md': '# 업무\n- [ ] Report\n' });
	editors['2026-10-20.md'] = '# 업무\n- [ ] Report\n';
	const reloading = store.reload();

	editors['2026-10-20.md'] = '# 업무\n- [x] Report\n';
	store.updateNote('2026-10-20.md', '2026-10-20', editors['2026-10-20.md']);
	release();
	await reloading;
	assert.deepEqual(titles(store), ['Report:done']);
});
