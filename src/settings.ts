import { App, normalizePath, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_SETTINGS, MAX_LANES, MIN_LANES } from './settingsData';
import type SidebarCalendarPlugin from './main';

export { DEFAULT_SETTINGS, sanitizeSettings } from './settingsData';
export type { SidebarCalendarSettings } from './settingsData';

/** Shown in color pickers when a color is unset; roughly Obsidian's default accent. */
const PICKER_FALLBACK = '#7f6df2';
const NEW_CATEGORY_COLORS = ['#e5484d', '#30a46c', '#0090ff', '#f76b15', '#8e4ec6', '#ffc53d', '#12a594'];

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
			.setDesc('Events that do not fit are counted in the number shown under their days.')
			.addSlider((slider) =>
				slider
					.setLimits(MIN_LANES, MAX_LANES, 1)
					.setValue(this.plugin.settings.maxLanes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxLanes = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Daily notes')
			.setDesc(
				'Mark days that have a daily note and show a button to open or create it. Uses the folder, format and template of the core daily notes plugin, which must be turned on.',
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.dailyNotes).onChange(async (value) => {
					this.plugin.settings.dailyNotes = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl).setName('Colors').setHeading();

		new Setting(containerEl)
			.setName('Default color')
			.setDesc('For events with no category, or a category not in the list below.')
			.addColorPicker((picker) =>
				picker.setValue(this.plugin.settings.defaultColor || PICKER_FALLBACK).onChange(async (value) => {
					this.plugin.settings.defaultColor = value;
					await this.plugin.saveSettings();
				}),
			)
			.addExtraButton((button) =>
				button
					.setIcon('rotate-ccw')
					.setTooltip('Use theme accent color')
					.onClick(async () => {
						this.plugin.settings.defaultColor = '';
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		this.plugin.settings.categories.forEach((category, index) => {
			new Setting(containerEl)
				.setClass('sidebar-calendar-category-setting')
				.addText((text) =>
					text
						.setPlaceholder('Category name')
						.setValue(category.name)
						.onChange(async (value) => {
							category.name = value;
							await this.plugin.saveSettings();
						}),
				)
				.addColorPicker((picker) =>
					picker.setValue(category.color || PICKER_FALLBACK).onChange(async (value) => {
						category.color = value;
						await this.plugin.saveSettings();
					}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('trash-2')
						.setTooltip('Delete category')
						.onClick(async () => {
							this.plugin.settings.categories.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						}),
				);
		});

		new Setting(containerEl)
			.setDesc('Events use the color of the category named in their "category" property.')
			.addButton((button) =>
				button.setButtonText('Add category').onClick(async () => {
					const { categories } = this.plugin.settings;
					const color = NEW_CATEGORY_COLORS[categories.length % NEW_CATEGORY_COLORS.length] ?? PICKER_FALLBACK;
					categories.push({ name: '', color });
					await this.plugin.saveSettings();
					this.display();
				}),
			);
	}
}
