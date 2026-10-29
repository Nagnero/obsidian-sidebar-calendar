# Tooltips and day list

Hovering a bar shows a tooltip with the entry's title and its date range. Clicking a date selects it and lists that day's entries below the calendar, each with a color swatch, its title, and its range when it spans several days. Done tasks (`- [x]`) have bars that look like any other and struck-through list items. **Show completed** in the list header's sort and filter menu (on by default) hides them from both the list and the bars when unchecked, and the `+N` counts follow. Clicking a bar or a list item opens the entry's daily note with the cursor on the entry's line.

## Sub-features

- `f-tooltip` shows `<title>` and the date range (one date for a one-day entry) on hover.
- `f-select` highlights the clicked date and lists every entry on it, including ones hidden behind `+N`.
- `f-empty` shows the `Events` and `To do` groups with `None` under each for a day without entries.
- `f-done` draws done bars like open ones, strikes through done list items, and follows a task box checked in the file on disk or in the editor.
- `f-hide-done` unchecks **Show completed** to hide done tasks from the list and the bars (`+N` recounts, open-task rings unchanged), hides a task checked while hidden, and saves the choice as `showDone`.
- `f-open` opens the daily note at the entry's line when a bar or list item is clicked.

## How to get to it (user POV)

- Hover any bar in the calendar.
- Click a date, then read or click the list under the calendar.
- Check a task box in a daily note and look at the calendar.
- Click the sort and filter button at the right of the list header, then **Show completed**.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures; today is selected and has no entries. `D(22).md` has `- [ ] Report` (line 1) and `- [x] Groceries` (line 2) under `# 업무`, and `- Journal line, not an entry` under the disabled `# Journaling`.

