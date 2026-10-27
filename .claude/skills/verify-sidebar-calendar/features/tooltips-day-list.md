# Tooltips and day list

Hovering a bar shows a tooltip with the event's title and its date range. Clicking a date selects it and lists that day's events below the calendar, each with a color swatch, its title, and its range when it spans several days. Clicking a bar or a list item opens the event's note.

## Sub-features

- `f-tooltip` shows `<title>` and the date range (one date for a one-day event) on hover.
- `f-select` highlights the clicked date and lists every event on it, including ones hidden behind `+N`.
- `f-empty` shows `No events` for a day without events.
- `f-open` opens the event note when a bar or list item is clicked.

## How to get to it (user POV)

- Hover any bar in the calendar.
- Click a date, then read or click the list under the calendar.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures; today is selected and has no events.

- **Tooltip, multi-day.** Run `node $V hover '.sidebar-calendar__bar[data-event="Events/Trip.md"]'`. It prints a tooltip `Summer trip\n<Wkd, Mon D(5)> – <Wkd, Mon D(12)>`, for example `Summer trip\nMon, Oct 5 – Mon, Oct 12`.
- **Tooltip, one day.** Run `node $V hover '.sidebar-calendar__bar[data-event="Events/Dentist.md"]'`. The tooltip is `Dentist\n<Wkd, Mon D(3)>` with no range.
- **Empty day.** Run `node $V snapshot f-day-list/baseline`. `dayList.items` is empty and `dayList.empty` is `No events`.
- **Select a day.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 8)\"]"` and `node $V snapshot f-day-list/day-8`. `selected` is D(8), `dayList.title` names that date, and `items` holds `Summer trip` and `Uncategorized`, each with a `range`.
- **Open from the list.** Run `node $V click '.sidebar-calendar__event-item:has-text("Summer trip")'` and `node $V snapshot f-day-list/opened`. `activeFile` is `Events/Trip.md`.
- **Proof.** Run `node $V screenshot f-day-list/opened`. The calendar shows the 8th selected and the editor shows the Trip note.

## Gotchas

- Tooltips disappear when the pointer leaves, and `snapshot` runs in a new connection. Read tooltip text only from `hover`'s output.
- Dates in tooltips and the list follow Obsidian's app language. The fixtures run in English. Do not compare against a Korean format unless the run switched the language.
- A click on a date also opens that day's daily note when one exists (see [daily-notes.md](./daily-notes.md)). D(8) has none, so the editor stays as it was.
