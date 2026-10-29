import { setTooltip } from 'obsidian';
import type { SettingsStrings } from '../i18n';
import { KindColor, kindColorCss, PALETTE, parseKindColor } from '../kindColor';

const COLOR_VAR = '--sidebar-calendar-bar-color';

/**
 * A kind's color in its settings row: a swatch that opens a popover of color dots (theme accent,
 * then the named colors), and a `+` button that opens the native color input for a custom color.
 * `onChange` gets each chosen color; the swatch already shows it.
 */
export function renderKindColorControl(
	parent: HTMLElement,
	initial: KindColor,
	t: SettingsStrings,
	onChange: (color: KindColor) => Promise<void>,
): void {
	let current = initial;
	const wrap = parent.createDiv({ cls: 'sidebar-calendar-color' });
	const swatch = wrap.createEl('button', {
		cls: 'sidebar-calendar-color__swatch',
		attr: { 'aria-haspopup': 'true', 'aria-expanded': 'false' },
	});
	setTooltip(swatch, t.color);
	paint(swatch, current);
	const custom = wrap.createEl('button', { cls: 'sidebar-calendar-color__custom' });
	setTooltip(custom, t.customColor);
	const input = wrap.createEl('input', {
		type: 'color',
		cls: 'sidebar-calendar-color__input',
		attr: { tabindex: '-1', 'aria-hidden': 'true' },
	});

	const choose = (color: KindColor) => {
		current = color;
		paint(swatch, color);
		void onChange(color);
	};

	let popover: HTMLElement | null = null;
	const doc = wrap.ownerDocument;
	const onOutside = (evt: PointerEvent) => {
		// The settings tab may have been re-rendered since, leaving this row detached.
		if (!wrap.isConnected || !evt.composedPath().includes(wrap)) close(false);
	};
	const close = (refocus: boolean) => {
		if (!popover) return;
		// Focus first: removing the focused dot would move focus out of the settings tab.
		if (refocus) swatch.focus();
		popover.remove();
		popover = null;
		swatch.setAttr('aria-expanded', 'false');
		doc.removeEventListener('pointerdown', onOutside, true);
	};
	const open = () => {
		popover = wrap.createDiv({ cls: 'sidebar-calendar-color__popover', attr: { role: 'group', 'aria-label': t.color } });
		for (const color of PALETTE) {
			const dot = popover.createEl('button', {
				cls: 'sidebar-calendar-color__dot',
				attr: { 'data-color': color, 'aria-pressed': String(color === current) },
			});
			setTooltip(dot, t.colorNames[color]);
			paint(dot, color);
			dot.addEventListener('click', () => {
				close(true);
				choose(color);
			});
		}
		swatch.setAttr('aria-expanded', 'true');
		doc.addEventListener('pointerdown', onOutside, true);
		popover.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
	};

	swatch.addEventListener('click', () => (popover ? close(true) : open()));
	wrap.addEventListener('keydown', (evt) => {
		if (evt.key !== 'Escape' || !popover) return;
		evt.preventDefault();
		evt.stopPropagation();
		close(true);
	});
	// Tabbing away closes it. A null relatedTarget is the window losing focus, which keeps it open.
	wrap.addEventListener('focusout', (evt) => {
		if (evt.relatedTarget !== null && !wrap.contains(evt.relatedTarget as Node)) close(false);
	});

	custom.addEventListener('click', () => {
		close(false);
		input.value = cssToHex(getComputedStyle(swatch).backgroundColor) ?? input.value;
		input.click();
	});
	input.addEventListener('input', () => paint(swatch, parseKindColor(input.value)));
	input.addEventListener('change', () => choose(parseKindColor(input.value)));
}

function paint(el: HTMLElement, color: KindColor): void {
	const css = kindColorCss(color);
	if (css) el.style.setProperty(COLOR_VAR, css);
	else el.style.removeProperty(COLOR_VAR);
}

/** `rgb(8, 185, 78)` → `#08b94e`, so the native input opens on the color the swatch shows. */
function cssToHex(css: string): string | null {
	const channels = css.match(/\d+(\.\d+)?/g)?.slice(0, 3);
	if (channels?.length !== 3) return null;
	return '#' + channels.map((c) => Math.round(Number(c)).toString(16).padStart(2, '0')).join('');
}
