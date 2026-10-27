# Day selection and day list

Clicking a day highlights it and shows that day's events in a list under the calendar. The list has the long date as a title and one row per event with its category color, title and, for multi-day events, the date range.

## Sub-features

- `select-highlight` marks the clicked day cell.
- `select-list` lists every event that covers the selected day, ordered by start day, then longer events first.
- `select-range` shows the date range for multi-day events only.
- `select-empty` shows `No events` for a day without events.

## How to get to it (user POV)

- Click a day cell in the calendar grid.
- The initial selection is today.

## Driving it with preview harness

Preconditions:

- `npm ci` has run and the Doctor check passes.
- The clock is `2026-10-15`.

- **Several events.** Run `npm run preview -- day-selected-dark`. It clicks `[data-date="2026-10-20"]`. `preview-out/day-selected-dark.png` shows `Tuesday, October 20` and five rows in order: Design workshop, Conference, Sprint review, Hackathon, Team lunch. Team lunch has no range line, the others do.
- **Highlight.** The 20 October cell has a lighter panel behind it, and 15 keeps the accent circle for today.
- **Default selection.** `preview-out/month-dark.png` shows `Thursday, October 15` with the single row Dentist.
- **Empty day.** Add a scenario with `actions: [{ selectDay: '2026-10-13' }]`. The list reads `No events`.
- **Proof.** Name the title and each row text you read.

## Gotchas

- Selecting a day that has a daily note also calls `openFile` for it. The runner prints `(openFile: 2026-10-20.md)`. That is expected.
- The `+N` labels and the list can disagree on purpose: the list shows all events, bars show only what fits.
- The list is below the grid, so very tall lists extend the screenshot. The sidebar element is not height limited here, while Obsidian scrolls it.
