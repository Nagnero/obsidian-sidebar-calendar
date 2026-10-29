import { App, PluginSettingTab, Setting } from 'obsidian';
import type { TemplateHeadings } from './data/DailyNotes';
import { Around, isSettingsLanguage, LANGUAGE_NAMES, SETTINGS_LANGUAGES, SETTINGS_STRINGS, SettingsStrings } from './i18n';
import { DEFAULT_SETTINGS, Kind, MAX_LANES, MIN_LANES, sanitizeSubheading } from './settingsData';
import type SidebarCalendarPlugin from './main';
import { renderKindColorControl } from './ui/kindColorControl';

export { DEFAULT_SETTINGS, sanitizeSettings } from './settingsData';
export type { SidebarCalendarSettings } from './settingsData';

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
		const t = SETTINGS_STRINGS[settings.settingsLanguage];
		containerEl.empty();

		new Setting(containerEl)
			.setName(t.language)
			.setDesc(t.languageDesc)
			.addDropdown((dropdown) => {
				for (const language of SETTINGS_LANGUAGES) dropdown.addOption(language, LANGUAGE_NAMES[language]);
				dropdown.setValue(settings.settingsLanguage).onChange(async (value) => {
					if (!isSettingsLanguage(value)) return;
					settings.settingsLanguage = value;
					await plugin.saveSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName(t.template)
			.setDesc(templateStatus(template, t))
			.setClass('sidebar-calendar-template-status');

		new Setting(containerEl)
			.setName(t.kinds)
			.setDesc(t.kindsDesc)
			.setHeading();

		const inTemplate = settings.kinds.filter((k) => template.h1s.includes(k.name));
		const stale = settings.kinds.filter((k) => !template.h1s.includes(k.name));
		for (const kind of inTemplate) this.kindRow(kind, t);
		if (inTemplate.length === 0) {
			containerEl.createDiv({ cls: 'setting-item-description', text: t.noKinds });
		}
		for (const kind of stale) {
			new Setting(containerEl)
				.setName(kind.name)
				.setDesc(t.staleKind)
				.setClass('sidebar-calendar-kind-setting')
				.then((setting) => setting.settingEl.setAttr('data-kind', kind.name))
				.addExtraButton((button) =>
					button
						.setIcon('trash-2')
						.setTooltip(t.deleteKind)
						.onClick(async () => {
							settings.kinds = settings.kinds.filter((k) => k !== kind);
							await plugin.saveSettings();
							this.render();
						}),
				);
		}

		new Setting(containerEl).setName(t.calendar).setHeading();

		new Setting(containerEl)
			.setName(t.weekStart)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('0', t.sunday)
					.addOption('1', t.monday)
					.setValue(String(settings.weekStart))
					.onChange(async (value) => {
						settings.weekStart = value === '1' ? 1 : 0;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t.maxLanes)
			.setDesc(t.maxLanesDesc)
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
			.setName(t.showOneDay)
			.setDesc(t.showOneDayDesc)
			.addToggle((toggle) =>
				toggle.setValue(settings.showOneDay).onChange(async (value) => {
					settings.showOneDay = value;
					await plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(t.hiddenSubheading)
			.setDesc(t.hiddenSubheadingDesc)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.hiddenSubheading)
					.setValue(settings.hiddenSubheading)
					.onChange(async (value) => {
						settings.hiddenSubheading = sanitizeSubheading(value);
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t.dailyNotes)
			.setDesc(t.dailyNotesDesc)
			.addToggle((toggle) =>
				toggle.setValue(settings.dailyNotes).onChange(async (value) => {
					settings.dailyNotes = value;
					await plugin.saveSettings();
				}),
			);
	}

	private kindRow(kind: Kind, t: SettingsStrings): void {
		const { plugin } = this;
		new Setting(this.containerEl)
			.setName(kind.name)
			.setClass('sidebar-calendar-kind-setting')
			.then((setting) => setting.settingEl.setAttr('data-kind', kind.name))
			.addToggle((toggle) =>
				toggle
					.setTooltip(t.useAsKind)
					.setValue(kind.enabled)
					.onChange(async (value) => {
						kind.enabled = value;
						await plugin.saveSettings();
					}),
			)
			.then((setting) =>
				renderKindColorControl(setting.controlEl, kind.color, t, async (color) => {
					kind.color = color;
					await plugin.saveSettings();
				}),
			);
	}
}

function templateStatus(template: TemplateHeadings, t: SettingsStrings): DocumentFragment {
	return createFragment((frag) => {
		const withPath = ({ before, after }: Around, path: string) => {
			frag.appendText(before);
			frag.createEl('code', { text: path });
			frag.appendText(after);
		};
		switch (template.status) {
			case 'off':
				frag.appendText(t.templateOff);
				break;
			case 'no-template':
				frag.appendText(t.templateNone);
				break;
			case 'missing':
				withPath(t.templateMissing, template.path);
				break;
			case 'ok':
				withPath(t.templateOk(template.h1s.length), template.path);
				break;
		}
	});
}
