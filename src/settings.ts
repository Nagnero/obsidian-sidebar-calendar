import { App, normalizePath, PluginSettingTab, Setting } from 'obsidian';
import type { Weekday } from './date/dayKey';
import type SidebarCalendarPlugin from './main';

export interface SidebarCalendarSettings {
	eventsFolder: string;
	weekStart: Weekday;
	maxLanes: number;
}

export const DEFAULT_SETTINGS: SidebarCalendarSettings = {
	eventsFolder: 'Events',
	weekStart: 0,
	maxLanes: 3,
};

export class SidebarCalendarSettingTab extends PluginSettingTab {
	plugin: SidebarCalendarPlugin;

	constructor(app: App, plugin: SidebarCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Events folder')
			.setDesc('Each note in this folder is one event.')
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.eventsFolder)
					.setValue(this.plugin.settings.eventsFolder)
					.onChange(async (value) => {
						this.plugin.settings.eventsFolder =
							normalizePath(value.trim() || DEFAULT_SETTINGS.eventsFolder);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Start week on')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('0', 'Sunday')
					.addOption('1', 'Monday')
					.setValue(String(this.plugin.settings.weekStart))
					.onChange(async (value) => {
						this.plugin.settings.weekStart = value === '1' ? 1 : 0;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Bar rows per week')
			.setDesc('Events that do not fit are shown as "+N" on their days.')
			.addSlider((slider) =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.maxLanes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxLanes = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
