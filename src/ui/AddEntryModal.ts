import { App, Modal } from 'obsidian';

/** Asks for one schedule entry's text. Enter submits; Escape or an empty text adds nothing. */
export class AddEntryModal extends Modal {
	constructor(
		app: App,
		private heading: string,
		private onSubmit: (text: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.heading);
		const input = this.contentEl.createEl('input', {
			type: 'text',
			cls: 'sidebar-calendar__entry-input',
			attr: { placeholder: 'Title (category)' },
		});
		input.addEventListener('keydown', (evt) => {
			// Enter also confirms a Korean or Japanese IME composition; only a plain Enter submits.
			if (evt.key !== 'Enter' || evt.isComposing) return;
			evt.preventDefault();
			const text = input.value.trim();
			this.close();
			if (text) this.onSubmit(text);
		});
		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
