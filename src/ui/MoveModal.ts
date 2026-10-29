import { App, Modal } from 'obsidian';
import { addDays, DayKey, diffDays, parseDayKey } from '../date/dayKey';
import type { EntryRange } from './DurationModal';
import { formatRange } from './renderMonth';

/**
 * Asks which day an entry should start on, previewing its new range at the same length. Move or
 * Enter moves it; Cancel or Escape closes. The same start moves nothing.
 */
export class MoveModal extends Modal {
	constructor(
		app: App,
		private entry: EntryRange,
		private locale: string,
		private onSubmit: (start: DayKey) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, entry } = this;
		this.setTitle(entry.title);
		const length = diffDays(entry.start, entry.end);
		let start: DayKey | null = entry.start;

		const row = contentEl.createEl('label', { cls: 'sidebar-calendar__duration' });
		row.createSpan({ cls: 'sidebar-calendar__duration-label', text: 'Starts' });
		const date = row.createEl('input', { type: 'date', cls: 'sidebar-calendar__duration-date' });
		date.value = entry.start;
		const preview = contentEl.createDiv({ cls: 'sidebar-calendar__duration-preview' });
		const buttons = contentEl.createDiv({ cls: 'modal-button-container' });
		buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
		const move = buttons.createEl('button', { cls: 'mod-cta', text: 'Move' });

		const update = () => {
			start = parseDayKey(date.value);
			move.disabled = start === null;
			preview.setText(start === null ? 'Choose a date.' : formatRange(start, addDays(start, length), this.locale));
		};
		const submit = () => {
			if (start === null) return;
			this.close();
			if (start !== entry.start) this.onSubmit(start);
		};
		date.addEventListener('input', update);
		date.addEventListener('keydown', (evt) => {
			if (evt.key !== 'Enter' || evt.isComposing) return;
			evt.preventDefault();
			submit();
		});
		move.addEventListener('click', submit);
		update();
		date.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
