/**
 * A stand-in for the `obsidian` module, aliased in by scripts/preview/run.mjs. It implements
 * only what src/ imports, so the real plugin code can render in a plain browser page.
 */

interface DomElementInfo {
	cls?: string | string[];
	text?: string | DocumentFragment;
	attr?: Record<string, string | number | boolean | null>;
	title?: string;
	parent?: Node;
	prepend?: boolean;
}

function createEl(this: Node, tag: string, info?: string | DomElementInfo, callback?: (el: HTMLElement) => void) {
	const o: DomElementInfo = typeof info === 'string' ? { cls: info } : (info ?? {});
	const el = document.createElement(tag);
	if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(' ') : o.cls;
	if (o.text !== undefined) el.append(o.text);
	if (o.title !== undefined) el.title = o.title;
	for (const [key, value] of Object.entries(o.attr ?? {})) {
		if (value === null) el.removeAttribute(key);
		else el.setAttribute(key, String(value));
	}
	const parent = o.parent ?? this;
	parent.insertBefore(el, o.prepend ? parent.firstChild : null);
	callback?.(el);
	return el;
}

const domHelpers = {
	createEl,
	createDiv(this: Node, info?: string | DomElementInfo, callback?: (el: HTMLElement) => void) {
		return createEl.call(this, 'div', info, callback);
	},
	createSpan(this: Node, info?: string | DomElementInfo, callback?: (el: HTMLElement) => void) {
		return createEl.call(this, 'span', info, callback);
	},
	empty(this: Node) {
		while (this.firstChild) this.removeChild(this.firstChild);
	},
	setText(this: Node, value: string | DocumentFragment) {
		this.textContent = typeof value === 'string' ? value : null;
		if (typeof value !== 'string') this.appendChild(value);
	},
	addClass(this: Element, ...classes: string[]) {
		this.classList.add(...classes);
	},
	removeClass(this: Element, ...classes: string[]) {
		this.classList.remove(...classes);
	},
	toggleClass(this: Element, classes: string | string[], value: boolean) {
		for (const name of Array.isArray(classes) ? classes : [classes]) this.classList.toggle(name, value);
	},
};

/** Adds Obsidian's global DOM helpers. Safe to call more than once. */
export function installDomHelpers(): void {
	for (const [name, fn] of Object.entries(domHelpers)) {
		Object.defineProperty(Node.prototype, name, { value: fn, configurable: true, writable: true });
	}
}

export class TAbstractFile {
	name: string;
	constructor(public path: string) {
		this.name = path.slice(path.lastIndexOf('/') + 1);
	}
}

export class TFile extends TAbstractFile {
	extension: string;
	basename: string;
	constructor(path: string) {
		super(path);
		const dot = this.name.lastIndexOf('.');
		this.extension = dot < 0 ? '' : this.name.slice(dot + 1);
		this.basename = dot < 0 ? this.name : this.name.slice(0, dot);
	}
}

export class TFolder extends TAbstractFile {}

export type App = unknown;

export class Notice {
	constructor(message: string) {
		console.info(`[Notice] ${message}`);
	}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}
}

export class PluginSettingTab {
	containerEl = document.createElement('div');
	constructor(public app: App, public plugin: unknown) {}
}

export const Keymap = {
	isModEvent(evt: MouseEvent): boolean {
		return evt.ctrlKey || evt.metaKey;
	},
};

let locale = 'en';

/** Only the slice of moment that DailyNotes and CalendarView use: locale, parse by format, format. */
export function moment(input?: string, _parseFormat?: string) {
	const date = input === undefined ? new Date() : new Date(`${input}T00:00:00Z`);
	const utc = input !== undefined;
	const part = (local: number, fromUtc: number) => (utc ? fromUtc : local);
	return {
		format(pattern: string): string {
			const year = part(date.getFullYear(), date.getUTCFullYear());
			const tokens: Record<string, string> = {
				YYYY: String(year),
				MM: String(part(date.getMonth(), date.getUTCMonth()) + 1).padStart(2, '0'),
				DD: String(part(date.getDate(), date.getUTCDate())).padStart(2, '0'),
				HH: String(date.getHours()).padStart(2, '0'),
				mm: String(date.getMinutes()).padStart(2, '0'),
			};
			return pattern.replace(/YYYY|MM|DD|HH|mm/g, (token) => tokens[token] ?? token);
		},
	};
}
moment.locale = (next?: string): string => {
	if (next) locale = next;
	return locale;
};

