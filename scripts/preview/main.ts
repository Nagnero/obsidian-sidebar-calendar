import type { App } from 'obsidian';
import SidebarCalendarPlugin from '../../src/main';
import type { Action, PreviewScenario } from './scenarios';
import { SCENARIOS } from './scenarios';
import { BASE_SETTINGS, EVENT_NOTES, EVENTS_FOLDER } from './fixtures';
import { installDomHelpers, TFile, ViewRegistry, WorkspaceLeaf } from './obsidian-stub';

declare global {
	interface Window {
		__previewReady?: boolean;
		__previewFailed?: string;
		/** Paths passed to openFile, for evidence of what a click would open. */
		__previewOpened?: string[];
	}
}

function buildApp(scenario: PreviewScenario, sidebarEl: HTMLElement, opened: string[]) {
	const files = new Map<string, TFile>();
	const frontmatter = new Map<TFile, Record<string, unknown>>();
	for (const [name, data] of Object.entries(EVENT_NOTES)) {
		const file = new TFile(`${EVENTS_FOLDER}/${name}.md`);
		files.set(file.path, file);
		frontmatter.set(file, data);
	}
	for (const day of scenario.dailyNotes ?? []) {
		const file = new TFile(`${day}.md`);
		files.set(file.path, file);
	}

	const viewRegistry = new ViewRegistry();
	const leaves: WorkspaceLeaf[] = [];
	const noEvents = { on: () => ({}) };
	const app = {
		viewRegistry,
		vault: {
			...noEvents,
			getMarkdownFiles: () => [...files.values()],
			getAbstractFileByPath: (path: string) => files.get(path) ?? null,
			cachedRead: async () => '',
			createFolder: async () => {},
			create: async (path: string) => {
				const file = new TFile(path);
				files.set(path, file);
				return file;
			},
		},
		metadataCache: {
			...noEvents,
			getFileCache: (file: TFile) => {
				const data = frontmatter.get(file);
				return data ? { frontmatter: data } : null;
			},
		},
		internalPlugins: {
			getPluginById: (id: string) =>
				id === 'daily-notes' ? { enabled: true, instance: { options: { folder: '', format: 'YYYY-MM-DD' } } } : null,
		},
		workspace: {
			onLayoutReady: (callback: () => void) => callback(),
			getRightLeaf: () => {
				const leaf = new WorkspaceLeaf(app, sidebarEl);
				leaves.push(leaf);
				return leaf;
			},
			getLeavesOfType: (type: string) => leaves.filter((leaf) => leaf.view?.getViewType() === type),
			revealLeaf: async () => {},
			getLeaf: () => ({ openFile: async (file: TFile) => void opened.push(file.path) }),
		},
	};
	return { app, leaves };
}

/** Drives the real buttons and day cells, like a user would. */
function applyAction(root: HTMLElement, action: Action): void {
	const selector = 'click' in action
		? `[aria-label="${{ next: 'Next month', prev: 'Previous month', today: 'Current month' }[action.click]}"]`
		: `[data-date="${action.selectDay}"]`;
	const target = root.querySelector<HTMLElement>(selector);
	if (!target) throw new Error(`Action target not found: ${selector}`);
	target.click();
}

async function run(): Promise<void> {
	const name = new URLSearchParams(location.search).get('scenario');
	const scenario = SCENARIOS.find((s) => s.name === name);
	if (!scenario) throw new Error(`Unknown scenario "${String(name)}"`);

	document.body.classList.add(`theme-${scenario.theme}`);
	installDomHelpers();
	const sidebarEl = document.getElementById('sidebar');
	if (!sidebarEl) throw new Error('#sidebar is missing from the page');

	const opened: string[] = [];
	window.__previewOpened = opened;
	const { app, leaves } = buildApp(scenario, sidebarEl, opened);

	const plugin = new SidebarCalendarPlugin(app as unknown as App, {} as never);
	plugin.loadData = () => Promise.resolve({ ...BASE_SETTINGS, ...scenario.settings });
	await plugin.onload();
	await Promise.all(leaves.map((leaf) => leaf.opened));

	for (const action of scenario.actions ?? []) {
		applyAction(sidebarEl, action);
		await Promise.resolve();
	}
}

run().then(
	() => {
		window.__previewReady = true;
	},
	(error: unknown) => {
		window.__previewFailed = String(error);
		console.error(error);
	},
);
