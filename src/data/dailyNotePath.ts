/** Vault path for a daily note named `fileName` in `folder` ("" or "/" means the vault root). */
export function dailyNotePath(folder: string, fileName: string): string {
	const dir = folder.trim().replace(/^\/+|\/+$/g, '');
	return dir ? `${dir}/${fileName}.md` : `${fileName}.md`;
}

/**
 * The name a daily note at `path` was created from (the path inside `folder`, without `.md`), or
 * null when the file is not a markdown file in that folder. Inverse of `dailyNotePath`.
 */
export function dailyNoteName(folder: string, path: string): string | null {
	if (!path.endsWith('.md')) return null;
	const dir = folder.trim().replace(/^\/+|\/+$/g, '');
	if (dir && !path.startsWith(`${dir}/`)) return null;
	return path.slice(dir ? dir.length + 1 : 0, -'.md'.length);
}

/**
 * Fills the variables the core Daily notes plugin supports in templates:
 * `{{title}}`, `{{date}}`, `{{time}}`, `{{date:FORMAT}}` and `{{time:FORMAT}}`.
 * `formatDate` formats the note's date, `formatTime` the current time, each with an optional
 * moment-style format.
 */
export function fillDailyTemplate(
	content: string,
	title: string,
	formatDate: (format?: string) => string,
	formatTime: (format?: string) => string,
): string {
	return content
		.replace(/{{\s*title\s*}}/gi, title)
		.replace(/{{\s*(date|time)\s*(?::\s*([^}]*?))?\s*}}/gi, (_match, kind: string, format?: string) => {
			const fmt = format?.trim() || undefined;
			return kind.toLowerCase() === 'date' ? formatDate(fmt) : formatTime(fmt);
		});
}