- **Tooltip, multi-day.** Run `node $V hover ".sidebar-calendar__bar[data-event=\"$(node $V day 5).md:1\"]"`. It prints a tooltip `Summer trip\n<Wkd, Mon D(5)> – <Wkd, Mon D(12)>`, for example `Summer trip\nMon, Oct 5 – Mon, Oct 12`.
- **Tooltip, one day.** Run `node $V hover ".sidebar-calendar__bar[data-event=\"$(node $V day 3).md:3\"]"`. The tooltip is `Dentist\n<Wkd, Mon D(3)>` with no range.
- **Empty day.** Run `node $V snapshot f-day-list/baseline`. `dayList.items` is empty, `dayList.groups` starts with `["Events", "To do"]` (an `Overdue` group follows when today is after D(10), see [day-list-tasks.md](./day-list-tasks.md)) and `dayList.empty` is `["None", "None"]`.
- **Select a day.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 8)\"]"` and `node $V snapshot f-day-list/day-8`. `selected` is D(8), `dayList.title` names that date, and `items` holds `Summer trip` and `Workshop (hobby)`, each with a `range`.
- **Done, baseline.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 22)\"]"` and `node $V snapshot f-done/before`. Bars `D(22).md:2` (Groceries, done) and `D(22).md:1` (Report, open) have the same `color` and `opacity` `"1"`; the list has `Groceries` with `done: true` and `Report` with `done: false`, and nothing else (the Journaling line is not an entry).
- **Done, edited on disk.** Run `sed -i 's/^- \[ \] Report$/- [x] Report/' "<vault>/$(node $V day 22).md"` with the vault path `launch` printed, wait 2 s, and run `node $V snapshot f-done/after-disk-edit`. Both `D(22).md` bars are unchanged and both list items now have `done: true`. Run `node $V screenshot f-done/after-disk-edit`.
- **Done, checked in the editor (latency).** From a fresh launch, run `node $V task-latency 22 Report`. It selects D(22), which opens `D(22).md` in live preview, clicks the checkbox on the `Report` line, and prints one JSON line: `before` and `after` (`done` of the list item, `ring` on the D(22) cell), and `listMs` and `ringMs`, the ms from the click until each changed. `after.done` is `true`, `after.ring` is `false`, and both numbers are well under 500. Run it again to uncheck: `done` flips back to `false` and `ring` to `true` just as fast. Run it four times or more and report every number, not one.
- **Hide done, menu.** From a fresh launch, click D(22) and run `node $V snapshot f-hide-done/before`; it has 14 bars and `+1` at D(20) and D(27) (`Call mom` on D(27) is behind it). Run `node $V click '[aria-label="Sort and filter"]'`, `node $V snapshot f-hide-done/menu` and `node $V screenshot f-hide-done/menu`. `menu` ends with `{"separator": true}`, then `Show completed` checked.
- **Hide done.** Run `node $V click '.menu .menu-item:has-text("Show completed")'`, `node $V snapshot f-hide-done/hidden` and `node $V screenshot f-hide-done/hidden`. The list has only `Report`, the only D(22) bar is `D(22).md:1`, bars `D(25).md:1` and `D(27).md:1` are gone, `D(27).md:2` (Zoo) now has a lane, `more` is only D(20)'s `+1`, and `taskRings` is unchanged. `node $V eval "return JSON.parse(await app.vault.adapter.read('.obsidian/plugins/sidebar-calendar/data.json')).showDone"` prints `false`.
- **Checked while hidden.** Run `node $V task-latency 22 Report` and `node $V snapshot f-hide-done/report-checked`. `after` is `{"done": null, "ring": false}` (the item is gone), no D(22) bar is left, and `dayList.empty` is `["None", "None"]`.
- **Menu unchecked.** Run `node $V click '[aria-label="Sort and filter"]'` and `node $V snapshot f-hide-done/menu-unchecked`; `Show completed` has `checked: false`. Press `Escape`.
- **Survives a reload.** Run `node $V press Control+p`, `node $V fill '.prompt-input' 'Reload app without saving'`, `node $V press Enter`, wait 5 s, click D(27) and run `node $V snapshot f-hide-done/after-reload`. The list is `Budget`, `Memo`, `Zoo`, with no `Call mom`.
- **Show again.** Open the menu, click `Show completed`, click D(22) and run `node $V snapshot f-hide-done/restored` and `node $V screenshot f-hide-done/restored`. There are 14 bars again, both D(22) bars have `opacity` `"1"`, the list has `Groceries` and `Report` struck through, and `showDone` in `data.json` is `true`. Then `node $V stop`.
- **Open from the list.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 20)\"]"`, `node $V click '.sidebar-calendar__event-item:has-text("Crowded 4")'` and `node $V snapshot f-open/list-item`. `activeFile` is `D(20).md` and `cursorLine` is `4`.
- **Open from a bar.** Run `node $V click ".sidebar-calendar__bar[data-event=\"$(node $V day 5).md:1\"] >> nth=1"` and `node $V snapshot f-open/bar`. `activeFile` is `D(5).md`, `cursorLine` is `1`, and `selected` is unchanged.
- **Proof.** Run `node $V screenshot f-open/bar`, then `node $V stop`.

## Gotchas

- Tooltips disappear when the pointer leaves, and `snapshot` runs in a new connection. Read tooltip text only from `hover`'s output.
- Dates in tooltips and the list follow Obsidian's app language. The fixtures run in English. Do not compare against a Korean format unless the run switched the language.
- A click on a date also opens that day's daily note when one exists (see [daily-notes.md](./daily-notes.md)). `activeFile` alone therefore does not prove a list-item click; `cursorLine` does.
- With **Show completed** off, `task-latency` reports `done: null` once the item disappears; that is the hide, not a missing item.
- `task-latency` measures in the page with a MutationObserver from the click's `pointerdown`, so `connect` overhead is not counted. A number near 2300 means the list waited for Obsidian's editor autosave (about 2 s) plus the plugin's refresh debounce instead of following the editor.
- `f-hide-done` changes `data.json`, and both `f-done` and `f-hide-done` mutate the vault. Run `stop` before the next recipe so it starts from the baseline.
