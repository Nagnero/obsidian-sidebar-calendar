import { App, normalizePath, PluginSettingTab, Setting } from 'obsidian';
import type SidebarCalendarPlugin from './main';

export interface SidebarCalendarSettings {
	eventsFolder: string;
}

export const DEFAULT_SETTINGS: SidebarCalendarSettings = {
	eventsFolder: 'Events',
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
	}
}
