/** Obsidian's named colors, drawn with `var(--color-<name>)` so they follow the light or dark theme. */
export const NAMED_COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'] as const;
export type NamedColor = (typeof NAMED_COLORS)[number];

/** A custom color picked with the native color input, always lowercase `#rrggbb`. */
export type HexColor = `#${string}`;

/** A kind's color: `''` is the theme accent, then a named color, or a custom hex. */
export type KindColor = '' | NamedColor | HexColor;

/** The choices offered as dots in the settings popover, theme accent first. */
export const PALETTE: readonly ('' | NamedColor)[] = ['', ...NAMED_COLORS];

const HEX = /^#[0-9a-f]{6}$/i;

/** Parses a stored color. Anything that is not a known choice becomes the theme accent. */
export function parseKindColor(value: unknown): KindColor {
	if (typeof value !== 'string') return '';
	if (HEX.test(value)) return value.toLowerCase() as HexColor;
	return NAMED_COLORS.find((c) => c === value) ?? '';
}

/** The CSS color to draw a kind with; null means the theme accent (the stylesheet's fallback). */
export function kindColorCss(color: KindColor): string | null {
	if (color === '') return null;
	if (color.startsWith('#')) return color;
	return `var(--color-${color})`;
}
