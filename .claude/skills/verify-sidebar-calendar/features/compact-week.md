# One-week view in a short pane

When the pane is too short for the whole month plus 200 px of day list, the calendar shows one week row and the day list scrolls on its own below it. A wheel or trackpad gesture over the calendar moves one week per gesture (events less than 300 ms apart count as one gesture), crossing into the next or previous month and updating the header. The first week shown is the selected day's; Today goes to today's week and the month arrows to the month's first week. A tall enough pane shows the month's own rows (5 for October 2026). There a wheel gesture over the calendar slides the rows a week down or up, also while dragging an entry: the next month's weeks come in dimmed under the current month's, and the header keeps naming the month of the top row (the month of its last day), so October stays in the header until the November 1 row reaches the top. The arrows and Today show a month's own rows again; leaving the one-week view shows the whole month of the row it was on. The month header sticks to the top of the pane when the list scrolls.

## Sub-features

- `o-switch` turns the one-week view on and off as the window height changes.
- `o-wheel` moves one week per gesture and crosses month boundaries.

## How to get to it (user POV)

- Make the Obsidian window short, then scroll over the calendar.

## Driving it with verify.cjs

Preconditions: baseline fixtures, `node $V sidebar 300`.

- **Switch.** Run `node $V eval "require('@electron/remote').getCurrentWindow().setSize(1024, 560); await new Promise((r) => setTimeout(r, 500)); return 1"` and `node $V snapshot o/short`. `compact` is `true`; the `.sidebar-calendar__weeks` element is one week tall (104 px with title bars) and its `scrollTop` shows today's week. Run `node $V screenshot o/short`.
- **Wheel.** Dispatch `new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })` on `.sidebar-calendar__weeks` through `eval`, waiting 400 ms between events. Each moves the shown row by 7 days; from the month's last row the header changes to the next month. Ten events 30 ms apart move one week.
- **Week by week.** In the tall window, dispatch `deltaY: 100` wheel events 400 ms apart on `.sidebar-calendar__weeks`. The first days of the rows go `09-27 … 10-25`, then `10-04 … 11-01`, `10-11 … 11-08`, `10-18 … 11-15`, `10-25 … 11-22` with the title `Oct2026` throughout, and then `11-01 … 11-29` with `Nov2026`. `Previous month` from there shows `09-27 … 10-25` again.
- **Back.** `setSize(1024, 1000)` turns `compact` back to `false`. Then `node $V stop`.

## Gotchas

- `launch` sets the window to 1024 × 1000 so other recipes see the whole month; the default 800 px height is already short enough for the one-week view.
- `click` on a day in a hidden row makes Playwright scroll the week container; drive only visible rows.