export function normalizePath(path: string): string {
	return path.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '') || '/';
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 0, resetTimer = false) {
	let timer: number | undefined;
	return (...args: A) => {
		if (timer !== undefined && !resetTimer) return;
		window.clearTimeout(timer);
		timer = window.setTimeout(() => {
			timer = undefined;
			fn(...args);
		}, wait);
	};
}

const ICON_PATHS: Record<string, string[]> = {
	'chevron-left': ['m15 18-6-6 6-6'],
	'chevron-right': ['m9 18 6-6-6-6'],
	'file-text': [
		'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
		'M14 2v4a2 2 0 0 0 2 2h4',
		'M10 9H8',
		'M16 13H8',
		'M16 17H8',
	],
	'file-plus': [
		'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
		'M14 2v4a2 2 0 0 0 2 2h4',
		'M9 15h6',
		'M12 18v-6',
	],
};

export function setIcon(parent: HTMLElement, iconId: string): void {
	parent.empty();
	const paths = ICON_PATHS[iconId];
	if (!paths) {
		parent.setText(iconId);
		return;
	}
	const ns = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(ns, 'svg');
	svg.setAttribute('class', 'svg-icon');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	for (const d of paths) {
		const path = document.createElementNS(ns, 'path');
		path.setAttribute('d', d);
		svg.appendChild(path);
	}
	parent.appendChild(svg);
}

export function setTooltip(el: HTMLElement, tooltip: string, _options?: { placement?: string }): void {
	el.setAttribute('aria-label', tooltip);
	el.title = tooltip;
}

type ViewCreator = (leaf: WorkspaceLeaf) => ItemView;

/** Obsidian keeps view factories in the app's view registry; the fake app owns one of these. */
export class ViewRegistry {
	creators = new Map<string, ViewCreator>();
	registerView(type: string, creator: ViewCreator): void {
		this.creators.set(type, creator);
	}
}

interface PreviewApp {
	viewRegistry: ViewRegistry;
}

export class WorkspaceLeaf {
	view: ItemView | null = null;
	/** Resolves when the view has opened, so the runner can wait for the first render. */
	opened: Promise<void> = Promise.resolve();

	constructor(public app: PreviewApp, private parentEl: HTMLElement) {}

	setViewState(state: { type: string }): Promise<void> {
		const creator = this.app.viewRegistry.creators.get(state.type);
		if (!creator) throw new Error(`No view registered for "${state.type}"`);
		const view = creator(this);
		this.view = view;
		this.parentEl.appendChild(view.containerEl);
		this.opened = view.onOpen();
		return this.opened;
	}
}

export abstract class ItemView {
	app: PreviewApp;
	containerEl: HTMLElement;
	contentEl: HTMLElement;

	constructor(public leaf: WorkspaceLeaf) {
		this.app = leaf.app;
		this.containerEl = document.createElement('div');
		this.containerEl.className = 'workspace-leaf-content';
		this.containerEl.createDiv({ cls: 'view-header' });
		this.contentEl = this.containerEl.createDiv({ cls: 'view-content' });
	}

	abstract getViewType(): string;
	abstract getDisplayText(): string;

	onOpen(): Promise<void> {
		return Promise.resolve();
	}

	onClose(): Promise<void> {
		return Promise.resolve();
	}
}

export class Plugin {
	constructor(public app: PreviewApp, public manifest: unknown) {}

	registerView(type: string, creator: ViewCreator): void {
		this.app.viewRegistry.registerView(type, creator);
	}
	addRibbonIcon(_icon: string, _title: string, _callback: () => void): void {}
	addCommand(_command: unknown): void {}
	addSettingTab(_tab: unknown): void {}
	registerEvent(_ref: unknown): void {}
	registerInterval(id: number): number {
		return id;
	}
	loadData(): Promise<unknown> {
		return Promise.resolve(null);
	}
	saveData(_data: unknown): Promise<void> {
		return Promise.resolve();
	}
}
