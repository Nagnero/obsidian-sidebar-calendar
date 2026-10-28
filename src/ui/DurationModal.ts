import { App, Modal } from 'obsidian';
import { addDays, DayKey, diffDays } from '../date/dayKey';
import type { CalendarEvent } from '../types';
import { formatRange } from './renderMonth';

/** What the duration dialog needs to know about an entry. */
export type EntryRange = Pick<CalendarEvent, 'title' | 'start' | 'end'>;

/**
 * Asks how many days an entry lasts, previewing the resulting range. Enter applies a whole number
 * of 1 or more; Escape cancels.
 */
export class DurationModal extends Modal {
	constructor(
		app: App,
		private entry: EntryRange,
		private locale: string,
		private onSubmit: (end: DayKey) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { start } = this.entry;
		this.setTitle(this.entry.title);
		const label = this.contentEl.createEl('label', { cls: 'sidebar-calendar__duration', text: 'Days' });
		const input = label.createEl('input', {
			type: 'number',
			cls: 'sidebar-calendar__duration-input',
			attr: { min: 1, step: 1 },
		});
		input.value = String(diffDays(start, this.entry.end) + 1);
		const preview = this.contentEl.createDiv({ cls: 'sidebar-calendar__duration-preview' });

		const endOf = (): DayKey | null => {
			const days = Number(input.value);
			return input.value !== '' && Number.isInteger(days) && days >= 1 ? addDays(start, days - 1) : null;
		};
		const showPreview = () => {
			const end = endOf();
			preview.setText(end ? formatRange(start, end, this.locale) : 'Enter a whole number of days, 1 or more.');
		};
		input.addEventListener('input', showPreview);
		showPreview();

		input.addEventListener('keydown', (evt) => {
			// Enter also confirms a Korean or Japanese IME composition; only a plain Enter applies.
			if (evt.key !== 'Enter' || evt.isComposing) return;
			evt.preventDefault();
			const end = endOf();
			if (end === null) return;
			this.close();
			if (end !== this.entry.end) this.onSubmit(end);
		});
		input.focus();
		input.select();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
