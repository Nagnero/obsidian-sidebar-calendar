import { App, Modal } from 'obsidian';
import { kindColorCss } from '../kindColor';
import type { Kind } from '../settingsData';

/**
 * Asks for one schedule entry's title, kind, and whether it is an event or a to-do. Enter submits;
 * Escape or an empty title adds nothing. Clicking a button or moving with the arrow keys on a row
 * of buttons selects it. A to-do is meant for one day, so a range of days can only be an event.
 */
export class AddEntryModal extends Modal {
	constructor(
		app: App,
		private range: string,
		private kinds: readonly Kind[],
		private kind: string,
		private multiDay: boolean,
		private onSubmit: (title: string, kind: string, onCalendar: boolean) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.range);
		const input = this.contentEl.createEl('input', {
			type: 'text',
			cls: 'sidebar-calendar__entry-input',
			attr: { placeholder: 'Title' },
		});
		const kindIndex = Math.max(0, this.kinds.findIndex((k) => k.name === this.kind));
		buttonRow(this.contentEl, 'Kind', this.kinds.map((kind) => ({
			label: kind.name,
			attr: { 'data-kind': kind.name },
			color: kindColorCss(kind.color),
		})), kindIndex, (i) => {
			this.kind = this.kinds[i]?.name ?? this.kind;
			input.focus();
		});

		let onCalendar = true;
		buttonRow(this.contentEl, 'Type', [
			{ label: 'Event', attr: { 'data-type': 'event' } },
			{ label: 'To do', attr: { 'data-type': 'todo' }, disabled: this.multiDay },
		], 0, (i) => {
			onCalendar = i === 0;
			input.focus();
		});

		input.addEventListener('keydown', (evt) => {
			// Enter also confirms a Korean or Japanese IME composition; only a plain Enter submits.
			if (evt.key !== 'Enter' || evt.isComposing) return;
			evt.preventDefault();
			const title = input.value.trim();
			this.close();
			if (title) this.onSubmit(title, this.kind, onCalendar);
		});
		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

interface ButtonSpec {
	label: string;
	attr: Record<string, string>;
	/** Swatch color; null is the theme accent, undefined draws no swatch. */
	color?: string | null;
	disabled?: boolean;
}

/** A row of buttons of which one is selected, by click or by the arrow keys on the row. */
function buttonRow(parent: HTMLElement, label: string, specs: ButtonSpec[], initial: number, onSelect: (index: number) => void): void {
	const group = parent.createDiv({ cls: 'sidebar-calendar__kind-buttons', attr: { role: 'group', 'aria-label': label } });
	const buttons = specs.map((spec) => {
		const button = group.createEl('button', { cls: 'sidebar-calendar__kind-btn', attr: spec.attr });
		if (spec.color !== undefined) {
			const swatch = button.createSpan({ cls: 'sidebar-calendar__kind-swatch' });
			if (spec.color) swatch.style.setProperty('--sidebar-calendar-bar-color', spec.color);
		}
		button.appendText(spec.label);
		button.disabled = spec.disabled ?? false;
		return button;
	});
	const enabled = buttons.map((_, i) => i).filter((i) => !specs[i]?.disabled);
	const select = (index: number) => {
		buttons.forEach((button, i) => {
			button.setAttr('aria-pressed', String(i === index));
			button.toggleClass('mod-cta', i === index);
		});
	};
	select(initial);
	buttons.forEach((button, i) => {
		button.addEventListener('click', () => {
			select(i);
			onSelect(i);
		});
		button.addEventListener('keydown', (evt) => {
			const step = evt.key === 'ArrowRight' || evt.key === 'ArrowDown' ? 1 : evt.key === 'ArrowLeft' || evt.key === 'ArrowUp' ? -1 : 0;
			if (step === 0) return;
			evt.preventDefault();
			const at = enabled.indexOf(i);
			const next = enabled[(at + step + enabled.length) % enabled.length] ?? i;
			select(next);
			onSelect(next);
			buttons[next]?.focus();
		});
	});
}
