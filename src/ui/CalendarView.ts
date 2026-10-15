import { ItemView, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR_CALENDAR } from '../constants';

export class CalendarView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_SIDEBAR_CALENDAR;
	}

	getDisplayText(): string {
		return 'Sidebar calendar';
	}

	getIcon(): string {
		return 'calendar-range';
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass('sidebar-calendar');
		root.createDiv({ cls: 'sidebar-calendar__placeholder', text: 'Sidebar calendar' });
	}
}
