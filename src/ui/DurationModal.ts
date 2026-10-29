import { App, Modal } from 'obsidian';
import { addDays, DayKey, diffDays, parseDayKey } from '../date/dayKey';
import type { CalendarEvent } from '../types';
import { formatRange } from './renderMonth';

/** What the duration dialog needs to know about an entry. */
export type EntryRange = Pick<CalendarEvent, 'title' | 'start' | 'end'>;

const PRESETS = [
	{ days: 1, label: '1 day' },
	{ days: 2, label: '2 days' },
	{ days: 3, label: '3 days' },
	{ days: 7, label: '1 week' },
] as const;

/**
 * Asks how long an entry lasts: a number of days with − and + buttons, preset chips, or an end
 * date, kept in sync and previewed as a range. Apply or Enter in a field writes the new end;
 * Cancel or Escape closes. An unchanged end writes nothing.
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
		const { contentEl } = this;
		this.setTitle(this.entry.title);
		/** The chosen end; null while a field holds something that is not a valid end. */
		let end: DayKey | null = this.entry.end;

		const daysRow = contentEl.createDiv({ cls: 'sidebar-calendar__duration' });
		daysRow.createSpan({ cls: 'sidebar-calendar__duration-label', text: 'Days' });
		const minus = daysRow.createEl('button', { cls: 'sidebar-calendar__duration-step', text: '−', attr: { 'aria-label': 'One day shorter' } });
		const input = daysRow.createEl('input', {
			type: 'number',
			cls: 'sidebar-calendar__duration-input',
			attr: { min: 1, step: 1 },
		});
		const plus = daysRow.createEl('button', { cls: 'sidebar-calendar__duration-step', text: '+', attr: { 'aria-label': 'One day longer' } });

		const presetRow = contentEl.createDiv({ cls: 'sidebar-calendar__duration-presets' });
		const presets = PRESETS.map(({ days, label }) => {
			const chip = presetRow.createEl('button', { cls: 'sidebar-calendar__duration-preset', text: label });
			chip.addEventListener('click', () => set(addDays(start, days - 1)));
			return { days, chip };
		});

		const endRow = contentEl.createEl('label', { cls: 'sidebar-calendar__duration' });
		endRow.createSpan({ cls: 'sidebar-calendar__duration-label', text: 'Ends' });
		const date = endRow.createEl('input', { type: 'date', cls: 'sidebar-calendar__duration-date', attr: { min: start } });

		const preview = contentEl.createDiv({ cls: 'sidebar-calendar__duration-preview' });
		const buttons = contentEl.createDiv({ cls: 'modal-button-container' });
		buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
		const apply = buttons.createEl('button', { cls: 'mod-cta', text: 'Apply' });

		/** Shows `end` everywhere except in the field being typed in, which keeps the user's text. */
		const set = (next: DayKey | null, typedIn?: HTMLInputElement) => {
			end = next;
			const days = end === null ? null : diffDays(start, end) + 1;
			if (typedIn !== input) input.value = days === null ? '' : String(days);
			if (typedIn !== date) date.value = end ?? '';
			minus.disabled = days === null || days <= 1;
			plus.disabled = end === null;
			apply.disabled = end === null;
			for (const { days: preset, chip } of presets) chip.setAttr('aria-pressed', String(preset === days));
			preview.setText(end === null ? 'Enter a whole number of days, 1 or more, or an end date on or after the start.' : formatRange(start, end, this.locale));
		};

		input.addEventListener('input', () => {
			const days = Number(input.value);
			set(input.value !== '' && Number.isInteger(days) && days >= 1 ? addDays(start, days - 1) : null, input);
		});
		date.addEventListener('input', () => {
			const day = parseDayKey(date.value);
			set(day !== null && day >= start ? day : null, date);
		});
		minus.addEventListener('click', () => {
			if (end !== null && end > start) set(addDays(end, -1));
		});
		plus.addEventListener('click', () => {
			if (end !== null) set(addDays(end, 1));
		});

		const submit = () => {
			if (end === null) return;
			this.close();
			if (end !== this.entry.end) this.onSubmit(end);
		};
		apply.addEventListener('click', submit);
		for (const field of [input, date]) {
			field.addEventListener('keydown', (evt) => {
				// Enter also confirms a Korean or Japanese IME composition; only a plain Enter applies.
				if (evt.key !== 'Enter' || evt.isComposing) return;
				evt.preventDefault();
				submit();
			});
		}

		set(end);
		input.focus();
		input.select();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
