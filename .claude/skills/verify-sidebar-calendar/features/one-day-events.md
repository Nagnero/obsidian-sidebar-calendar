# One-day events

A note in the events folder whose frontmatter has only `start` (or `end` equal to `start`) shows as a short bar under that day's number, in the first free lane of its week.

## Sub-features

- `c-bar` draws one bar spanning exactly one column on the event's day.
- `c-no-continuation` gives the bar no continued-before or continued-after styling.
- `c-day-list` lists the event under that day without a date range.

## How to get to it (user POV)

- Create a note in `Events/` with `start: YYYY-MM-DD` in its frontmatter, then look at that date in the calendar.
- Click the date to see the event in the list below the calendar.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures; `Events/Dentist.md` has `start: D(3)` and no category.

- **Bar.** Run `node $V snapshot c-one-day/baseline`. `bars` has exactly one entry with `event: "Events/Dentist.md"`, its `column` is `k / k+1` (one column wide), `lane: 0`, and `continuedBefore` and `continuedAfter` are both `false`.
- **Right day.** Run `node $V eval 'const b=document.querySelector(".sidebar-calendar__bar[data-event=\"Events/Dentist.md\"]"); return [...b.parentElement.querySelectorAll(".sidebar-calendar__day")].find(c=>c.style.gridColumn===b.style.gridColumn.split(" / ")[0]).dataset.date'`. It prints `D(3)`.
- **Day list.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 3)\"]"` and `node $V snapshot c-one-day/selected`. `selected` is `D(3)`, and `dayList.items` is `[{ "title": "Dentist", "range": null }]`. The title falls back to the file name because the note has no `title`.
- **Proof.** Run `node $V screenshot c-one-day/selected`. The bar sits under the 3rd and the list below reads `Dentist`.

## Gotchas

- Bars are positioned by CSS grid, so check `column` and the cell's `data-date`, not pixel positions.
- The bar is drawn without a category, so its color is the theme accent. Color behavior is covered in [category-colors.md](./category-colors.md).
