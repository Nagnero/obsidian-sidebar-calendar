import { App, Modal } from 'obsidian';
import { kindColorCss } from '../kindColor';
import type { Kind } from '../settingsData';

/**
 * Asks for one schedule entry's title and kind. Enter submits; Escape or an empty title adds
 * nothing. Clicking a kind or moving with the arrow keys on the kind buttons selects it.
 */
export class AddEntryModal extends Modal {
	constructor(
		app: App,
		private range: string,
		private kinds: readonly Kind[],
		private kind: string,
		private onSubmit: (title: string, kind: string) => void,
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
		const group = this.contentEl.createDiv({
			cls: 'sidebar-calendar__kind-buttons',
			attr: { role: 'group', 'aria-label': 'Kind' },
		});
		const buttons = this.kinds.map((kind) => {
			const button = group.createEl('button', { cls: 'sidebar-calendar__kind-btn', attr: { 'data-kind': kind.name } });
			const swatch = button.createSpan({ cls: 'sidebar-calendar__kind-swatch' });
			const color = kindColorCss(kind.color);
			if (color) swatch.style.setProperty('--sidebar-calendar-bar-color', color);
			button.appendText(kind.name);
			return button;
		});
		const select = (index: number) => {
			this.kind = this.kinds[index]?.name ?? this.kind;
			buttons.forEach((button, i) => {
				button.setAttr('aria-pressed', String(i === index));
				button.toggleClass('mod-cta', i === index);
			});
		};
		select(Math.max(0, this.kinds.findIndex((k) => k.name === this.kind)));

		buttons.forEach((button, i) => {
			button.addEventListener('click', () => {
				select(i);
				input.focus();
			});
			button.addEventListener('keydown', (evt) => {
				const step = evt.key === 'ArrowRight' || evt.key === 'ArrowDown' ? 1 : evt.key === 'ArrowLeft' || evt.key === 'ArrowUp' ? -1 : 0;
				if (step === 0) return;
				evt.preventDefault();
				const next = (i + step + buttons.length) % buttons.length;
				select(next);
				buttons[next]?.focus();
			});
		});

		input.addEventListener('keydown', (evt) => {
			// Enter also confirms a Korean or Japanese IME composition; only a plain Enter submits.
			if (evt.key !== 'Enter' || evt.isComposing) return;
			evt.preventDefault();
			const title = input.value.trim();
			this.close();
			if (title) this.onSubmit(title, this.kind);
		});
		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
