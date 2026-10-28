import { App, moment, normalizePath, TFile, TFolder } from 'obsidian';
import { DayKey, parseDayKey } from '../date/dayKey';
import { dailyNoteName, dailyNotePath, fillDailyTemplate } from './dailyNotePath';
import { appendScheduleLine, NewEntry } from './parseSchedule';

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

/** Finds, opens and creates daily notes using the core Daily notes plugin's folder, format and template. */
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

	/** Opens the daily note for `day`, creating it from the template first if needed. */
	async open(day: DayKey, newLeaf: boolean): Promise<void> {
		const options = this.options();
		if (!options) return;
		const file = this.find(day) ?? (await this.create(day, options));
		await this.app.workspace.getLeaf(newLeaf).openFile(file);
	}

	/** Adds `entry` to the `heading` section of its start day's note, creating the note if needed. */
	async addEntry(entry: NewEntry, heading: string): Promise<void> {
		const options = this.options();
		if (!options) return;
		const file = this.find(entry.start) ?? (await this.create(entry.start, options));
		await this.app.vault.process(file, (text) => appendScheduleLine(text, heading, entry));
	}

	private async create(day: DayKey, options: DailyNoteOptions): Promise<TFile> {
		const path = this.pathFor(day, options);
		const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
		if (folder && !(this.app.vault.getAbstractFileByPath(folder) instanceof TFolder)) {
			await this.app.vault.createFolder(folder);
		}

		const date = moment(day, 'YYYY-MM-DD');
		const title = date.format(options.format);
		const template = await this.readTemplate(options.template);
		const content = fillDailyTemplate(
			template,
			title,
			(format) => date.format(format ?? options.format),
			(format) => moment().format(format ?? 'HH:mm'),
		);
		return this.app.vault.create(path, content);
	}

	private async readTemplate(templatePath: string): Promise<string> {
		const trimmed = templatePath.trim();
		if (!trimmed) return '';
		const path = normalizePath(trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`);
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile ? this.app.vault.cachedRead(file) : '';
	}
}
