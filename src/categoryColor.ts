export interface Category {
	name: string;
	/** CSS color, e.g. `#e5484d`. */
	color: string;
}

/** Category names match ignoring case and surrounding spaces. */
export function categoryKey(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * Color for an event's category: the first category whose name matches (ignoring case and
 * surrounding spaces), otherwise `defaultColor`. Returns null when that is empty too, meaning
 * "use the theme's accent color".
 */
export function resolveCategoryColor(
	category: string | undefined,
	categories: readonly Category[],
	defaultColor: string,
): string | null {
	const wanted = category === undefined ? '' : categoryKey(category);
	if (wanted) {
		const match = categories.find((c) => categoryKey(c.name) === wanted && c.color);
		if (match) return match.color;
	}
	return defaultColor || null;
}
