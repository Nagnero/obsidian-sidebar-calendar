import { App, moment, normalizePath, TFile, TFolder } from 'obsidian';
import { DayKey, parseDayKey } from '../date/dayKey';
import { dailyNoteName, dailyNotePath, fillDailyTemplate } from './dailyNotePath';
import { appendScheduleLine, NewEntry, templateH1s } from './parseSchedule';

/** What the core Daily notes template offers as kinds. */
export type TemplateHeadings =
	| { status: 'off' | 'no-template'; h1s: readonly string[] }
	| { status: 'missing' | 'ok'; path: string; h1s: readonly string[] };

interface DailyNoteOptions {
	folder: string;
	format: string;
	template: string;
}

const DEFAULT_FORMAT = 'YYYY-MM-DD';

/** The internal shape of the core Daily notes plugin we read options from (not public API). */
interface InternalPlugins {
	getPluginById?(id: string): { enabled?: boolean; instance?: { options?: Partial<DailyNoteOptions> } } | null;
}

/** Finds and creates daily notes using the core Daily notes plugin's folder, format and template. */
export class DailyNotes {
	constructor(private app: App) {}

	/** Options of the core plugin, or null when it is turned off. */
	private options(): DailyNoteOptions | null {
		const internal = (this.app as unknown as { internalPlugins?: InternalPlugins }).internalPlugins;
		const plugin = internal?.getPluginById?.('daily-notes');
		if (!plugin?.enabled) return null;
		const options = plugin.instance?.options ?? {};
		return {
			folder: options.folder ?? '',
			format: options.format || DEFAULT_FORMAT,
			template: options.template ?? '',
		};
	}

	isAvailable(): boolean {
		return this.options() !== null;
	}

	/** The H1s of the daily note template, read from the file itself so edits count at once. */
	async templateHeadings(): Promise<TemplateHeadings> {
		const options = this.options();
		if (!options) return { status: 'off', h1s: [] };
		const template = options.template.trim();
		if (!template) return { status: 'no-template', h1s: [] };
		const file = this.templateFile(template);
		if (!file) return { status: 'missing', path: template, h1s: [] };
		return { status: 'ok', path: file.path, h1s: templateH1s(await this.app.vault.read(file)) };
	}

	/** The template file, found the way the core plugin finds it: a link path, `.md` optional. */
	private templateFile(template: string): TFile | null {
		const trimmed = template.trim();
		if (!trimmed) return null;
		const linked = this.app.metadataCache.getFirstLinkpathDest(trimmed, '');
		if (linked) return linked;
		const file = this.app.vault.getAbstractFileByPath(normalizePath(trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`));
		return file instanceof TFile ? file : null;
	}

	/** The configured template's path, or null when the core plugin is off or has none. */
	templatePath(): string | null {
		const options = this.options();
		return options ? (this.templateFile(options.template)?.path ?? null) : null;
	}

	private pathFor(day: DayKey, options: DailyNoteOptions): string {
		const fileName = moment(day, 'YYYY-MM-DD').format(options.format);
		return normalizePath(dailyNotePath(options.folder, fileName));
	}

	/** The date of a daily note, or null when `file` is not one (or the core plugin is off). */
	dayOf(file: TFile): DayKey | null {
		const options = this.options();
		if (!options) return null;
		const name = dailyNoteName(options.folder, file.path);
		if (name === null) return null;
		const date = moment(name, options.format, true);
		return date.isValid() ? parseDayKey(date.format('YYYY-MM-DD')) : null;
	}

	/** The existing daily note for `day`, if any. */
	find(day: DayKey): TFile | null {
		const options = this.options();
		if (!options) return null;
		const file = this.app.vault.getAbstractFileByPath(this.pathFor(day, options));
		return file instanceof TFile ? file : null;
	}

	/** Adds `entry` under the `# kind` section of its start day's note, creating the note if needed. */
	async addEntry(entry: NewEntry, kind: string): Promise<void> {
		const options = this.options();
		if (!options) return;
		const file = this.find(entry.start) ?? (await this.create(entry.start, options));
		await this.app.vault.process(file, (text) => appendScheduleLine(text, kind, entry));
	}

	private async create(day: DayKey, options: DailyNoteOptions): Promise<TFile> {
		const path = this.pathFor(day, options);
		const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
		if (folder && !(this.app.vault.getAbstractFileByPath(folder) instanceof TFolder)) {
			await this.app.vault.createFolder(folder);
		}

		const date = moment(day, 'YYYY-MM-DD');
		const title = date.format(options.format);
		const templateFile = this.templateFile(options.template);
		const template = templateFile ? await this.app.vault.read(templateFile) : '';
		const content = fillDailyTemplate(
			template,
			title,
			(format) => date.format(format ?? options.format),
			(format) => moment().format(format ?? 'HH:mm'),
		);
		return this.app.vault.create(path, content);
	}
}
