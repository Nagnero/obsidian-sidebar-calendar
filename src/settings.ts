import { App, PluginSettingTab, Setting } from 'obsidian';
import type { TemplateHeadings } from './data/DailyNotes';
import { Kind, MAX_LANES, MIN_LANES } from './settingsData';
import type SidebarCalendarPlugin from './main';

export { DEFAULT_SETTINGS, sanitizeSettings } from './settingsData';
export type { SidebarCalendarSettings } from './settingsData';

/** Shown in color pickers when a color is unset; roughly Obsidian's default accent. */
const PICKER_FALLBACK = '#7f6df2';

export class SidebarCalendarSettingTab extends PluginSettingTab {
	plugin: SidebarCalendarPlugin;

	constructor(app: App, plugin: SidebarCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Opening the tab re-reads the template first, so the kinds match what it has now. */
	display(): void {
		this.render();
		void this.plugin.syncKinds().then(async (changed) => {
			if (!changed) return;
			this.render();
			await this.plugin.reloadEvents();
		});
	}

	private render(): void {
		const { containerEl, plugin } = this;
		const { settings, template } = plugin;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Daily note template')
			.setDesc(templateStatus(template))
			.setClass('sidebar-calendar-template-status');

		new Setting(containerEl)
			.setName('Kinds')
			.setDesc('Each top-level heading (#) of the template is a kind. List items under it in daily notes are schedule entries.')
			.setHeading();

		const inTemplate = settings.kinds.filter((k) => template.h1s.includes(k.name));
		const stale = settings.kinds.filter((k) => !template.h1s.includes(k.name));
		for (const kind of inTemplate) this.kindRow(kind);
		if (inTemplate.length === 0) {
			containerEl.createDiv({ cls: 'setting-item-description', text: 'No top-level headings in the template yet.' });
		}
		for (const kind of stale) {
			new Setting(containerEl)
				.setName(kind.name)
				.setDesc('Not in the template. Not read or offered until the template has this heading again.')
				.setClass('sidebar-calendar-kind-setting')
				.then((setting) => setting.settingEl.setAttr('data-kind', kind.name))
				.addExtraButton((button) =>
					button
						.setIcon('trash-2')
						.setTooltip('Delete')
						.onClick(async () => {
							settings.kinds = settings.kinds.filter((k) => k !== kind);
							await plugin.saveSettings();
							this.render();
						}),
				);
		}

		new Setting(containerEl).setName('Calendar').setHeading();

		new Setting(containerEl)
			.setName('Start week on')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('0', 'Sunday')
					.addOption('1', 'Monday')
					.setValue(String(settings.weekStart))
					.onChange(async (value) => {
						settings.weekStart = value === '1' ? 1 : 0;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Bar rows per week')
			.setDesc('Events that do not fit are counted in the number shown under their days.')
			.addSlider((slider) =>
				slider
					.setLimits(MIN_LANES, MAX_LANES, 1)
					.setValue(settings.maxLanes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						settings.maxLanes = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show one-day entries')
			.setDesc('When off, the calendar shows only entries that span several days. The list under the calendar still shows every entry of the selected day.')
			.addToggle((toggle) =>
				toggle.setValue(settings.showOneDay).onChange(async (value) => {
					settings.showOneDay = value;
					await plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Daily notes')
			.setDesc(
				'Mark days that have a daily note and show a button to open or create it. Uses the folder, format and template of the core daily notes plugin, which must be turned on.',
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.dailyNotes).onChange(async (value) => {
					settings.dailyNotes = value;
					await plugin.saveSettings();
				}),
			);
	}

	private kindRow(kind: Kind): void {
		const { plugin } = this;
		new Setting(this.containerEl)
			.setName(kind.name)
			.setClass('sidebar-calendar-kind-setting')
			.then((setting) => setting.settingEl.setAttr('data-kind', kind.name))
			.addToggle((toggle) =>
				toggle
					.setTooltip('Use as kind')
					.setValue(kind.enabled)
					.onChange(async (value) => {
						kind.enabled = value;
						await plugin.saveSettings();
					}),
			)
			.addColorPicker((picker) =>
				picker.setValue(kind.color || PICKER_FALLBACK).onChange(async (value) => {
					kind.color = value;
					await plugin.saveSettings();
				}),
			)
			.addExtraButton((button) =>
				button
					.setIcon('rotate-ccw')
					.setTooltip('Use theme accent color')
					.onClick(async () => {
						kind.color = '';
						await plugin.saveSettings();
						this.render();
					}),
			);
	}
}

function templateStatus(template: TemplateHeadings): DocumentFragment {
	return createFragment((frag) => {
		switch (template.status) {
			case 'off':
				frag.appendText('Turn on the core daily notes plugin. Kinds come from the top-level headings of its template.');
				break;
			case 'no-template':
				frag.appendText('Linked to core daily notes, which has no template. Set one in its settings; its top-level headings become the kinds.');
				break;
			case 'missing':
				frag.appendText('Linked to core daily notes, but its template ');
				frag.createEl('code', { text: template.path });
				frag.appendText(' was not found.');
				break;
			case 'ok': {
				const n = template.h1s.length;
				frag.appendText('Linked to core daily notes. Template: ');
				frag.createEl('code', { text: template.path });
				frag.appendText(` (${n} ${n === 1 ? 'heading' : 'headings'}).`);
				break;
			}
		}
	});
}
