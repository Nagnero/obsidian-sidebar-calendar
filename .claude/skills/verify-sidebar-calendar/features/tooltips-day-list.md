# Tooltips and day list

Hovering a bar shows a tooltip with the entry's title and its date range. Clicking a date selects it and lists that day's entries below the calendar, each with a color swatch, its title, and its range when it spans several days. Done tasks (`- [x]`) have faded bars and struck-through list items. Clicking a bar or a list item opens the entry's daily note with the cursor on the entry's line.

## Sub-features

- `f-tooltip` shows `<title>` and the date range (one date for a one-day entry) on hover.
- `f-select` highlights the clicked date and lists every entry on it, including ones hidden behind `+N`.
- `f-empty` shows `No events` for a day without entries.
- `f-done` fades done bars and strikes through done list items, and follows a task box checked in the file on disk.
- `f-open` opens the daily note at the entry's line when a bar or list item is clicked.

## How to get to it (user POV)

- Hover any bar in the calendar.
- Click a date, then read or click the list under the calendar.
- Check a task box in a daily note and look at the calendar.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures; today is selected and has no entries. `D(22).md` has `- [ ] Report` (line 1) and `- [x] Groceries` (line 2).

- **Tooltip, multi-day.** Run `node $V hover ".sidebar-calendar__bar[data-event=\"$(node $V day 5).md:1\"]"`. It prints a tooltip `Summer trip\n<Wkd, Mon D(5)> – <Wkd, Mon D(12)>`, for example `Summer trip\nMon, Oct 5 – Mon, Oct 12`.
- **Tooltip, one day.** Run `node $V hover ".sidebar-calendar__bar[data-event=\"$(node $V day 3).md:3\"]"`. The tooltip is `Dentist\n<Wkd, Mon D(3)>` with no range.
- **Empty day.** Run `node $V snapshot f-day-list/baseline`. `dayList.items` is empty and `dayList.empty` is `No events`.
- **Select a day.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 8)\"]"` and `node $V snapshot f-day-list/day-8`. `selected` is D(8), `dayList.title` names that date, and `items` holds `Summer trip` and `Workshop (hobby)`, each with a `range`.
- **Done, baseline.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 22)\"]"` and `node $V snapshot f-done/before`. Bar `D(22).md:2` has `done: true` and `D(22).md:1` has `done: false`; the list has `Groceries` with `done: true` and `Report` with `done: false`.
- **Done, edited on disk.** Run `sed -i 's/^- \[ \] Report$/- [x] Report/' "<vault>/$(node $V day 22).md"` with the vault path `launch` printed, wait 2 s, and run `node $V snapshot f-done/after-disk-edit`. Both `D(22).md` bars and both list items now have `done: true`. Run `node $V screenshot f-done/after-disk-edit`.
- **Open from the list.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 20)\"]"`, `node $V click '.sidebar-calendar__event-item:has-text("Crowded 4")'` and `node $V snapshot f-open/list-item`. `activeFile` is `D(20).md` and `cursorLine` is `4`.
- **Open from a bar.** Run `node $V click ".sidebar-calendar__bar[data-event=\"$(node $V day 5).md:1\"] >> nth=1"` and `node $V snapshot f-open/bar`. `activeFile` is `D(5).md`, `cursorLine` is `1`, and `selected` is unchanged.
- **Proof.** Run `node $V screenshot f-open/bar`, then `node $V stop`.

## Gotchas

- Tooltips disappear when the pointer leaves, and `snapshot` runs in a new connection. Read tooltip text only from `hover`'s output.
- Dates in tooltips and the list follow Obsidian's app language. The fixtures run in English. Do not compare against a Korean format unless the run switched the language.
- A click on a date also opens that day's daily note when one exists (see [daily-notes.md](./daily-notes.md)). `activeFile` alone therefore does not prove a list-item click; `cursorLine` does.
- `f-done` mutates the vault. Run `stop` before the next recipe so it starts from the baseline.
